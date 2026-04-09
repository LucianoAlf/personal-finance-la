BEGIN;

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
  v_old_status calendar_event_status;
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

  SELECT e.status INTO v_old_status
  FROM public.calendar_events e
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN;
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

  IF p_new_status = 'cancelled' THEN
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
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_calendar_event_status(uuid, calendar_event_status, uuid) IS
  'Sets event status (completed/cancelled), skips pending reminders, enqueues TickTick delete_event on cancel (idempotent job key).';

COMMENT ON COLUMN public.integration_configs.ticktick_api_key_encrypted IS
  'Token TickTick: legado em texto operacional, ou prefixo enc1: (AES-256-GCM) quando INTEGRATION_SECRETS_KEY está definida na Edge Function calendar-sync-ticktick.';

COMMIT;;
