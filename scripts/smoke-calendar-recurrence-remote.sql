-- One-shot remote smoke: recurrence + agenda window + reschedule + cancel + cleanup.
-- Remote smoke (run with: supabase db query --linked -f scripts/smoke-calendar-recurrence-remote.sql)
-- Picks the oldest auth.users row as test subject. Safe cleanup by title.

BEGIN;

CREATE TEMP TABLE IF NOT EXISTS _smoke_cal_rec (
  step text PRIMARY KEY,
  detail jsonb NOT NULL
);

DO $$
DECLARE
  v_user uuid;
  v_event uuid;
  v_from timestamptz := '2026-04-10 00:00:00-03:00'::timestamptz;
  v_to   timestamptz := '2026-04-17 00:00:00-03:00'::timestamptz;
  v_occ0 timestamptz := '2026-04-10 13:00:00-03:00'::timestamptz;
  v_occ1 timestamptz := '2026-04-11 13:00:00-03:00'::timestamptz;
  v_occ2 timestamptz := '2026-04-12 13:00:00-03:00'::timestamptz;
  n1 int;
  n2 int;
  n3 int;
  n4 int;
  row1 record;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'smoke: no auth.users row';
  END IF;

  -- Cleanup any previous aborted run
  DELETE FROM public.calendar_event_occurrence_overrides o
  USING public.calendar_events e
  WHERE o.event_id = e.id AND e.user_id = v_user AND e.title = '[SMOKE CAL REC] daily series';
  DELETE FROM public.calendar_sync_jobs j
  USING public.calendar_events e
  WHERE j.event_id = e.id AND e.user_id = v_user AND e.title = '[SMOKE CAL REC] daily series';
  DELETE FROM public.calendar_event_recurrence_rules r
  USING public.calendar_events e
  WHERE r.event_id = e.id AND e.user_id = v_user AND e.title = '[SMOKE CAL REC] daily series';
  DELETE FROM public.calendar_events
  WHERE user_id = v_user AND title = '[SMOKE CAL REC] daily series';

  INSERT INTO public.calendar_events (
    user_id, title, description,
    start_at, end_at, all_day, timezone,
    status, source, created_by, sync_eligible
  ) VALUES (
    v_user,
    '[SMOKE CAL REC] daily series',
    'Remote smoke — safe to delete',
    v_occ0,
    v_occ0 + interval '1 hour',
    false,
    'America/Sao_Paulo',
    'scheduled',
    'internal',
    'system',
    false
  )
  RETURNING id INTO v_event;

  INSERT INTO _smoke_cal_rec VALUES ('1_event_created', jsonb_build_object('event_id', v_event));

  PERFORM public.set_calendar_event_recurrence(
    v_event,
    false,
    'daily'::public.calendar_recurrence_frequency,
    1,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    false,
    v_user
  );

  INSERT INTO _smoke_cal_rec VALUES ('2_recurrence_applied', jsonb_build_object('event_id', v_event));

  SELECT count(*) INTO n1
  FROM public.get_agenda_window(v_user, v_from, v_to) g
  WHERE g.origin_id = v_event
    AND g.metadata->>'is_recurring' = 'true';

  INSERT INTO _smoke_cal_rec VALUES ('3_agenda_recurring_count', jsonb_build_object('count', n1, 'p_from', v_from, 'p_to', v_to));

  SELECT g.dedup_key, g.display_start_at, g.metadata->>'occurrence_key' AS occ_key,
         g.metadata->>'original_start_at' AS orig
  INTO row1
  FROM public.get_agenda_window(v_user, v_from, v_to) g
  WHERE g.origin_id = v_event
    AND (g.metadata->>'original_start_at')::timestamptz = v_occ1
  LIMIT 1;

  INSERT INTO _smoke_cal_rec VALUES ('3b_sample_occurrence_apr11', to_jsonb(row1));

  PERFORM public.reschedule_calendar_occurrence(
    v_event,
    v_occ1,
    v_occ1 + interval '5 hours',
    v_occ1 + interval '6 hours',
    NULL,
    NULL,
    v_user
  );

  SELECT count(*) INTO n2
  FROM public.get_agenda_window(v_user, v_from, v_to) g
  WHERE g.origin_id = v_event
    AND g.metadata->>'is_recurring' = 'true';

  SELECT g.display_start_at, g.metadata->>'original_start_at' AS orig
  INTO row1
  FROM public.get_agenda_window(v_user, v_from, v_to) g
  WHERE g.origin_id = v_event
    AND (g.metadata->>'original_start_at')::timestamptz = v_occ1
  LIMIT 1;

  INSERT INTO _smoke_cal_rec VALUES ('4_after_reschedule', jsonb_build_object(
    'recurring_rows_in_window', n2,
    'apr11_display_start', row1.display_start_at,
    'apr11_original_start', row1.orig
  ));

  PERFORM public.cancel_calendar_occurrence(v_event, v_occ2, v_user);

  SELECT count(*) INTO n3
  FROM public.get_agenda_window(v_user, v_from, v_to) g
  WHERE g.origin_id = v_event
    AND g.metadata->>'is_recurring' = 'true';

  SELECT count(*) INTO n4
  FROM public.get_agenda_window(v_user, v_from, v_to) g
  WHERE g.origin_id = v_event
    AND g.metadata->>'is_recurring' = 'true'
    AND (g.metadata->>'original_start_at')::timestamptz = v_occ2;

  INSERT INTO _smoke_cal_rec VALUES ('5_after_cancel', jsonb_build_object(
    'recurring_rows_in_window', n3,
    'rows_with_original_apr12', n4
  ));

  DELETE FROM public.calendar_event_occurrence_overrides WHERE event_id = v_event;
  DELETE FROM public.calendar_sync_jobs WHERE event_id = v_event;
  DELETE FROM public.calendar_event_recurrence_rules WHERE event_id = v_event;
  DELETE FROM public.calendar_events WHERE id = v_event;

  INSERT INTO _smoke_cal_rec VALUES ('6_cleanup', jsonb_build_object('removed_event_id', v_event));
END $$;

SELECT step, detail FROM _smoke_cal_rec ORDER BY step;

COMMIT;
