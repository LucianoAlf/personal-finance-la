-- Migration: Criar Cron Job para Notificações Proativas
-- Executado diariamente às 9h (horário de Brasília = 12h UTC)

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'send-proactive-notifications-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/send-proactive-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);

SELECT * FROM cron.job WHERE jobname = 'send-proactive-notifications-daily';

COMMENT ON EXTENSION pg_cron IS 'Cron job scheduler for PostgreSQL';
