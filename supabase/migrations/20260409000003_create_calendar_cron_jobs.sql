-- Migration: Create cron jobs for Calendar V1 workers
-- 1. calendar-dispatch-reminders: every 5 minutes
-- 2. calendar-sync-ticktick: every 10 minutes
--
-- Both use service_role_key from app.settings for authorization.
-- Functions already have verify_jwt = false in config.toml.

CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Reminder dispatch: every 5 minutes
SELECT cron.schedule(
  'calendar-dispatch-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-dispatch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
-- TickTick sync: every 10 minutes
SELECT cron.schedule(
  'calendar-sync-ticktick',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-sync-ticktick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);
-- Verify cron jobs created
SELECT jobname, schedule FROM cron.job
WHERE jobname IN ('calendar-dispatch-reminders', 'calendar-sync-ticktick');
