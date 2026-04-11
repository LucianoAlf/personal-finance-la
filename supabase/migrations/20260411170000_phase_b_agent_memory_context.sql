-- Phase B: Ana Clara unified agent memory context
-- Adds episodic memory storage, unified context retrieval RPC,
-- episode persistence RPC, cleanup RPC, and weekly pg_cron cleanup.

CREATE TABLE IF NOT EXISTS public.agent_memory_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  importance NUMERIC(3, 2) NOT NULL DEFAULT 0.20
    CHECK (importance >= 0::numeric AND importance <= 1::numeric),
  source TEXT NOT NULL DEFAULT 'system',
  outcome TEXT,
  entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_window_hours INTEGER NOT NULL DEFAULT 48,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_episodes_user_created
  ON public.agent_memory_episodes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_episodes_user_importance
  ON public.agent_memory_episodes(user_id, importance DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_episodes_expires
  ON public.agent_memory_episodes(expires_at);

ALTER TABLE public.agent_memory_episodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_memory_episodes'
      AND policyname = 'Users read own agent episodes'
  ) THEN
    CREATE POLICY "Users read own agent episodes"
      ON public.agent_memory_episodes
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_memory_episodes'
      AND policyname = 'Service role full access agent episodes'
  ) THEN
    CREATE POLICY "Service role full access agent episodes"
      ON public.agent_memory_episodes
      FOR ALL
      USING ((SELECT current_setting('role', true)) = 'service_role');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_memory_episode(
  p_user_id UUID,
  p_summary TEXT,
  p_importance NUMERIC DEFAULT 0.20,
  p_source TEXT DEFAULT 'system',
  p_outcome TEXT DEFAULT NULL,
  p_entities JSONB DEFAULT '{}'::jsonb,
  p_context_window_hours INTEGER DEFAULT 48,
  p_expires_in_hours INTEGER DEFAULT 168
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_importance NUMERIC(3, 2);
  v_context_window_hours INTEGER;
  v_expires_in_hours INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_summary IS NULL OR btrim(p_summary) = '' THEN
    RAISE EXCEPTION 'p_summary is required';
  END IF;

  v_importance := LEAST(1.0, GREATEST(0.0, COALESCE(p_importance, 0.20)));
  v_context_window_hours := GREATEST(1, COALESCE(p_context_window_hours, 48));
  v_expires_in_hours := GREATEST(1, COALESCE(p_expires_in_hours, 168));

  INSERT INTO public.agent_memory_episodes (
    user_id,
    summary,
    importance,
    source,
    outcome,
    entities,
    context_window_hours,
    expires_at
  ) VALUES (
    p_user_id,
    btrim(p_summary),
    v_importance,
    COALESCE(NULLIF(btrim(p_source), ''), 'system'),
    NULLIF(btrim(COALESCE(p_outcome, '')), ''),
    COALESCE(p_entities, '{}'::jsonb),
    v_context_window_hours,
    now() + make_interval(hours => v_expires_in_hours)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_agent_memory_context(
  p_user_id UUID,
  p_max_facts INTEGER DEFAULT 5,
  p_max_episodes INTEGER DEFAULT 5
) RETURNS TABLE (
  user_facts JSONB,
  recent_episodes JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH fact_rows AS (
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.confidence,
      m.reinforcement_count,
      m.metadata,
      m.tags,
      m.last_reinforced_at,
      m.updated_at
    FROM public.agent_memory_entries AS m
    WHERE m.user_id = p_user_id
      AND (m.expires_at IS NULL OR m.expires_at > now())
    ORDER BY m.confidence DESC, m.last_reinforced_at DESC, m.updated_at DESC
    LIMIT GREATEST(COALESCE(p_max_facts, 5), 1)
  ),
  episode_rows AS (
    SELECT
      e.id,
      e.summary,
      e.outcome,
      e.importance,
      e.source,
      e.entities,
      e.created_at
    FROM public.agent_memory_episodes AS e
    WHERE e.user_id = p_user_id
      AND e.expires_at > now()
    ORDER BY e.importance DESC, e.created_at DESC
    LIMIT GREATEST(COALESCE(p_max_episodes, 5), 1)
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'memory_type', f.memory_type,
            'content', f.content,
            'confidence', f.confidence,
            'reinforcement_count', f.reinforcement_count,
            'metadata', f.metadata,
            'tags', f.tags
          )
          ORDER BY f.confidence DESC, f.last_reinforced_at DESC, f.updated_at DESC
        )
        FROM fact_rows AS f
      ),
      '[]'::jsonb
    ) AS user_facts,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'summary', e.summary,
            'outcome', e.outcome,
            'importance', e.importance,
            'source', e.source,
            'entities', e.entities,
            'created_at', e.created_at
          )
          ORDER BY e.importance DESC, e.created_at DESC
        )
        FROM episode_rows AS e
      ),
      '[]'::jsonb
    ) AS recent_episodes;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_episodes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.agent_memory_episodes
  WHERE expires_at <= now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'agent-memory-episodes-cleanup-weekly'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'agent-memory-episodes-cleanup-weekly',
    '15 5 * * 1',
    $sql$SELECT public.cleanup_old_episodes();$sql$
  );
END;
$cron$;
