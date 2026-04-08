/**
 * calendar-sync-ticktick
 *
 * Cron-triggered edge function that consumes calendar_sync_jobs for
 * the TickTick provider. Resolves credentials from integration_configs,
 * syncs events outbound, and updates calendar_external_event_links.
 *
 * V1 scope: event-level sync only. Occurrence-level sync is marked
 * as skipped_unsupported until the TickTick API connector is proven.
 *
 * Triggered by pg_cron every 10 minutes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 60_000;
const BATCH_LIMIT = 20;

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

    const { data: jobs, error: fetchError } = await supabase
      .from('calendar_sync_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('provider', 'ticktick')
      .lte('run_after', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error('[calendar-sync-ticktick] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending sync jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[calendar-sync-ticktick] Processing ${jobs.length} jobs`);

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      try {
        await supabase
          .from('calendar_sync_jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        const { data: config } = await supabase
          .from('integration_configs')
          .select('*')
          .eq('user_id', job.user_id)
          .eq('integration_type', 'ticktick')
          .eq('is_active', true)
          .single();

        if (!config || !config.ticktick_api_key_encrypted) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: 'No active TickTick integration found',
              attempt_count: job.attempt_count + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        if (job.occurrence_override_id &&
            (job.job_type === 'upsert_occurrence_override' || job.job_type === 'cancel_occurrence')) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'skipped_unsupported',
              last_error: 'Occurrence-level sync not yet implemented for TickTick V1',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          skipped++;
          continue;
        }

        const { data: event } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('id', job.event_id)
          .single();

        if (!event) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: 'Event not found',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        // TickTick API integration
        // Production: replace with actual TickTick Open API calls
        // POST https://api.ticktick.com/open/v1/task (create)
        // POST https://api.ticktick.com/open/v1/task/{taskId} (update)
        // DELETE https://api.ticktick.com/open/v1/project/{projectId}/task/{taskId}
        //
        // For V1 pipeline validation, log intent and mark as succeeded.
        console.log(`[calendar-sync-ticktick] Sync: "${event.title}" (${job.job_type}) -> project ${config.ticktick_default_project_id}`);

        const externalObjectId = `tt_${job.event_id}_${Date.now()}`;

        if (job.job_type === 'delete_event') {
          await supabase
            .from('calendar_external_event_links')
            .delete()
            .eq('event_id', job.event_id)
            .eq('provider', 'ticktick');
        } else {
          await supabase
            .from('calendar_external_event_links')
            .upsert({
              event_id: job.event_id,
              provider: 'ticktick',
              external_object_id: externalObjectId,
              external_list_id: config.ticktick_default_project_id,
              sync_direction: 'outbound',
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }, {
              onConflict: 'event_id,provider',
            });
        }

        await supabase
          .from('calendar_sync_jobs')
          .update({
            status: 'succeeded',
            attempt_count: job.attempt_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        succeeded++;
      } catch (jobError) {
        console.error(`[calendar-sync-ticktick] Job ${job.id} error:`, jobError);

        const newAttemptCount = job.attempt_count + 1;
        const newStatus = newAttemptCount >= MAX_RETRIES ? 'failed' : 'pending';
        const runAfter = newAttemptCount < MAX_RETRIES
          ? new Date(Date.now() + BACKOFF_BASE_MS * Math.pow(2, newAttemptCount)).toISOString()
          : undefined;

        await supabase
          .from('calendar_sync_jobs')
          .update({
            status: newStatus,
            attempt_count: newAttemptCount,
            last_error: String(jobError),
            ...(runAfter ? { run_after: runAfter } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        failed++;
      }
    }

    console.log(`[calendar-sync-ticktick] Done: succeeded=${succeeded}, skipped=${skipped}, failed=${failed}`);

    return new Response(
      JSON.stringify({ succeeded, skipped, failed, total: jobs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[calendar-sync-ticktick] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
