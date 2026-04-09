-- Recurring calendar reminders (agenda pipeline only).
-- Expands occurrences into calendar_reminder_schedule with deterministic idempotency keys.
-- Replaces set_calendar_event_reminders behavior that previously rejected recurring series.
-- Occurrence overrides: skip cancelled; fire_at from rescheduled start; refresh pending rows.

BEGIN;
-- ---------------------------------------------------------------------------
-- Populate schedule rows for all enabled reminders x occurrences in a time window
-- (override-aware; stable occurrence_key = original series instant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_populate_recurring_reminder_schedule(
  p_event_id uuid,
  p_owner_uid uuid,
  p_window_start timestamptz,
  p_window_end timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rem RECORD;
  v_occ RECORD;
  v_occ_key text;
  v_effective_start timestamptz;
  v_fire_at timestamptz;
  v_idem text;
BEGIN
  IF p_window_start >= p_window_end THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.calendar_events e
    WHERE e.id = p_event_id
      AND e.user_id = p_owner_uid
      AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.calendar_reminder_schedule crs
  USING public.calendar_event_reminders cer
  WHERE crs.reminder_id = cer.id
    AND cer.event_id = p_event_id
    AND crs.delivery_status = 'pending'
    AND crs.fire_at >= clock_timestamp();

  FOR v_rem IN
    SELECT cer.id, cer.remind_offset_minutes
    FROM public.calendar_event_reminders cer
    WHERE cer.event_id = p_event_id
      AND cer.enabled = true
  LOOP
    FOR v_occ IN
      SELECT
        exp.original_start_at,
        coalesce(ov.is_cancelled, false) AS is_cancelled,
        ov.override_start_at
      FROM public.calendar_recurrence_expand_occurrences(
        p_event_id,
        p_window_start,
        p_window_end
      ) AS exp
      LEFT JOIN public.calendar_event_occurrence_overrides ov
        ON ov.event_id = p_event_id
       AND ov.occurrence_key = public.calendar_occurrence_key(
         p_event_id,
         exp.original_start_at
       )
    LOOP
      IF v_occ.is_cancelled THEN
        CONTINUE;
      END IF;

      v_effective_start := coalesce(v_occ.override_start_at, v_occ.original_start_at);

      v_fire_at := v_effective_start - (v_rem.remind_offset_minutes * interval '1 minute');

      IF v_fire_at < clock_timestamp() THEN
        CONTINUE;
      END IF;

      v_occ_key := public.calendar_occurrence_key(p_event_id, v_occ.original_start_at);
      v_idem := v_rem.id::text || ':' || v_occ_key || ':whatsapp';

      INSERT INTO public.calendar_reminder_schedule (
        event_id,
        reminder_id,
        occurrence_key,
        fire_at,
        channel,
        idempotency_key,
        delivery_status
      ) VALUES (
        p_event_id,
        v_rem.id,
        v_occ_key,
        v_fire_at,
        'whatsapp'::calendar_reminder_channel,
        v_idem,
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
COMMENT ON FUNCTION public.calendar_populate_recurring_reminder_schedule(
  uuid, uuid, timestamptz, timestamptz
) IS
  'Rebuilds future pending schedule rows for recurring events in the window: honours overrides (skip cancelled, fire_at from override_start_at), stable occurrence_key on original instant. Deletes future pending rows for the event first.';
GRANT EXECUTE ON FUNCTION public.calendar_populate_recurring_reminder_schedule(
  uuid, uuid, timestamptz, timestamptz
) TO authenticated;
-- ---------------------------------------------------------------------------
-- set_calendar_event_reminders: allow recurrence; populate sliding window
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_calendar_event_reminders(
  p_event_id uuid,
  p_reminders jsonb DEFAULT '[]'::jsonb,
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
  e RECORD;
  v_existing_sig text;
  v_desired_sig text;
  v_elem jsonb;
  v_offset int;
  v_enabled boolean;
  v_kind calendar_reminder_kind;
  v_seen jsonb := '{}'::jsonb;
  v_key text;
  v_start_iso text;
  v_occ_key text;
  v_reminder_id uuid;
  v_fire_at timestamptz;
  v_parts text[] := ARRAY[]::text[];
  v_sorted text;
  v_sorted_parts text[];
  v_has_recurrence boolean;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF p_reminders IS NULL OR jsonb_typeof(p_reminders) <> 'array' THEN
    RAISE EXCEPTION 'invalid_reminders_payload';
  END IF;

  SELECT ce.id, ce.start_at, ce.timezone, ce.deleted_at
  INTO e
  FROM public.calendar_events ce
  WHERE ce.id = p_event_id
    AND ce.user_id = v_owner_uid;

  IF NOT FOUND OR e.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  v_has_recurrence := EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  );

  v_start_iso := trim(both '"' FROM to_json(e.start_at)::text);
  v_occ_key := e.id::text || ':' || v_start_iso;

  SELECT coalesce(
    string_agg(
      cer.reminder_kind::text || ':' || cer.remind_offset_minutes::text,
      '|' ORDER BY cer.reminder_kind::text, cer.remind_offset_minutes
    ),
    ''
  )
  INTO v_existing_sig
  FROM public.calendar_event_reminders cer
  WHERE cer.event_id = p_event_id
    AND cer.enabled = true;

  v_parts := ARRAY[]::text[];
  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_reminders)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'invalid_reminders_item';
    END IF;

    v_enabled := coalesce((v_elem->>'enabled')::boolean, true);
    IF NOT v_enabled THEN
      CONTINUE;
    END IF;

    IF v_elem->'remind_offset_minutes' IS NULL
      OR jsonb_typeof(v_elem->'remind_offset_minutes') <> 'number' THEN
      RAISE EXCEPTION 'remind_offset_minutes_required';
    END IF;

    v_offset := (v_elem->>'remind_offset_minutes')::int;
    IF v_offset < 0 THEN
      RAISE EXCEPTION 'invalid_remind_offset';
    END IF;

    BEGIN
      v_kind := coalesce(
        nullif(trim(v_elem->>'reminder_kind'), ''),
        'default'
      )::calendar_reminder_kind;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'invalid_reminder_kind';
    END;

    v_key := v_kind::text || ':' || v_offset::text;
    IF v_seen ? v_key THEN
      CONTINUE;
    END IF;
    v_seen := v_seen || jsonb_build_object(v_key, true);
    v_parts := array_append(v_parts, v_key);
  END LOOP;

  SELECT coalesce(string_agg(p, '|' ORDER BY p), '')
  INTO v_desired_sig
  FROM unnest(v_parts) AS u(p);

  IF v_existing_sig = v_desired_sig THEN
    IF v_has_recurrence THEN
      PERFORM public.calendar_populate_recurring_reminder_schedule(
        p_event_id,
        v_owner_uid,
        clock_timestamp(),
        clock_timestamp() + interval '90 days'
      );
    END IF;
    RETURN;
  END IF;

  DELETE FROM public.calendar_event_reminders cer
  WHERE cer.event_id = p_event_id;

  IF v_desired_sig = '' THEN
    RETURN;
  END IF;

  SELECT array_agg(x ORDER BY x)
  INTO v_sorted_parts
  FROM unnest(v_parts) AS t(x);

  FOREACH v_sorted IN ARRAY v_sorted_parts
  LOOP
    v_kind := split_part(v_sorted, ':', 1)::calendar_reminder_kind;
    v_offset := split_part(v_sorted, ':', 2)::int;

    INSERT INTO public.calendar_event_reminders (
      event_id,
      reminder_kind,
      remind_offset_minutes,
      channel_policy,
      enabled
    ) VALUES (
      p_event_id,
      v_kind,
      v_offset,
      'user_preference',
      true
    )
    RETURNING id INTO v_reminder_id;

    IF NOT v_has_recurrence THEN
      v_fire_at := e.start_at - (v_offset * interval '1 minute');

      INSERT INTO public.calendar_reminder_schedule (
        event_id,
        reminder_id,
        occurrence_key,
        fire_at,
        channel,
        idempotency_key,
        delivery_status
      ) VALUES (
        p_event_id,
        v_reminder_id,
        v_occ_key,
        v_fire_at,
        'whatsapp'::calendar_reminder_channel,
        v_reminder_id::text || ':' || v_occ_key || ':whatsapp',
        'pending'
      );
    END IF;
  END LOOP;

  IF v_has_recurrence THEN
    PERFORM public.calendar_populate_recurring_reminder_schedule(
      p_event_id,
      v_owner_uid,
      clock_timestamp(),
      clock_timestamp() + interval '90 days'
    );
  END IF;
END;
$$;
COMMENT ON FUNCTION public.set_calendar_event_reminders(uuid, jsonb, uuid) IS
  'V1 semantic replace for event reminders (whatsapp schedule rows). Recurring events: reminder rows + sliding-window schedule via calendar_populate_recurring_reminder_schedule (~90d), override-aware. Idempotent when enabled reminder multiset unchanged (recurring still refreshes schedule window).';
-- ---------------------------------------------------------------------------
-- reschedule_calendar_occurrence: refresh recurring reminder window
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reschedule_calendar_occurrence(
  p_event_id uuid,
  p_original_start_at timestamptz,
  p_override_start_at timestamptz,
  p_override_end_at timestamptz,
  p_title_override text DEFAULT NULL,
  p_description_override text DEFAULT NULL,
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
  v_occ_key text;
  v_override_id uuid;
  v_has_rule boolean;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  ) INTO v_has_rule;

  IF NOT v_has_rule THEN
    RAISE EXCEPTION 'recurrence_required_for_occurrence_override';
  END IF;

  v_occ_key := public.calendar_occurrence_key(p_event_id, p_original_start_at);

  INSERT INTO public.calendar_event_occurrence_overrides (
    event_id,
    occurrence_key,
    original_start_at,
    override_start_at,
    override_end_at,
    status,
    title_override,
    description_override,
    is_cancelled
  ) VALUES (
    p_event_id,
    v_occ_key,
    p_original_start_at,
    p_override_start_at,
    p_override_end_at,
    NULL,
    p_title_override,
    p_description_override,
    false
  )
  ON CONFLICT (event_id, occurrence_key) DO UPDATE SET
    original_start_at = EXCLUDED.original_start_at,
    override_start_at = EXCLUDED.override_start_at,
    override_end_at = EXCLUDED.override_end_at,
    title_override = EXCLUDED.title_override,
    description_override = EXCLUDED.description_override,
    is_cancelled = false,
    updated_at = now()
  RETURNING id INTO v_override_id;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    occurrence_override_id,
    occurrence_key,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    p_event_id,
    v_override_id,
    v_occ_key,
    'ticktick',
    'upsert_occurrence_override',
    'occ:upsert:' || p_event_id::text || ':' || v_occ_key,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    occurrence_override_id = EXCLUDED.occurrence_override_id,
    occurrence_key = EXCLUDED.occurrence_key,
    status = 'pending',
    updated_at = now(),
    last_error = NULL;

  PERFORM public.calendar_populate_recurring_reminder_schedule(
    p_event_id,
    v_owner_uid,
    clock_timestamp(),
    clock_timestamp() + interval '90 days'
  );

  RETURN v_override_id;
END;
$$;
COMMENT ON FUNCTION public.reschedule_calendar_occurrence IS
  'Persist reschedule for one recurring occurrence; enqueues TickTick job (V1 worker skips as unsupported). Refreshes recurring reminder schedule.';
GRANT EXECUTE ON FUNCTION public.reschedule_calendar_occurrence(
  uuid, timestamptz, timestamptz, timestamptz, text, text, uuid
) TO authenticated;
-- ---------------------------------------------------------------------------
-- cancel_calendar_occurrence: refresh recurring reminder window
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_calendar_occurrence(
  p_event_id uuid,
  p_original_start_at timestamptz,
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
  v_occ_key text;
  v_override_id uuid;
  v_has_rule boolean;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  ) INTO v_has_rule;

  IF NOT v_has_rule THEN
    RAISE EXCEPTION 'recurrence_required_for_occurrence_override';
  END IF;

  v_occ_key := public.calendar_occurrence_key(p_event_id, p_original_start_at);

  INSERT INTO public.calendar_event_occurrence_overrides (
    event_id,
    occurrence_key,
    original_start_at,
    override_start_at,
    override_end_at,
    status,
    title_override,
    description_override,
    is_cancelled
  ) VALUES (
    p_event_id,
    v_occ_key,
    p_original_start_at,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true
  )
  ON CONFLICT (event_id, occurrence_key) DO UPDATE SET
    original_start_at = EXCLUDED.original_start_at,
    is_cancelled = true,
    override_start_at = NULL,
    override_end_at = NULL,
    title_override = NULL,
    description_override = NULL,
    updated_at = now()
  RETURNING id INTO v_override_id;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    occurrence_override_id,
    occurrence_key,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    p_event_id,
    v_override_id,
    v_occ_key,
    'ticktick',
    'cancel_occurrence',
    'occ:cancel:' || p_event_id::text || ':' || v_occ_key,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    occurrence_override_id = EXCLUDED.occurrence_override_id,
    occurrence_key = EXCLUDED.occurrence_key,
    status = 'pending',
    updated_at = now(),
    last_error = NULL;

  PERFORM public.calendar_populate_recurring_reminder_schedule(
    p_event_id,
    v_owner_uid,
    clock_timestamp(),
    clock_timestamp() + interval '90 days'
  );

  RETURN v_override_id;
END;
$$;
COMMENT ON FUNCTION public.cancel_calendar_occurrence IS
  'Cancel one occurrence of a recurring series; enqueues TickTick job (V1 worker skips as unsupported). Refreshes recurring reminder schedule.';
GRANT EXECUTE ON FUNCTION public.cancel_calendar_occurrence(uuid, timestamptz, uuid) TO authenticated;
COMMIT;
