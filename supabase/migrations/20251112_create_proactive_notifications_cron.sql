-- Migration: Criar Cron Job para Notificações Proativas
-- Executado diariamente às 9h (horário de Brasília = 12h UTC)

-- Habilitar extensão pg_cron se não estiver ativa
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar Cron Job
SELECT cron.schedule(
  'send-proactive-notifications-daily',
  '0 12 * * *', -- Todos os dias às 12h UTC (9h Brasília)
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

-- Verificar se o cron foi criado
SELECT * FROM cron.job WHERE jobname = 'send-proactive-notifications-daily';

COMMENT ON EXTENSION pg_cron IS 'Cron job scheduler for PostgreSQL';
