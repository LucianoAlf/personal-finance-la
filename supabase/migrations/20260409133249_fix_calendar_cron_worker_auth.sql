-- Fix calendar worker cron auth.
-- The original jobs referenced app.settings.service_role_key, which is not configured
-- in this project and causes pg_cron to fail before reaching the Edge Functions.
-- These workers already run with verify_jwt = false and perform their own header checks,
-- so a static Bearer token is enough to trigger the internal handler.

SELECT cron.unschedule('calendar-dispatch-reminders')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'calendar-dispatch-reminders'
);

SELECT cron.unschedule('calendar-sync-ticktick')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'calendar-sync-ticktick'
);

SELECT cron.schedule(
  'calendar-dispatch-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-dispatch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer cron'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'calendar-sync-ticktick',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-sync-ticktick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer cron'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);;
