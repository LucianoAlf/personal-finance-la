-- Extend calendar write RPCs to support service_role callers (e.g. WhatsApp handler)
-- while keeping the same semantic surface for authenticated UI callers.

BEGIN;
DROP FUNCTION IF EXISTS public.create_calendar_event(
  text, date, text, boolean, text, time, time, text, text
);
CREATE OR REPLACE FUNCTION public.create_calendar_event(
  p_title text,
  p_date date,
  p_timezone text,
  p_all_day boolean DEFAULT false,
  p_description text DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_event_kind text DEFAULT 'personal',
  p_created_by calendar_event_created_by DEFAULT 'user',
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
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
  v_id uuid;
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

  INSERT INTO public.calendar_events (
    user_id,
    title,
    description,
    event_kind,
    domain_type,
    start_at,
    end_at,
    all_day,
    timezone,
    status,
    location_text,
    source,
    created_by,
    sync_eligible,
    metadata
  ) VALUES (
    v_owner_uid,
    p_title,
    p_description,
    COALESCE(NULLIF(trim(p_event_kind), ''), 'personal'),
    NULL,
    v_start,
    v_end,
    p_all_day,
    v_tz,
    'scheduled',
    p_location_text,
    'internal',
    p_created_by,
    true,
    '{}'::jsonb
  )
  RETURNING id INTO v_id;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    v_id,
    'ticktick',
    'upsert_event',
    'sync:' || v_id::text || ':upsert_event:initial',
    'pending'
  );

  RETURN v_id;
END;
$$;
COMMENT ON FUNCTION public.create_calendar_event IS
  'Creates a canonical calendar event for UI or service_role callers, preserving outbound sync enqueue.';
DROP FUNCTION IF EXISTS public.set_calendar_event_status(uuid, calendar_event_status);
CREATE OR REPLACE FUNCTION public.set_calendar_event_status(
  p_event_id uuid,
  p_new_status calendar_event_status,
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

  IF p_new_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_status_for_client_transition';
  END IF;

  UPDATE public.calendar_events e
  SET
    status = p_new_status,
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
END;
$$;
COMMENT ON FUNCTION public.set_calendar_event_status IS
  'Sets event status for UI or service_role callers and skips pending reminder deliveries.';
GRANT EXECUTE ON FUNCTION public.create_calendar_event(
  text, date, text, boolean, text, time, time, text, text, calendar_event_created_by, uuid
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_calendar_event_status(
  uuid, calendar_event_status, uuid
) TO authenticated;
COMMIT;
