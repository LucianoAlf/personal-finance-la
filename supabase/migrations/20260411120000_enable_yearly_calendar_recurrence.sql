BEGIN;

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
  v_anchor_year int;
  v_anchor_month_num int;
  v_year_diff int;
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

  IF r.frequency = 'yearly' THEN
    v_anchor_year := EXTRACT(YEAR FROM v_anchor_local_date)::int;
    v_anchor_month_num := EXTRACT(MONTH FROM v_anchor_local_date)::int;
    v_effective_monthday := EXTRACT(DAY FROM v_anchor_local_date)::int;
    v_y := greatest(v_anchor_year, EXTRACT(YEAR FROM (p_from AT TIME ZONE v_tz)::date)::int);

    WHILE make_date(v_y, v_anchor_month_num, 1) <= v_dmax + 370 LOOP
      v_year_diff := v_y - v_anchor_year;
      IF v_year_diff >= 0 AND v_year_diff % r.interval_value = 0 THEN
        v_last_dom := EXTRACT(
          DAY FROM ((make_date(v_y, v_anchor_month_num, 1) + interval '1 month - 1 day')::date)
        )::int;
        IF v_effective_monthday <= v_last_dom THEN
          v_ts := timezone(
            v_tz,
            (make_date(v_y, v_anchor_month_num, v_effective_monthday)::timestamp + v_local_time)
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

      v_y := v_y + 1;
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
  'Materialize recurring occurrences for one event within [p_from, p_to). Supports daily, weekly, monthly, and yearly rules.';

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
  v_sync_idempotency_key text;
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
    v_sig_old := CASE
      WHEN v_rule_exists THEN public._calendar_recurrence_rule_signature(
        r_existing.frequency,
        r_existing.interval_value,
        r_existing.by_weekday,
        r_existing.by_monthday,
        r_existing.starts_at,
        r_existing.until_at,
        r_existing.count_limit,
        r_existing.timezone
      )
      ELSE 'clear'
    END;

    IF v_has_overrides AND NOT p_confirm_drop_overrides THEN
      RAISE EXCEPTION 'occurrence_overrides_block_structural_change';
    END IF;
    IF v_has_overrides AND p_confirm_drop_overrides THEN
      DELETE FROM public.calendar_event_occurrence_overrides WHERE event_id = p_event_id;
    END IF;
    DELETE FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;

    v_sync_idempotency_key := 'sync:' || p_event_id::text || ':upsert_event:recurrence:clear:' || v_sig_old;
    INSERT INTO public.calendar_sync_jobs (
      user_id,
      event_id,
      provider,
      job_type,
      idempotency_key,
      status
    ) VALUES (
      v_owner_uid,
      p_event_id,
      'ticktick',
      'upsert_event',
      v_sync_idempotency_key,
      'pending'
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      status = 'pending',
      updated_at = now(),
      last_error = NULL;
    RETURN;
  END IF;

  IF p_frequency IS NULL THEN
    RAISE EXCEPTION 'frequency_required';
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

  v_sync_idempotency_key := 'sync:' || p_event_id::text || ':upsert_event:recurrence:' || v_sig_new;
  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    p_event_id,
    'ticktick',
    'upsert_event',
    v_sync_idempotency_key,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    status = 'pending',
    updated_at = now(),
    last_error = NULL;
END;
$$;

COMMENT ON FUNCTION public.set_calendar_event_recurrence IS
  'Upsert or remove recurrence rule; conservative blocks when overrides/reminders exist unless explicit confirm flags. Supports daily, weekly, monthly, and yearly.';

COMMIT;
