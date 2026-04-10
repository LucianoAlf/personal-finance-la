BEGIN;

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
  WITH external_link_snapshot AS (
    SELECT DISTINCT ON (l.event_id)
      l.event_id,
      l.provider,
      l.sync_status,
      l.last_synced_at,
      l.last_remote_updated_at
    FROM public.calendar_external_event_links l
    WHERE l.event_id IS NOT NULL
    ORDER BY l.event_id, l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
  ),
  canonical_simple AS (
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
      (
        coalesce(ce.metadata, '{}'::jsonb) ||
        jsonb_strip_nulls(
          jsonb_build_object(
            'event_id', ce.id,
            'is_recurring', false,
            'sync_provider', els.provider,
            'sync_status', els.sync_status,
            'sync_last_synced_at', els.last_synced_at,
            'sync_last_remote_updated_at', els.last_remote_updated_at
          )
        )
      ) AS metadata
    FROM public.calendar_events ce
    LEFT JOIN external_link_snapshot els ON els.event_id = ce.id
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
      o.description_override,
      els.provider AS sync_provider,
      els.sync_status AS sync_status,
      els.last_synced_at AS sync_last_synced_at,
      els.last_remote_updated_at AS sync_last_remote_updated_at
    FROM public.calendar_events ce
    INNER JOIN public.calendar_event_recurrence_rules r ON r.event_id = ce.id
    INNER JOIN LATERAL public.calendar_recurrence_expand_occurrences(ce.id, p_from, p_to) AS occ
      ON true
    LEFT JOIN public.calendar_event_occurrence_overrides o
      ON o.event_id = ce.id
      AND o.occurrence_key = public.calendar_occurrence_key(ce.id, occ.original_start_at)
    LEFT JOIN external_link_snapshot els ON els.event_id = ce.id
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
      (
        coalesce(rc.base_metadata, '{}'::jsonb) ||
        jsonb_strip_nulls(
          jsonb_build_object(
            'event_id', rc.event_id,
            'occurrence_key', public.calendar_occurrence_key(rc.event_id, rc.o_start),
            'is_recurring', true,
            'original_start_at', rc.o_start,
            'override_id', rc.ov_id,
            'series_frequency', rc.series_frequency::text,
            'sync_provider', rc.sync_provider,
            'sync_status', rc.sync_status,
            'sync_last_synced_at', rc.sync_last_synced_at,
            'sync_last_remote_updated_at', rc.sync_last_remote_updated_at
          )
        )
      ) AS metadata
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
      ('/contas-pagar?highlight=' || pb.id::text) AS edit_route,
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
      ('/contas-pagar?highlight=' || br.bill_id::text) AS edit_route,
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
  'Unified agenda window: simple canonical events, recurring occurrences (daily/weekly/monthly), financial projections, enriched with latest external sync metadata when available.';

COMMIT;
