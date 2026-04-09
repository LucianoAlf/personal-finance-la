-- Semantic surface for Agenda V1 reminders: replaces direct writes to
-- calendar_event_reminders / calendar_reminder_schedule from callers.
--
-- V1 contract (p_reminders JSON array):
--   - Each element: { "remind_offset_minutes": int (>=0), "enabled"?: bool (default true),
--     "reminder_kind"?: "default"|"prep"|"deadline" (default "default") }
--   - Channel is always whatsapp on calendar_reminder_schedule (V1).
--   - Empty array [] clears all reminders for the event (and cascades schedule rows).
--
-- Idempotency: if the enabled (kind, offset) multiset is unchanged, no-op (no delete/insert).
--
-- Trade-off (V1): replacing reminders deletes existing calendar_event_reminders rows for the
-- event; ON DELETE CASCADE removes all related calendar_reminder_schedule rows, including
-- historical delivered rows. Audit of past sends remains outside this table (e.g. messaging
-- logs). Pending/failed rows are always cleared together with the reminder definition.

BEGIN;
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
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

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
COMMENT ON FUNCTION public.set_calendar_event_reminders(uuid, jsonb, uuid) IS
  'V1 semantic replace for event reminders (whatsapp schedule rows). Pass [] to clear. Idempotent when specification unchanged. See migration comment for schedule-history trade-off.';
GRANT EXECUTE ON FUNCTION public.set_calendar_event_reminders(uuid, jsonb, uuid) TO authenticated;
COMMIT;
