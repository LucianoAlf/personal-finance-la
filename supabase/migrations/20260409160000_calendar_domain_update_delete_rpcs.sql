BEGIN;

DROP FUNCTION IF EXISTS public.update_calendar_event(
  uuid, text, date, text, boolean, text, time, time, text, text, text, text[], uuid
);

CREATE OR REPLACE FUNCTION public.update_calendar_event(
  p_event_id uuid,
  p_title text,
  p_date date,
  p_timezone text,
  p_all_day boolean DEFAULT false,
  p_description text DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_event_kind text DEFAULT 'personal',
  p_priority text DEFAULT NULL,
  p_ticktick_tags text[] DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_metadata jsonb;
  v_updated int;
  v_clean_tags text[];
BEGIN
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  v_tz := NULLIF(trim(p_timezone), '');
  IF v_tz IS NULL THEN
    v_tz := 'America/Sao_Paulo';
  END IF;

  IF p_all_day THEN
    v_start := timezone(v_tz, (p_date + time '00:00:00')::timestamp);
    v_end := timezone(v_tz, (p_date + time '23:59:59')::timestamp);
  ELSE
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'start_time_required';
    END IF;

    v_start := timezone(v_tz, (p_date + p_start_time)::timestamp);
    IF p_end_time IS NOT NULL THEN
      v_end := timezone(v_tz, (p_date + p_end_time)::timestamp);
    ELSE
      v_end := v_start + interval '1 hour';
    END IF;
  END IF;

  SELECT COALESCE(e.metadata, '{}'::jsonb)
    INTO v_metadata
  FROM public.calendar_events e
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  v_metadata := v_metadata - 'priority' - 'ticktick_tags';

  IF NULLIF(trim(COALESCE(p_priority, '')), '') IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('priority', trim(p_priority));
  END IF;

  SELECT COALESCE(array_agg(trim(tag)), ARRAY[]::text[])
    INTO v_clean_tags
  FROM unnest(COALESCE(p_ticktick_tags, ARRAY[]::text[])) AS tag
  WHERE NULLIF(trim(tag), '') IS NOT NULL;

  IF COALESCE(array_length(v_clean_tags, 1), 0) > 0 THEN
    v_metadata := v_metadata || jsonb_build_object('ticktick_tags', to_jsonb(v_clean_tags));
  END IF;

  UPDATE public.calendar_events e
  SET
    title = trim(p_title),
    description = NULLIF(trim(COALESCE(p_description, '')), ''),
    event_kind = COALESCE(NULLIF(trim(p_event_kind), ''), 'personal'),
    start_at = v_start,
    end_at = v_end,
    all_day = p_all_day,
    timezone = v_tz,
    location_text = NULLIF(trim(COALESCE(p_location_text, '')), ''),
    metadata = v_metadata,
    updated_at = now()
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status,
    run_after
  ) VALUES (
    v_owner_uid,
    p_event_id,
    'ticktick',
    'upsert_event',
    'sync:' || p_event_id::text || ':upsert_event:edit:' || gen_random_uuid()::text,
    'pending',
    now()
  );
END;
$$;

COMMENT ON FUNCTION public.update_calendar_event(uuid, text, date, text, boolean, text, time, time, text, text, text, text[], uuid) IS
  'Updates canonical calendar event fields + priority/ticktick tags, then enqueues outbound TickTick upsert_event.';

DROP FUNCTION IF EXISTS public.delete_calendar_event(uuid, uuid);

CREATE OR REPLACE FUNCTION public.delete_calendar_event(
  p_event_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_updated int;
BEGIN
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  UPDATE public.calendar_events e
  SET
    status = 'cancelled',
    deleted_at = now(),
    updated_at = now()
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  UPDATE public.calendar_reminder_schedule crs
  SET delivery_status = 'skipped'
  WHERE crs.event_id = p_event_id
    AND crs.delivery_status = 'pending';

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status,
    run_after
  ) VALUES (
    v_owner_uid,
    p_event_id,
    'ticktick',
    'delete_event',
    'sync:' || p_event_id::text || ':delete_event',
    'pending',
    now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.delete_calendar_event(uuid, uuid) IS
  'Soft-deletes a canonical calendar event and enqueues outbound TickTick delete_event.';

GRANT EXECUTE ON FUNCTION public.update_calendar_event(
  uuid, text, date, text, boolean, text, time, time, text, text, text, text[], uuid
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.delete_calendar_event(uuid, uuid) TO authenticated;

COMMIT;
