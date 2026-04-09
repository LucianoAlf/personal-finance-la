-- Calendar recurrence + occurrence overrides V1
-- Spec: docs/superpowers/specs/2026-04-08-calendar-recurrence-overrides-v1-design.md
-- Daily / weekly / monthly materialization by window; conservative override/reminder policies.

BEGIN;
-- ---------------------------------------------------------------------------
-- Stable occurrence_key suffix (parity with set_calendar_event_reminders)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_occurrence_key(p_event_id uuid, p_original_start timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_event_id::text || ':' || trim(both '"' FROM to_json(p_original_start)::text);
$$;
COMMENT ON FUNCTION public.calendar_occurrence_key(uuid, timestamptz) IS
  'Stable occurrence_key: event_id + ISO-like timestamptz string (matches reminder occurrence_key style).';
-- ---------------------------------------------------------------------------
-- Weekday tokens -> ISODOW (1=Mon .. 7=Sun)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_weekday_token_to_isodow(p_token text)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text := lower(trim(p_token));
BEGIN
  IF t IN ('mon', 'monday', '1') THEN RETURN 1; END IF;
  IF t IN ('tue', 'tues', 'tuesday', '2') THEN RETURN 2; END IF;
  IF t IN ('wed', 'weds', 'wednesday', '3') THEN RETURN 3; END IF;
  IF t IN ('thu', 'thur', 'thurs', 'thursday', '4') THEN RETURN 4; END IF;
  IF t IN ('fri', 'friday', '5') THEN RETURN 5; END IF;
  IF t IN ('sat', 'saturday', '6') THEN RETURN 6; END IF;
  IF t IN ('sun', 'sunday', '7', '0') THEN RETURN 7; END IF;
  RETURN NULL;
END;
$$;
-- ---------------------------------------------------------------------------
-- Expand recurring occurrences into [p_from, p_to) (half-open on end)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_recurrence_expand_occurrences(
  p_event_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE(original_start_at timestamptz, original_end_at timestamptz)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  ce RECORD;
  r RECORD;
  v_tz text;
  v_series_min timestamptz;
  v_dur interval;
  v_local_time time;
  v_anchor_local_date date;
  v_scan_d date;
  v_ts timestamptz;
  v_ts_end timestamptz;
  v_global_n int := 0;
  v_dmax date;
  v_effective_monthday int;
  v_last_dom int;
  v_y int;
  v_m int;
  v_wd int;
  v_allowed int[];
  v_t text;
  v_i int;
  v_months_a int;
  v_months_anchor int;
  v_anchor_month date;
  v_week_anchor_monday date;
  v_week_curr_monday date;
  v_week_diff int;
BEGIN
  IF p_from >= p_to THEN
    RETURN;
  END IF;

  SELECT * INTO ce FROM public.calendar_events WHERE id = p_event_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO r FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF r.frequency::text = 'yearly' THEN
    RAISE EXCEPTION 'yearly_recurrence_deferred_v1';
  END IF;

  v_tz := coalesce(nullif(trim(r.timezone), ''), nullif(trim(ce.timezone), ''), 'America/Sao_Paulo');

  v_series_min := greatest(ce.start_at, r.starts_at);

  IF ce.end_at IS NULL THEN
    v_dur := interval '1 hour';
  ELSE
    v_dur := ce.end_at - ce.start_at;
  END IF;

  IF ce.all_day THEN
    v_local_time := time '00:00:00';
    v_dur := coalesce(nullif(ce.end_at - ce.start_at, interval '0'), interval '1 day');
  ELSE
    v_local_time := ((ce.start_at AT TIME ZONE v_tz)::timestamp)::time;
  END IF;

  v_anchor_local_date := (ce.start_at AT TIME ZONE v_tz)::date;
  v_dmax := ((p_to AT TIME ZONE v_tz)::date) + 1;

  -- -------------------------------------------------------------------------
  -- DAILY
  -- -------------------------------------------------------------------------
  IF r.frequency = 'daily' THEN
    v_scan_d := least(v_anchor_local_date, (p_from AT TIME ZONE v_tz)::date);
    WHILE v_scan_d <= v_dmax LOOP
        IF (v_scan_d - v_anchor_local_date) >= 0
         AND (v_scan_d - v_anchor_local_date) % r.interval_value = 0 THEN
        v_ts := timezone(v_tz, (v_scan_d::timestamp + v_local_time));
        v_ts_end := v_ts + v_dur;
        IF v_ts >= v_series_min
           AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
          v_global_n := v_global_n + 1;
          IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
            EXIT;
          END IF;
          IF v_ts >= p_from AND v_ts < p_to THEN
            original_start_at := v_ts;
            original_end_at := v_ts_end;
            RETURN NEXT;
          END IF;
        END IF;
      END IF;
      v_scan_d := v_scan_d + 1;
    END LOOP;
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- WEEKLY
  -- -------------------------------------------------------------------------
  IF r.frequency = 'weekly' THEN
    v_allowed := ARRAY[]::int[];
    IF r.by_weekday IS NULL OR array_length(r.by_weekday, 1) IS NULL THEN
      v_allowed := array_append(
        v_allowed,
        EXTRACT(ISODOW FROM ((ce.start_at AT TIME ZONE v_tz)::timestamp))::int
      );
    ELSE
      FOREACH v_t IN ARRAY r.by_weekday LOOP
        v_i := public.calendar_weekday_token_to_isodow(v_t);
        IF v_i IS NOT NULL THEN
          v_allowed := array_append(v_allowed, v_i);
        END IF;
      END LOOP;
      IF array_length(v_allowed, 1) IS NULL THEN
        v_allowed := array_append(
          v_allowed,
          EXTRACT(ISODOW FROM ((ce.start_at AT TIME ZONE v_tz)::timestamp))::int
        );
      END IF;
    END IF;

    v_week_anchor_monday := date_trunc('week', (ce.start_at AT TIME ZONE v_tz)::timestamp)::date;

    v_scan_d := least(v_anchor_local_date, (p_from AT TIME ZONE v_tz)::date) - 7;
    WHILE v_scan_d <= v_dmax LOOP
      v_wd := EXTRACT(ISODOW FROM v_scan_d::timestamp)::int;
      IF v_wd = ANY (v_allowed) THEN
        v_week_curr_monday := date_trunc('week', v_scan_d::timestamp)::date;
        v_week_diff := (v_week_curr_monday - v_week_anchor_monday) / 7;
        IF v_week_diff >= 0 AND v_week_diff % r.interval_value = 0 THEN
          v_ts := timezone(v_tz, (v_scan_d::timestamp + v_local_time));
          v_ts_end := v_ts + v_dur;
          IF v_ts >= v_series_min
             AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
            v_global_n := v_global_n + 1;
            IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
              EXIT;
            END IF;
            IF v_ts >= p_from AND v_ts < p_to THEN
              original_start_at := v_ts;
              original_end_at := v_ts_end;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
      END IF;
      v_scan_d := v_scan_d + 1;
    END LOOP;
    RETURN;
  END IF;

  -- -------------------------------------------------------------------------
  -- MONTHLY
  -- -------------------------------------------------------------------------
  IF r.frequency = 'monthly' THEN
    IF r.by_monthday IS NOT NULL AND array_length(r.by_monthday, 1) >= 1 THEN
      v_effective_monthday := r.by_monthday[1];
    ELSE
      v_effective_monthday := EXTRACT(DAY FROM (ce.start_at AT TIME ZONE v_tz)::date)::int;
    END IF;

    IF v_effective_monthday < 1 OR v_effective_monthday > 31 THEN
      RETURN;
    END IF;

    v_anchor_month := date_trunc('month', (ce.start_at AT TIME ZONE v_tz)::date)::date;
    v_months_anchor :=
      (EXTRACT(YEAR FROM v_anchor_month)::int * 12 + EXTRACT(MONTH FROM v_anchor_month)::int);

    v_y := EXTRACT(YEAR FROM (p_from AT TIME ZONE v_tz)::date)::int;
    v_m := EXTRACT(MONTH FROM (p_from AT TIME ZONE v_tz)::date)::int;

    WHILE make_date(v_y, v_m, 1) <= v_dmax + 60 LOOP
      v_months_a := v_y * 12 + v_m;
      IF v_months_a >= v_months_anchor
         AND (v_months_a - v_months_anchor) % r.interval_value = 0 THEN
        v_last_dom := EXTRACT(
          DAY FROM ((make_date(v_y, v_m, 1) + interval '1 month - 1 day')::date)
        )::int;
        IF v_effective_monthday <= v_last_dom THEN
          v_ts := timezone(
            v_tz,
            (make_date(v_y, v_m, v_effective_monthday)::timestamp + v_local_time)
          );
          v_ts_end := v_ts + v_dur;
          IF v_ts >= v_series_min
             AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
            v_global_n := v_global_n + 1;
            IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
              EXIT;
            END IF;
            IF v_ts >= p_from AND v_ts < p_to THEN
              original_start_at := v_ts;
              original_end_at := v_ts_end;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
      END IF;
      v_m := v_m + 1;
      IF v_m > 12 THEN
        v_m := 1;
        v_y := v_y + 1;
      END IF;
      IF v_y > 2100 THEN
        EXIT;
      END IF;
    END LOOP;
    RETURN;
  END IF;

  RAISE EXCEPTION 'unsupported_recurrence_frequency_v1';
END;
$$;
COMMENT ON FUNCTION public.calendar_recurrence_expand_occurrences(uuid, timestamptz, timestamptz) IS
  'Materialize recurring occurrences for one event within [p_from, p_to). V1: daily, weekly, monthly only.';
-- ---------------------------------------------------------------------------
-- Explicit cleanup of overrides (same-transaction with rule changes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_calendar_occurrence_overrides_for_event(
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

  DELETE FROM public.calendar_event_occurrence_overrides o
  WHERE o.event_id = p_event_id;
END;
$$;
COMMENT ON FUNCTION public.delete_calendar_occurrence_overrides_for_event(uuid, uuid) IS
  'Deletes all occurrence overrides for an event (explicit cleanup before structural recurrence changes).';
GRANT EXECUTE ON FUNCTION public.delete_calendar_occurrence_overrides_for_event(uuid, uuid) TO authenticated;
-- ---------------------------------------------------------------------------
-- Normalize rule row for idempotency / change detection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._calendar_recurrence_rule_signature(
  p_frequency calendar_recurrence_frequency,
  p_interval_value int,
  p_by_weekday text[],
  p_by_monthday int[],
  p_starts_at timestamptz,
  p_until_at timestamptz,
  p_count_limit int,
  p_timezone text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT md5(
    p_frequency::text || '|' || p_interval_value::text || '|' ||
    coalesce(
      (SELECT string_agg(lower(trim(x)), ',' ORDER BY lower(trim(x)))
       FROM unnest(coalesce(p_by_weekday, array[]::text[])) AS u(x)),
      ''
    ) || '|' ||
    coalesce(
      (SELECT string_agg(x::text, ',' ORDER BY x)
       FROM unnest(coalesce(p_by_monthday, array[]::int[])) AS u2(x)),
      ''
    ) || '|' ||
    coalesce(p_starts_at::text, '') || '|' ||
    coalesce(p_until_at::text, '') || '|' ||
    coalesce(p_count_limit::text, '') || '|' ||
    coalesce(p_timezone, '')
  );
$$;
-- ---------------------------------------------------------------------------
-- set_calendar_event_recurrence
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_calendar_event_recurrence(
  p_event_id uuid,
  p_remove_recurrence boolean DEFAULT false,
  p_frequency calendar_recurrence_frequency DEFAULT NULL,
  p_interval_value int DEFAULT 1,
  p_by_weekday text[] DEFAULT NULL,
  p_by_monthday int[] DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_until_at timestamptz DEFAULT NULL,
  p_count_limit int DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_confirm_drop_overrides boolean DEFAULT false,
  p_confirm_drop_reminders boolean DEFAULT false,
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
  ce RECORD;
  r_existing RECORD;
  v_rule_exists boolean := false;
  v_has_overrides boolean;
  v_has_reminders boolean;
  v_tz text;
  v_starts timestamptz;
  v_sig_new text;
  v_sig_old text;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  SELECT * INTO ce
  FROM public.calendar_events e
  WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_occurrence_overrides o WHERE o.event_id = p_event_id
  ) INTO v_has_overrides;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_reminders cr WHERE cr.event_id = p_event_id
  ) OR EXISTS (
    SELECT 1 FROM public.calendar_reminder_schedule s WHERE s.event_id = p_event_id
  ) INTO v_has_reminders;

  SELECT * INTO r_existing FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;
  v_rule_exists := FOUND;

  IF p_remove_recurrence THEN
    IF v_has_overrides AND NOT p_confirm_drop_overrides THEN
      RAISE EXCEPTION 'occurrence_overrides_block_structural_change';
    END IF;
    IF v_has_overrides AND p_confirm_drop_overrides THEN
      DELETE FROM public.calendar_event_occurrence_overrides WHERE event_id = p_event_id;
    END IF;
    DELETE FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;
    RETURN;
  END IF;

  IF p_frequency IS NULL THEN
    RAISE EXCEPTION 'frequency_required';
  END IF;

  IF p_frequency::text = 'yearly' THEN
    RAISE EXCEPTION 'yearly_recurrence_deferred_v1';
  END IF;

  IF p_interval_value IS NULL OR p_interval_value < 1 THEN
    RAISE EXCEPTION 'invalid_interval_value';
  END IF;

  v_tz := coalesce(nullif(trim(p_timezone), ''), nullif(trim(ce.timezone), ''), 'America/Sao_Paulo');
  v_starts := coalesce(p_starts_at, ce.start_at);

  v_sig_new := public._calendar_recurrence_rule_signature(
    p_frequency,
    p_interval_value,
    p_by_weekday,
    p_by_monthday,
    v_starts,
    p_until_at,
    p_count_limit,
    v_tz
  );

  IF v_rule_exists THEN
    v_sig_old := public._calendar_recurrence_rule_signature(
      r_existing.frequency,
      r_existing.interval_value,
      r_existing.by_weekday,
      r_existing.by_monthday,
      r_existing.starts_at,
      r_existing.until_at,
      r_existing.count_limit,
      r_existing.timezone
    );
    IF v_sig_old = v_sig_new THEN
      RETURN;
    END IF;
  END IF;

  IF NOT v_rule_exists AND v_has_reminders AND NOT p_confirm_drop_reminders THEN
    RAISE EXCEPTION 'reminders_block_recurrence_until_cleared';
  END IF;

  IF NOT v_rule_exists AND v_has_reminders AND p_confirm_drop_reminders THEN
    DELETE FROM public.calendar_reminder_schedule WHERE event_id = p_event_id;
    DELETE FROM public.calendar_event_reminders WHERE event_id = p_event_id;
  END IF;

  IF v_rule_exists AND v_has_overrides AND NOT p_confirm_drop_overrides THEN
    RAISE EXCEPTION 'occurrence_overrides_block_structural_change';
  END IF;

  IF v_rule_exists AND v_has_overrides AND p_confirm_drop_overrides THEN
    DELETE FROM public.calendar_event_occurrence_overrides WHERE event_id = p_event_id;
  END IF;

  INSERT INTO public.calendar_event_recurrence_rules (
    event_id,
    frequency,
    interval_value,
    by_weekday,
    by_monthday,
    starts_at,
    until_at,
    count_limit,
    timezone
  ) VALUES (
    p_event_id,
    p_frequency,
    p_interval_value,
    p_by_weekday,
    p_by_monthday,
    v_starts,
    p_until_at,
    p_count_limit,
    v_tz
  )
  ON CONFLICT (event_id) DO UPDATE SET
    frequency = EXCLUDED.frequency,
    interval_value = EXCLUDED.interval_value,
    by_weekday = EXCLUDED.by_weekday,
    by_monthday = EXCLUDED.by_monthday,
    starts_at = EXCLUDED.starts_at,
    until_at = EXCLUDED.until_at,
    count_limit = EXCLUDED.count_limit,
    timezone = EXCLUDED.timezone,
    updated_at = now();
END;
$$;
COMMENT ON FUNCTION public.set_calendar_event_recurrence IS
  'Upsert or remove recurrence rule; conservative blocks when overrides/reminders exist unless explicit confirm flags.';
GRANT EXECUTE ON FUNCTION public.set_calendar_event_recurrence(
  uuid, boolean, calendar_recurrence_frequency, int, text[], int[], timestamptz, timestamptz, int, text, boolean, boolean, uuid
) TO authenticated;
-- ---------------------------------------------------------------------------
-- reschedule_calendar_occurrence
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

  RETURN v_override_id;
END;
$$;
COMMENT ON FUNCTION public.reschedule_calendar_occurrence IS
  'Persist reschedule for one recurring occurrence; enqueues TickTick job (V1 worker skips as unsupported).';
GRANT EXECUTE ON FUNCTION public.reschedule_calendar_occurrence(
  uuid, timestamptz, timestamptz, timestamptz, text, text, uuid
) TO authenticated;
-- ---------------------------------------------------------------------------
-- cancel_calendar_occurrence
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

  RETURN v_override_id;
END;
$$;
COMMENT ON FUNCTION public.cancel_calendar_occurrence IS
  'Cancel one occurrence of a recurring series; enqueues TickTick job (V1 worker skips as unsupported).';
GRANT EXECUTE ON FUNCTION public.cancel_calendar_occurrence(uuid, timestamptz, uuid) TO authenticated;
-- ---------------------------------------------------------------------------
-- Reminders: reject recurring events (V1)
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

  IF EXISTS (SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id) THEN
    RAISE EXCEPTION 'recurring_reminders_not_supported_v1';
  END IF;

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
  END LOOP;
END;
$$;
-- ---------------------------------------------------------------------------
-- get_agenda_window: add recurring branch (plpgsql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_agenda_window(
  p_user_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  agenda_item_type text,
  origin_type text,
  origin_id uuid,
  dedup_key text,
  display_start_at timestamptz,
  display_end_at timestamptz,
  title text,
  subtitle text,
  status text,
  badge text,
  edit_route text,
  is_read_only boolean,
  supports_reschedule boolean,
  supports_complete boolean,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH canonical_simple AS (
    SELECT
      'canonical_event'::text AS agenda_item_type,
      'calendar_event'::text AS origin_type,
      ce.id AS origin_id,
      ('ce:' || ce.id::text)::text AS dedup_key,
      ce.start_at AS display_start_at,
      ce.end_at AS display_end_at,
      ce.title,
      ce.description AS subtitle,
      ce.status::text AS status,
      ce.event_kind AS badge,
      ('/calendar/events/' || ce.id::text) AS edit_route,
      false AS is_read_only,
      true AS supports_reschedule,
      true AS supports_complete,
      (coalesce(ce.metadata, '{}'::jsonb) || jsonb_build_object(
        'event_id', ce.id,
        'is_recurring', false
      )) AS metadata
    FROM public.calendar_events ce
    WHERE ce.user_id = p_user_id
      AND ce.deleted_at IS NULL
      AND ce.status <> 'cancelled'
      AND ce.start_at < p_to
      AND (ce.end_at IS NULL OR ce.end_at > p_from OR ce.start_at >= p_from)
      AND NOT EXISTS (
        SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = ce.id
      )
  ),
  recurring_core AS (
    SELECT
      ce.id AS event_id,
      ce.title AS base_title,
      ce.description AS base_description,
      ce.event_kind,
      ce.status::text AS ev_status,
      ce.metadata AS base_metadata,
      r.frequency AS series_frequency,
      occ.original_start_at AS o_start,
      occ.original_end_at AS o_end,
      o.id AS ov_id,
      o.is_cancelled AS ov_cancelled,
      o.override_start_at,
      o.override_end_at,
      o.title_override,
      o.description_override
    FROM public.calendar_events ce
    INNER JOIN public.calendar_event_recurrence_rules r ON r.event_id = ce.id
    INNER JOIN LATERAL public.calendar_recurrence_expand_occurrences(ce.id, p_from, p_to) AS occ
      ON true
    LEFT JOIN public.calendar_event_occurrence_overrides o
      ON o.event_id = ce.id
      AND o.occurrence_key = public.calendar_occurrence_key(ce.id, occ.original_start_at)
    WHERE ce.user_id = p_user_id
      AND ce.deleted_at IS NULL
      AND ce.status <> 'cancelled'
      AND coalesce(o.is_cancelled, false) = false
  ),
  canonical_recurring AS (
    SELECT
      'canonical_event'::text AS agenda_item_type,
      'calendar_event'::text AS origin_type,
      rc.event_id AS origin_id,
      ('ceo:' || public.calendar_occurrence_key(rc.event_id, rc.o_start))::text AS dedup_key,
      coalesce(rc.override_start_at, rc.o_start) AS display_start_at,
      coalesce(rc.override_end_at, rc.o_end) AS display_end_at,
      coalesce(rc.title_override, rc.base_title) AS title,
      coalesce(rc.description_override, rc.base_description) AS subtitle,
      rc.ev_status AS status,
      rc.event_kind AS badge,
      ('/calendar/events/' || rc.event_id::text) AS edit_route,
      false AS is_read_only,
      true AS supports_reschedule,
      true AS supports_complete,
      (coalesce(rc.base_metadata, '{}'::jsonb) || jsonb_build_object(
        'event_id', rc.event_id,
        'occurrence_key', public.calendar_occurrence_key(rc.event_id, rc.o_start),
        'is_recurring', true,
        'original_start_at', rc.o_start,
        'override_id', rc.ov_id,
        'series_frequency', rc.series_frequency::text
      )) AS metadata
    FROM recurring_core rc
  ),
  payable_bills_projection AS (
    SELECT
      'derived_projection'::text AS agenda_item_type,
      'payable_bill'::text AS origin_type,
      pb.id AS origin_id,
      ('pb:' || pb.id::text || ':' || pb.due_date::text)::text AS dedup_key,
      (pb.due_date::text || 'T00:00:00-03:00')::timestamptz AS display_start_at,
      (pb.due_date::text || 'T23:59:59-03:00')::timestamptz AS display_end_at,
      pb.description AS title,
      CASE
        WHEN pb.status = 'overdue' THEN 'Vencida'
        WHEN pb.status = 'pending' THEN 'Pendente'
        WHEN pb.status = 'paid' THEN 'Paga'
        ELSE pb.status::text
      END AS subtitle,
      pb.status::text AS status,
      'bill'::text AS badge,
      ('/bills/' || pb.id::text) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('amount', pb.amount, 'provider_name', pb.provider_name) AS metadata
    FROM public.payable_bills pb
    WHERE pb.user_id = p_user_id
      AND pb.due_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date
      AND pb.due_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  bill_reminders_projection AS (
    SELECT
      'derived_projection'::text AS agenda_item_type,
      'bill_reminder'::text AS origin_type,
      br.id AS origin_id,
      ('br:' || br.bill_id::text || ':' || br.reminder_date::text)::text AS dedup_key,
      (br.reminder_date::text || 'T' || br.reminder_time::text || '-03:00')::timestamptz AS display_start_at,
      (br.reminder_date::text || 'T' || br.reminder_time::text || '-03:00')::timestamptz AS display_end_at,
      ('Lembrete: ' || pb.description) AS title,
      br.channel AS subtitle,
      br.status::text AS status,
      'bill_reminder'::text AS badge,
      ('/bills/' || br.bill_id::text) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('days_before', br.days_before, 'bill_amount', pb.amount) AS metadata
    FROM public.bill_reminders br
    JOIN public.payable_bills pb ON pb.id = br.bill_id
    WHERE br.user_id = p_user_id
      AND br.reminder_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date
      AND br.reminder_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::date
      AND NOT EXISTS (
        SELECT 1 FROM public.payable_bills pb2
        WHERE pb2.id = br.bill_id
          AND pb2.user_id = p_user_id
          AND pb2.due_date = br.reminder_date
      )
  ),
  financial_cycles_projection AS (
    SELECT
      'derived_projection'::text AS agenda_item_type,
      'financial_cycle'::text AS origin_type,
      fc.id AS origin_id,
      ('fc:' || fc.id::text || ':' || to_char(
        make_date(
          EXTRACT(YEAR FROM p_from)::int,
          EXTRACT(MONTH FROM p_from)::int,
          LEAST(fc.day, 28)
        ),
        'YYYY-MM-DD'
      ))::text AS dedup_key,
      make_date(
        EXTRACT(YEAR FROM p_from)::int,
        EXTRACT(MONTH FROM p_from)::int,
        LEAST(fc.day, 28)
      )::timestamptz AS display_start_at,
      make_date(
        EXTRACT(YEAR FROM p_from)::int,
        EXTRACT(MONTH FROM p_from)::int,
        LEAST(fc.day, 28)
      )::timestamptz AS display_end_at,
      fc.name AS title,
      fc.type AS subtitle,
      CASE WHEN fc.active THEN 'active' ELSE 'inactive' END AS status,
      'cycle'::text AS badge,
      ('/settings/cycles/' || fc.id::text) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('cycle_type', fc.type, 'icon', fc.icon, 'color', fc.color) AS metadata
    FROM public.financial_cycles fc
    WHERE fc.user_id = p_user_id
      AND fc.active = true
      AND make_date(
        EXTRACT(YEAR FROM p_from)::int,
        EXTRACT(MONTH FROM p_from)::int,
        LEAST(fc.day, 28)
      ) BETWEEN (p_from AT TIME ZONE 'America/Sao_Paulo')::date
            AND (p_to AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  unioned AS (
    SELECT * FROM canonical_simple
    UNION ALL
    SELECT * FROM canonical_recurring
    UNION ALL
    SELECT * FROM payable_bills_projection
    UNION ALL
    SELECT * FROM bill_reminders_projection
    UNION ALL
    SELECT * FROM financial_cycles_projection
  )
  SELECT * FROM unioned u
  ORDER BY u.display_start_at ASC;
END;
$$;
COMMENT ON FUNCTION public.get_agenda_window(uuid, timestamptz, timestamptz) IS
  'Unified agenda window: simple canonical events, recurring occurrences (daily/weekly/monthly), financial projections.';
COMMIT;
