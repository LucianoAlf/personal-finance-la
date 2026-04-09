-- =====================================================
-- FIX: Cron Jobs com Authorization correto
-- =====================================================

-- IMPORTANTE: Configurar SUPABASE_SERVICE_ROLE_KEY nos Secrets do Supabase
-- Dashboard > Project Settings > Edge Functions > Secrets

-- ============= CRON 1: Pregão B3 (5 minutos) =============
SELECT cron.schedule(
  'sync-prices-market-hours',
  '*/5 10-17 * * 1-5',
  $$
  SELECT
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/sync-investment-prices',
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) AS request_id;
  $$
);

-- ============= CRON 2: Fora do pregão (1 hora) =============
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
          headers := '{"Content-Type": "application/json"}'::jsonb
        )
    END AS request_id;
  $$
);

-- ============= CRON 3: Crypto (2 minutos - 24/7) =============
SELECT cron.schedule(
  'sync-crypto-prices',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/sync-investment-prices',
      headers := '{"Content-Type": "application/json"}'::jsonb
    ) AS request_id;
  $$
);

-- ============= COMENTÁRIOS =============
COMMENT ON EXTENSION pg_cron IS 'Cron Jobs para sincronização automática de preços';
;
