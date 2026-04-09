/**
 * calendar-dispatch-reminders
 *
 * Cron-triggered edge function that queries calendar_reminder_schedule
 * for pending reminders whose fire_at <= now(), applies DND preferences,
 * and delivers via WhatsApp (or future channels).
 *
 * Triggered by pg_cron every 5 minutes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  computeReminderFailureUpdate,
  evaluateReminderDispatch,
} from '../_shared/calendar-reminder-delivery.ts';
import { resolveCalendarReminderDisplayStart } from '../_shared/calendar-occurrence-display.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const BATCH_LIMIT = 50;
const MAX_RETRIES = 3;

interface PendingReminder {
  id: string;
  event_id: string;
  reminder_id: string;
  occurrence_key: string;
  fire_at: string;
  channel: 'whatsapp' | 'email' | 'push';
  idempotency_key: string;
  attempt_count?: number | null;
  last_error?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const hasJwtAuth = !!authHeader && /^Bearer\s+.+/.test(authHeader);

    if (expectedSecret && !hasJwtAuth && cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expectedSecret && !hasJwtAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    const { data: pendingReminders, error: fetchError } = await supabase
      .from('calendar_reminder_schedule')
      .select('id, event_id, reminder_id, occurrence_key, fire_at, channel, idempotency_key, attempt_count, last_error')
      .eq('delivery_status', 'pending')
      .lte('fire_at', now.toISOString())
      .order('fire_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error('[calendar-dispatch-reminders] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[calendar-dispatch-reminders] Processing ${pendingReminders.length} reminders`);

    let dispatched = 0;
    let failed = 0;
    let skipped = 0;

    for (const reminder of pendingReminders as PendingReminder[]) {
      try {
        const { data: event } = await supabase
          .from('calendar_events')
          .select('id, user_id, title, start_at, timezone, status, deleted_at')
          .eq('id', reminder.event_id)
          .single();

        if (!event) {
          await supabase
            .from('calendar_reminder_schedule')
            .update({ delivery_status: 'failed', last_error: 'event_not_found' })
            .eq('id', reminder.id);
          failed++;
          continue;
        }

        const { data: occOverride } = await supabase
          .from('calendar_event_occurrence_overrides')
          .select('is_cancelled, override_start_at')
          .eq('event_id', reminder.event_id)
          .eq('occurrence_key', reminder.occurrence_key)
          .maybeSingle();

        const resolved = resolveCalendarReminderDisplayStart({
          occurrenceKey: reminder.occurrence_key,
          eventId: reminder.event_id,
          eventStartAt: event.start_at,
          override: occOverride,
        });

        if (resolved.shouldSkip) {
          await supabase
            .from('calendar_reminder_schedule')
            .update({
              delivery_status: 'skipped',
              last_error: 'occurrence_cancelled',
            })
            .eq('id', reminder.id)
            .eq('delivery_status', 'pending');
          skipped++;
          continue;
        }

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('whatsapp_enabled, do_not_disturb_enabled, do_not_disturb_start_time, do_not_disturb_end_time, do_not_disturb_days_of_week')
          .eq('user_id', event.user_id)
          .maybeSingle();

        const decision = evaluateReminderDispatch({
          event: { status: event.status, deleted_at: event.deleted_at },
          preferences: prefs,
          channel: reminder.channel,
          now,
          timezone: event.timezone || 'America/Sao_Paulo',
        });

        if (decision.action === 'skip') {
          await supabase
            .from('calendar_reminder_schedule')
            .update({
              delivery_status: 'skipped',
              last_error: decision.reason,
            })
            .eq('id', reminder.id)
            .eq('delivery_status', 'pending');
          skipped++;
          continue;
        }

        if (reminder.channel !== 'whatsapp') {
          await supabase
            .from('calendar_reminder_schedule')
            .update({
              delivery_status: 'skipped',
              last_error: `channel_unsupported:${reminder.channel}`,
            })
            .eq('id', reminder.id)
            .eq('delivery_status', 'pending');
          skipped++;
          continue;
        }

        const { data: user } = await supabase
          .from('users')
          .select('phone')
          .eq('id', event.user_id)
          .maybeSingle();

        if (!user?.phone) {
          await supabase
            .from('calendar_reminder_schedule')
            .update({
              delivery_status: 'skipped',
              last_error: 'user_phone_missing',
            })
            .eq('id', reminder.id)
            .eq('delivery_status', 'pending');
          skipped++;
          continue;
        }

        const dateFormatted = resolved.displayAt.toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: event.timezone || 'America/Sao_Paulo',
        });

        const message = `🔔 *Lembrete:* ${event.title}\n📅 ${dateFormatted}`;

        const { data: sendData, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            user_id: event.user_id,
            phone_number: user.phone,
            message_type: 'text',
            content: message,
          },
        });

        if (sendError || !sendData?.success) {
          throw new Error(sendError?.message || sendData?.error || 'send_whatsapp_message_failed');
        }

        await supabase
          .from('calendar_reminder_schedule')
          .update({
            delivery_status: 'sent',
            delivered_at: new Date().toISOString(),
            provider_message_id: sendData.message_id ?? null,
            last_error: null,
          })
          .eq('id', reminder.id)
          .eq('delivery_status', 'pending');

        dispatched++;
      } catch (itemError) {
        console.error(`[calendar-dispatch-reminders] Item ${reminder.id} error:`, itemError);
        const failure = computeReminderFailureUpdate({
          now,
          attemptCount: reminder.attempt_count ?? 0,
          errorMessage: itemError instanceof Error ? itemError.message : String(itemError),
          maxRetries: MAX_RETRIES,
        });
        await supabase
          .from('calendar_reminder_schedule')
          .update(failure)
          .eq('id', reminder.id);
        if (failure.delivery_status === 'failed') failed++;
      }
    }

    console.log(`[calendar-dispatch-reminders] Done: dispatched=${dispatched}, skipped=${skipped}, failed=${failed}`);

    return new Response(
      JSON.stringify({ dispatched, skipped, failed, total: pendingReminders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[calendar-dispatch-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
