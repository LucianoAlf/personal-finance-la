-- Phase B hardening: prevent cross-user access through SECURITY DEFINER RPCs

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
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to write episodes for another user';
  END IF;

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to read context for another user';
  END IF;

  RETURN QUERY
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
END;
$$;
