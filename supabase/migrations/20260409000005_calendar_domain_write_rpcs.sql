-- Calendar domain: semantic write surface for clients (UI, future integrations).
-- Centralizes event creation (sync job enqueue) and status transitions (reminder schedule hygiene).
--
-- Parameter order: required args first; any param with a DEFAULT must not be followed by a required param (PostgreSQL).

BEGIN;
-- Remove overloads antigas se existirem (evita duplicar assinatura após ajuste de ordem de parâmetros).
DROP FUNCTION IF EXISTS public.create_calendar_event(text, text, date, time, time, boolean, text, text, text);
DROP FUNCTION IF EXISTS public.create_calendar_event(text, date, text, boolean, text, time, time, text, text);
CREATE OR REPLACE FUNCTION public.create_calendar_event(
  p_title text,
  p_date date,
  p_timezone text,
  p_all_day boolean DEFAULT false,
  p_description text DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_event_kind text DEFAULT 'personal'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
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
    v_uid,
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
    'user',
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
    v_uid,
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
  'Creates a canonical calendar event for the current user, enqueues outbound sync job (TickTick placeholder path).';
CREATE OR REPLACE FUNCTION public.set_calendar_event_status(
  p_event_id uuid,
  p_new_status calendar_event_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_new_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_status_for_client_transition';
  END IF;

  UPDATE public.calendar_events e
  SET
    status = p_new_status,
    updated_at = now()
  WHERE e.id = p_event_id
    AND e.user_id = v_uid
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
  'Sets event status to completed or cancelled; skips pending reminder deliveries for that event.';
GRANT EXECUTE ON FUNCTION public.create_calendar_event(
  text, date, text, boolean, text, time, time, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_calendar_event_status(uuid, calendar_event_status) TO authenticated;
COMMIT;
