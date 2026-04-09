-- =====================================================
-- CRON JOBS: Sincronização automática de preços
-- =====================================================

-- Habilitar extensão pg_cron se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============= CRON 1: Pregão B3 (5 minutos) =============
-- Executa a cada 5 minutos durante horário de pregão (10h-17h, seg-sex)
SELECT cron.schedule(
  'sync-prices-market-hours',
  '*/5 10-17 * * 1-5',
  $$
  SELECT
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/sync-investment-prices',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings')::json->>'service_role_key'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============= CRON 2: Fora do pregão (1 hora) =============
-- Executa a cada 1 hora fora do horário de pregão
SELECT cron.schedule(
  'sync-prices-off-hours',
  '0 * * * *',
  $$
  SELECT
    CASE
      WHEN EXTRACT(HOUR FROM NOW()) NOT BETWEEN 10 AND 17
        OR EXTRACT(DOW FROM NOW()) IN (0, 6)
      THEN
        net.http_post(
          url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/sync-investment-prices',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings')::json->>'service_role_key'
          ),
          body := '{}'::jsonb
        )
    END AS request_id;
  $$
);

-- ============= CRON 3: Crypto (2 minutos - 24/7) =============
-- Executa a cada 2 minutos para criptomoedas
SELECT cron.schedule(
  'sync-crypto-prices',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/sync-investment-prices',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings')::json->>'service_role_key'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- ============= VERIFICAR CRON JOBS =============
-- SELECT * FROM cron.job WHERE jobname LIKE 'sync-%';

-- ============= REMOVER CRON JOBS (se necessário) =============
-- SELECT cron.unschedule('sync-prices-market-hours');
-- SELECT cron.unschedule('sync-prices-off-hours');
-- SELECT cron.unschedule('sync-crypto-prices');

-- ============= COMENTÁRIOS =============
COMMENT ON EXTENSION pg_cron IS 'Extensão para agendamento de tarefas periódicas';
;
