-- Remote smoke: bidirectional sync V1 schema + data contract.
-- Run: npx supabase db query --linked -f scripts/smoke-bidirectional-sync.sql
-- Uses a transaction with ROLLBACK so no permanent data is left behind.

BEGIN;

DO $$
DECLARE
  v_user uuid;
  v_event_id uuid;
  v_bill_id uuid;
  v_count int;
  v_has_event_link boolean;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: no auth.users row';
  END IF;

  -- 1. Verify enum expansions exist.
  PERFORM 1
  FROM unnest(enum_range(NULL::calendar_sync_direction)) AS d
  WHERE d::text = 'inbound';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: missing calendar_sync_direction=inbound';
  END IF;

  PERFORM 1
  FROM unnest(enum_range(NULL::calendar_sync_direction)) AS d
  WHERE d::text = 'bidirectional';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: missing calendar_sync_direction=bidirectional';
  END IF;

  PERFORM 1
  FROM unnest(enum_range(NULL::calendar_sync_job_type)) AS j
  WHERE j::text = 'inbound_upsert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: missing calendar_sync_job_type=inbound_upsert';
  END IF;

  PERFORM 1
  FROM unnest(enum_range(NULL::calendar_sync_job_type)) AS j
  WHERE j::text = 'inbound_financial_routed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: missing calendar_sync_job_type=inbound_financial_routed';
  END IF;

  PERFORM 1
  FROM unnest(enum_range(NULL::calendar_event_source)) AS s
  WHERE s::text = 'external';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: missing calendar_event_source=external';
  END IF;

  -- 2. Verify key schema additions exist.
  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'payable_bills'
    AND column_name = 'source';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: payable_bills.source missing';
  END IF;

  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'calendar_external_event_links'
    AND column_name = 'origin_type';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: calendar_external_event_links.origin_type missing';
  END IF;

  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'calendar_external_event_links'
    AND column_name = 'origin_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: calendar_external_event_links.origin_id missing';
  END IF;

  PERFORM 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'calendar_external_event_links'
    AND column_name = 'last_remote_updated_at';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: calendar_external_event_links.last_remote_updated_at missing';
  END IF;

  -- 3. Canonical agenda item + bidirectional link path.
  INSERT INTO public.calendar_events (
    user_id,
    title,
    start_at,
    end_at,
    source,
    created_by,
    event_kind,
    sync_eligible
  ) VALUES (
    v_user,
    'smoke-bidirectional-event',
    now() + interval '2 days',
    now() + interval '2 days 1 hour',
    'external',
    'system',
    'personal',
    true
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.calendar_external_event_links (
    event_id,
    provider,
    external_object_id,
    external_list_id,
    sync_direction,
    sync_status,
    last_synced_at,
    last_remote_updated_at
  ) VALUES (
    v_event_id,
    'ticktick',
    'smoke-ext-event-001',
    'smoke-project',
    'bidirectional',
    'synced',
    now(),
    now()
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_external_event_links
    WHERE event_id = v_event_id
      AND provider = 'ticktick'
      AND external_object_id = 'smoke-ext-event-001'
  ) INTO v_has_event_link;

  IF NOT v_has_event_link THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: canonical event link missing';
  END IF;

  -- 4. Financial inbound path via origin_id.
  INSERT INTO public.payable_bills (
    user_id,
    description,
    due_date,
    bill_type,
    source,
    status,
    is_recurring
  ) VALUES (
    v_user,
    'smoke-financial-import',
    (now() + interval '5 days')::date,
    'other',
    'external_import',
    'pending',
    false
  )
  RETURNING id INTO v_bill_id;

  INSERT INTO public.calendar_external_event_links (
    event_id,
    origin_type,
    origin_id,
    provider,
    external_object_id,
    external_list_id,
    sync_direction,
    sync_status,
    last_synced_at,
    last_remote_updated_at
  ) VALUES (
    NULL,
    'payable_bill',
    v_bill_id,
    'ticktick',
    'smoke-ext-bill-001',
    'smoke-project',
    'inbound',
    'synced',
    now(),
    now()
  );

  SELECT count(*) INTO v_count
  FROM public.calendar_external_event_links
  WHERE origin_type = 'payable_bill'
    AND origin_id = v_bill_id
    AND external_object_id = 'smoke-ext-bill-001';

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: origin-only financial link missing, got %', v_count;
  END IF;

  -- 5. remote_deleted should not delete canonical local data.
  UPDATE public.calendar_external_event_links
  SET sync_status = 'remote_deleted',
      last_synced_at = now()
  WHERE event_id = v_event_id
    AND external_object_id = 'smoke-ext-event-001';

  SELECT count(*) INTO v_count
  FROM public.calendar_events
  WHERE id = v_event_id
    AND deleted_at IS NULL;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: canonical event was deleted after remote_deleted, got %', v_count;
  END IF;

  -- 6. Agenda window still returns the canonical event and imported bill projection.
  SELECT count(*) INTO v_count
  FROM public.get_agenda_window(v_user, now(), now() + interval '10 days') aw
  WHERE aw.origin_type = 'calendar_event'
    AND aw.origin_id = v_event_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: canonical event missing from get_agenda_window';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.get_agenda_window(v_user, now(), now() + interval '10 days') aw
  WHERE aw.origin_type = 'payable_bill'
    AND aw.origin_id = v_bill_id;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'smoke_bidirectional_sync: imported payable_bill missing from get_agenda_window';
  END IF;
END $$;

ROLLBACK;

SELECT 'smoke-bidirectional-sync: ALL PASSED' AS result;
