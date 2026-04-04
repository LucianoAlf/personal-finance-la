/**
 * MIGRATION: Cron Jobs para Resumos e Dicas
 * Configura 4 novos Cron Jobs via pg_cron
 * Data: 12/11/2024
 */

-- Habilitar extensão pg_cron (se ainda não estiver)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Extensão http já está instalada, não precisa criar novamente
-- CREATE EXTENSION IF NOT EXISTS http;

-- ============================================
-- REMOVER CRON JOBS ANTIGOS (se existirem)
-- ============================================
SELECT cron.unschedule('send-daily-summary') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-daily-summary'
);

SELECT cron.unschedule('send-weekly-summary') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-weekly-summary'
);

SELECT cron.unschedule('send-monthly-summary') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-monthly-summary'
);

SELECT cron.unschedule('send-ana-tips') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-ana-tips'
);

-- ============================================
-- CRON JOB 1: Resumo Diário (20:00 todo dia)
-- ============================================
SELECT cron.schedule(
  'send-daily-summary',
  '0 20 * * *',
  $$
  SELECT 
    net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-daily-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- CRON JOB 2: Resumo Semanal (18:00 todo dia, verifica internamente)
-- ============================================
SELECT cron.schedule(
  'send-weekly-summary',
  '0 18 * * *',
  $$
  SELECT 
    net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-weekly-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- CRON JOB 3: Resumo Mensal (10:00 todo dia, verifica internamente)
-- ============================================
SELECT cron.schedule(
  'send-monthly-summary',
  '0 10 * * *',
  $$
  SELECT 
    net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-monthly-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- CRON JOB 4: Dicas Ana Clara (10:00 todo dia, verifica internamente)
-- ============================================
SELECT cron.schedule(
  'send-ana-tips',
  '0 10 * * *',
  $$
  SELECT 
    net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/send-ana-tips',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ============================================
-- CONFIGURAR VARIÁVEIS (executar manualmente no Dashboard)
-- ============================================
-- ALTER DATABASE postgres SET app.supabase_url = 'https://sbnpmhmvcspwcyjhftlw.supabase.co';
-- ALTER DATABASE postgres SET app.supabase_service_role_key = '<SERVICE_ROLE_KEY>';

-- ============================================
-- LISTAR CRON JOBS ATIVOS
-- ============================================
-- SELECT * FROM cron.job ORDER BY jobid DESC;

-- ============================================
-- REMOVER CRON JOB (se necessário)
-- ============================================
-- SELECT cron.unschedule('send-daily-summary');
-- SELECT cron.unschedule('send-weekly-summary');
-- SELECT cron.unschedule('send-monthly-summary');
-- SELECT cron.unschedule('send-ana-tips');
