-- Phase A: Ana Clara memory reinforcement
-- Adds reinforcement metadata, reinforcement RPC, stale fact decay RPC,
-- and a weekly pg_cron job to decay stale preferences/patterns.

ALTER TABLE public.agent_memory_entries
  ADD COLUMN IF NOT EXISTS reinforcement_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4, 3) NOT NULL DEFAULT 0.6
    CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
  ADD COLUMN IF NOT EXISTS last_reinforced_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.agent_memory_entries
SET
  reinforcement_count = COALESCE(reinforcement_count, 1),
  confidence = COALESCE(confidence, 0.6),
  last_reinforced_at = COALESCE(last_reinforced_at, updated_at, created_at, now())
WHERE reinforcement_count IS NULL
   OR confidence IS NULL
   OR last_reinforced_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memory_reinforcement
  ON public.agent_memory_entries(user_id, memory_type, confidence DESC, last_reinforced_at DESC);

CREATE OR REPLACE FUNCTION public.calculate_agent_memory_confidence(p_reinforcement_count INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_reinforcement_count IS NULL OR p_reinforcement_count <= 1 THEN
    RETURN 0.6;
  ELSIF p_reinforcement_count = 2 THEN
    RETURN 0.72;
  ELSIF p_reinforcement_count = 3 THEN
    RETURN 0.82;
  END IF;

  RETURN 0.9;
END;
$$;

CREATE OR REPLACE FUNCTION public.learn_or_reinforce_fact(
  p_user_id UUID,
  p_memory_type TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_tags TEXT[] DEFAULT '{}'::text[],
  p_source TEXT DEFAULT 'system',
  p_query_embedding vector(1536) DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  reinforcement_count INTEGER,
  confidence NUMERIC(4, 3),
  created_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_new_count INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_memory_type IS NULL OR btrim(p_memory_type) = '' THEN
    RAISE EXCEPTION 'p_memory_type is required';
  END IF;

  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'p_content is required';
  END IF;

  IF p_query_embedding IS NOT NULL THEN
    SELECT
      m.id,
      m.content,
      m.metadata,
      m.tags,
      m.reinforcement_count
    INTO v_existing
    FROM public.agent_memory_entries AS m
    WHERE m.user_id = p_user_id
      AND m.memory_type = p_memory_type
      AND m.embedding IS NOT NULL
      AND (m.expires_at IS NULL OR m.expires_at > now())
      AND 1 - (m.embedding <=> p_query_embedding) >= 0.85
    ORDER BY m.embedding <=> p_query_embedding
    LIMIT 1;
  ELSE
    SELECT
      m.id,
      m.content,
      m.metadata,
      m.tags,
      m.reinforcement_count
    INTO v_existing
    FROM public.agent_memory_entries AS m
    WHERE m.user_id = p_user_id
      AND m.memory_type = p_memory_type
      AND lower(trim(m.content)) = lower(trim(p_content))
      AND (m.expires_at IS NULL OR m.expires_at > now())
    ORDER BY m.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    v_new_count := COALESCE(v_existing.reinforcement_count, 1) + 1;

    UPDATE public.agent_memory_entries AS m
    SET
      content = CASE
        WHEN char_length(p_content) >= char_length(COALESCE(v_existing.content, '')) THEN p_content
        ELSE v_existing.content
      END,
      metadata = COALESCE(v_existing.metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
      tags = ARRAY(
        SELECT DISTINCT tag
        FROM unnest(COALESCE(v_existing.tags, '{}'::text[]) || COALESCE(p_tags, '{}'::text[])) AS tag
        WHERE tag IS NOT NULL AND btrim(tag) <> ''
      ),
      embedding = COALESCE(p_query_embedding, m.embedding),
      source = COALESCE(NULLIF(p_source, ''), m.source),
      reinforcement_count = v_new_count,
      confidence = public.calculate_agent_memory_confidence(v_new_count),
      last_reinforced_at = now(),
      updated_at = now()
    WHERE m.id = v_existing.id
    RETURNING
      m.id,
      m.reinforcement_count,
      m.confidence
    INTO id, reinforcement_count, confidence;

    created_new := false;
    RETURN NEXT;
    RETURN;
  END IF;

  v_expires_at := CASE
    WHEN p_memory_type = 'pattern' THEN now() + INTERVAL '90 days'
    ELSE NULL
  END;

  INSERT INTO public.agent_memory_entries (
    user_id,
    memory_type,
    content,
    metadata,
    tags,
    embedding,
    source,
    expires_at,
    reinforcement_count,
    confidence,
    last_reinforced_at
  ) VALUES (
    p_user_id,
    p_memory_type,
    p_content,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_tags, '{}'::text[]),
    p_query_embedding,
    COALESCE(NULLIF(p_source, ''), 'system'),
    v_expires_at,
    1,
    public.calculate_agent_memory_confidence(1),
    now()
  )
  RETURNING
    agent_memory_entries.id,
    agent_memory_entries.reinforcement_count,
    agent_memory_entries.confidence
  INTO id, reinforcement_count, confidence;

  created_new := true;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.decay_stale_facts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE public.agent_memory_entries
  SET
    confidence = GREATEST(0.35, ROUND((confidence - 0.08)::numeric, 3)),
    updated_at = now()
  WHERE memory_type IN ('preference', 'pattern')
    AND last_reinforced_at < now() - INTERVAL '30 days'
    AND confidence > 0.35;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'agent-memory-decay-weekly'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  PERFORM cron.schedule(
    'agent-memory-decay-weekly',
    '0 5 * * 1',
    $sql$SELECT public.decay_stale_facts();$sql$
  );
END;
$cron$;
