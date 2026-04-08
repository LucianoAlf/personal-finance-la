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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const BATCH_LIMIT = 50;

interface PendingReminder {
  id: string;
  event_id: string;
  reminder_id: string;
  occurrence_key: string;
  fire_at: string;
  channel: string;
  idempotency_key: string;
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

    const { data: pendingReminders, error: fetchError } = await supabase
      .from('calendar_reminder_schedule')
      .select('id, event_id, reminder_id, occurrence_key, fire_at, channel, idempotency_key')
      .eq('delivery_status', 'pending')
      .lte('fire_at', new Date().toISOString())
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
          .select('id, user_id, title, start_at, status, deleted_at')
          .eq('id', reminder.event_id)
          .single();

        if (!event || event.deleted_at || event.status === 'cancelled') {
          await supabase
            .from('calendar_reminder_schedule')
            .update({ delivery_status: 'skipped' })
            .eq('id', reminder.id);
          skipped++;
          continue;
        }

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('dnd_start, dnd_end, dnd_enabled')
          .eq('user_id', event.user_id)
          .single();

        if (prefs?.dnd_enabled) {
          const now = new Date();
          const brasiliaHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours();
          const dndStart = parseInt(prefs.dnd_start?.split(':')[0] || '22');
          const dndEnd = parseInt(prefs.dnd_end?.split(':')[0] || '7');

          const inDnd = dndStart > dndEnd
            ? (brasiliaHour >= dndStart || brasiliaHour < dndEnd)
            : (brasiliaHour >= dndStart && brasiliaHour < dndEnd);

          if (inDnd) {
            skipped++;
            continue;
          }
        }

        if (reminder.channel === 'whatsapp') {
          const { data: connection } = await supabase
            .from('whatsapp_connections')
            .select('phone_number, status')
            .eq('user_id', event.user_id)
            .eq('status', 'connected')
            .single();

          if (!connection?.phone_number) {
            await supabase
              .from('calendar_reminder_schedule')
              .update({ delivery_status: 'skipped' })
              .eq('id', reminder.id);
            skipped++;
            continue;
          }

          const dateFormatted = new Date(event.start_at).toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
          });

          const message = `🔔 *Lembrete:* ${event.title}\n📅 ${dateFormatted}`;

          await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              phone: connection.phone_number,
              message,
              userId: event.user_id,
            },
          });

          await supabase
            .from('calendar_reminder_schedule')
            .update({
              delivery_status: 'sent',
              delivered_at: new Date().toISOString(),
            })
            .eq('id', reminder.id);

          dispatched++;
        }
      } catch (itemError) {
        console.error(`[calendar-dispatch-reminders] Item ${reminder.id} error:`, itemError);
        await supabase
          .from('calendar_reminder_schedule')
          .update({ delivery_status: 'failed' })
          .eq('id', reminder.id);
        failed++;
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
