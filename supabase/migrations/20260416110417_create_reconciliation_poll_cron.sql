-- Schedule the Pluggy reconciliation poller with explicit cron auth and
-- overlap protection. Manual user-triggered sync remains available via JWT.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.reconciliation_job_locks (
  job_name text PRIMARY KEY,
  owner_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.reconciliation_job_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reconciliation_job_locks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.acquire_reconciliation_job_lock(
  p_job_name text,
  p_owner_id text,
  p_ttl_seconds integer DEFAULT 1200
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  DELETE FROM public.reconciliation_job_locks
  WHERE job_name = p_job_name
    AND expires_at <= timezone('utc', now());

  INSERT INTO public.reconciliation_job_locks (
    job_name,
    owner_id,
    acquired_at,
    expires_at,
    updated_at
  )
  VALUES (
    p_job_name,
    p_owner_id,
    timezone('utc', now()),
    timezone('utc', now()) + make_interval(secs => GREATEST(p_ttl_seconds, 60)),
    timezone('utc', now())
  )
  ON CONFLICT (job_name) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_reconciliation_job_lock(
  p_job_name text,
  p_owner_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.reconciliation_job_locks
  WHERE job_name = p_job_name
    AND owner_id = p_owner_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_reconciliation_job_lock(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_reconciliation_job_lock(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_reconciliation_job_lock(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reconciliation_job_lock(text, text) TO service_role;

SELECT cron.unschedule('poll-pluggy-reconciliation-every-6h')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'poll-pluggy-reconciliation-every-6h'
);

SELECT cron.schedule(
  'poll-pluggy-reconciliation-every-6h',
  '15 */6 * * *',
  $$
  -- Project URL: this Supabase project does not store supabase_url in Vault; keep in sync with project_id.
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/poll-pluggy-reconciliation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('trigger', 'cron')
  ) AS request_id;
  $$
);

SELECT jobname, schedule
FROM cron.job
WHERE jobname = 'poll-pluggy-reconciliation-every-6h';
