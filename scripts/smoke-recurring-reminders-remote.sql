-- Remote smoke: Task 6 recurring reminders (override-aware schedule + RPC hooks).
-- Run: npx supabase db query --linked -f scripts/smoke-recurring-reminders-remote.sql
-- Uses one auth user, builds a daily series, asserts schedule/remap/cancel; then ROLLBACK.

BEGIN;

DO $$
DECLARE
  v_user uuid;
  v_event uuid;
  v_occ1 timestamptz;
  v_occ2 timestamptz;
  v_key1 text;
  v_cnt int;
  v_fire_before timestamptz;
  v_fire_after timestamptz;
  v_key2 text;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: no auth.users row';
  END IF;

  INSERT INTO public.calendar_events (
    user_id,
    title,
    start_at,
    end_at,
    timezone,
    status,
    source,
    created_by,
    event_kind,
    sync_eligible
  ) VALUES (
    v_user,
    'smoke-recurring-reminders',
    (timezone('America/Sao_Paulo', now())::date + interval '2 days' + time '10:00') AT TIME ZONE 'America/Sao_Paulo',
    (timezone('America/Sao_Paulo', now())::date + interval '2 days' + time '11:00') AT TIME ZONE 'America/Sao_Paulo',
    'America/Sao_Paulo',
    'scheduled',
    'internal',
    'user',
    'personal',
    true
  )
  RETURNING id INTO v_event;

  INSERT INTO public.calendar_event_recurrence_rules (
    event_id,
    frequency,
    interval_value,
    starts_at,
    timezone
  ) VALUES (
    v_event,
    'daily',
    1,
    (timezone('America/Sao_Paulo', now())::date + interval '2 days' + time '10:00') AT TIME ZONE 'America/Sao_Paulo',
    'America/Sao_Paulo'
  );

  PERFORM public.set_calendar_event_reminders(
    v_event,
    '[{"remind_offset_minutes": 30, "enabled": true, "reminder_kind": "default"}]'::jsonb,
    v_user
  );

  SELECT count(*) INTO v_cnt
  FROM public.calendar_reminder_schedule crs
  JOIN public.calendar_event_reminders cer ON cer.id = crs.reminder_id
  WHERE cer.event_id = v_event
    AND crs.delivery_status = 'pending';

  IF v_cnt < 1 THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: expected at least one pending schedule row, got %', v_cnt;
  END IF;

  SELECT original_start_at INTO v_occ1
  FROM public.calendar_recurrence_expand_occurrences(
    v_event,
    clock_timestamp(),
    clock_timestamp() + interval '120 days'
  )
  ORDER BY original_start_at
  LIMIT 1;

  IF v_occ1 IS NULL THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: no expanded occurrence';
  END IF;

  v_key1 := public.calendar_occurrence_key(v_event, v_occ1);

  SELECT crs.fire_at INTO v_fire_before
  FROM public.calendar_reminder_schedule crs
  JOIN public.calendar_event_reminders cer ON cer.id = crs.reminder_id
  WHERE cer.event_id = v_event
    AND crs.occurrence_key = v_key1
    AND crs.delivery_status = 'pending'
  LIMIT 1;

  IF v_fire_before IS NULL THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: no pending row for first occurrence_key';
  END IF;

  PERFORM public.reschedule_calendar_occurrence(
    v_event,
    v_occ1,
    v_occ1 + interval '3 hours',
    v_occ1 + interval '4 hours',
    NULL,
    NULL,
    v_user
  );

  SELECT crs.fire_at INTO v_fire_after
  FROM public.calendar_reminder_schedule crs
  JOIN public.calendar_event_reminders cer ON cer.id = crs.reminder_id
  WHERE cer.event_id = v_event
    AND crs.occurrence_key = v_key1
    AND crs.delivery_status = 'pending'
  LIMIT 1;

  IF v_fire_after IS NULL THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: missing schedule row after reschedule';
  END IF;

  IF v_fire_after = v_fire_before THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: fire_at unchanged after reschedule (before %, after %)', v_fire_before, v_fire_after;
  END IF;

  SELECT original_start_at INTO v_occ2
  FROM public.calendar_recurrence_expand_occurrences(
    v_event,
    clock_timestamp(),
    clock_timestamp() + interval '120 days'
  )
  WHERE original_start_at > v_occ1
  ORDER BY original_start_at
  LIMIT 1;

  IF v_occ2 IS NULL THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: no second occurrence';
  END IF;

  v_key2 := public.calendar_occurrence_key(v_event, v_occ2);

  PERFORM public.cancel_calendar_occurrence(v_event, v_occ2, v_user);

  SELECT count(*) INTO v_cnt
  FROM public.calendar_reminder_schedule crs
  JOIN public.calendar_event_reminders cer ON cer.id = crs.reminder_id
  WHERE cer.event_id = v_event
    AND crs.occurrence_key = v_key2
    AND crs.delivery_status = 'pending';

  IF v_cnt <> 0 THEN
    RAISE EXCEPTION 'smoke_recurring_reminders: expected no pending rows for cancelled occurrence, got %', v_cnt;
  END IF;

  RAISE NOTICE 'smoke_recurring_reminders: OK (event %)', v_event;
END $$;

ROLLBACK;
