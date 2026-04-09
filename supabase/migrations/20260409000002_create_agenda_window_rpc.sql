-- Migration: Create get_agenda_window RPC
-- Unified read model combining canonical events and derived financial projections
-- Spec: docs/superpowers/specs/2026-04-08-calendar-agenda-v1-design.md (section 6)
--
-- Deduplication rules:
-- - payable_bills suppress bill_reminders for the same bill_id and date
-- - financial_cycles never collide with bills (distinct dedup_key namespace)
-- - Canonical events have their own dedup_key namespace (ce:...)

CREATE OR REPLACE FUNCTION public.get_agenda_window(
  p_user_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  agenda_item_type TEXT,
  origin_type TEXT,
  origin_id UUID,
  dedup_key TEXT,
  display_start_at TIMESTAMPTZ,
  display_end_at TIMESTAMPTZ,
  title TEXT,
  subtitle TEXT,
  status TEXT,
  badge TEXT,
  edit_route TEXT,
  is_read_only BOOLEAN,
  supports_reschedule BOOLEAN,
  supports_complete BOOLEAN,
  metadata JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH canonical_events AS (
    SELECT
      'canonical_event'::TEXT AS agenda_item_type,
      'calendar_event'::TEXT AS origin_type,
      ce.id AS origin_id,
      ('ce:' || ce.id::TEXT)::TEXT AS dedup_key,
      ce.start_at AS display_start_at,
      ce.end_at AS display_end_at,
      ce.title,
      ce.description AS subtitle,
      ce.status::TEXT AS status,
      ce.event_kind AS badge,
      ('/calendar/events/' || ce.id::TEXT) AS edit_route,
      false AS is_read_only,
      true AS supports_reschedule,
      true AS supports_complete,
      ce.metadata
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

  payable_bills_projection AS (
    SELECT
      'derived_projection'::TEXT AS agenda_item_type,
      'payable_bill'::TEXT AS origin_type,
      pb.id AS origin_id,
      ('pb:' || pb.id::TEXT || ':' || pb.due_date::TEXT)::TEXT AS dedup_key,
      (pb.due_date::TEXT || 'T00:00:00-03:00')::TIMESTAMPTZ AS display_start_at,
      (pb.due_date::TEXT || 'T23:59:59-03:00')::TIMESTAMPTZ AS display_end_at,
      pb.description AS title,
      CASE
        WHEN pb.status = 'overdue' THEN 'Vencida'
        WHEN pb.status = 'pending' THEN 'Pendente'
        WHEN pb.status = 'paid' THEN 'Paga'
        ELSE pb.status
      END AS subtitle,
      pb.status::TEXT AS status,
      'bill'::TEXT AS badge,
      ('/bills/' || pb.id::TEXT) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('amount', pb.amount, 'provider_name', pb.provider_name) AS metadata
    FROM public.payable_bills pb
    WHERE pb.user_id = p_user_id
      AND pb.due_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::DATE
      AND pb.due_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::DATE
  ),

  -- Suppress bill_reminders where a payable_bill exists for the same bill_id and same date
  bill_reminders_projection AS (
    SELECT
      'derived_projection'::TEXT AS agenda_item_type,
      'bill_reminder'::TEXT AS origin_type,
      br.id AS origin_id,
      ('br:' || br.bill_id::TEXT || ':' || br.reminder_date::TEXT)::TEXT AS dedup_key,
      (br.reminder_date::TEXT || 'T' || br.reminder_time::TEXT || '-03:00')::TIMESTAMPTZ AS display_start_at,
      (br.reminder_date::TEXT || 'T' || br.reminder_time::TEXT || '-03:00')::TIMESTAMPTZ AS display_end_at,
      ('Lembrete: ' || pb.description) AS title,
      br.channel AS subtitle,
      br.status::TEXT AS status,
      'bill_reminder'::TEXT AS badge,
      ('/bills/' || br.bill_id::TEXT) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('days_before', br.days_before, 'bill_amount', pb.amount) AS metadata
    FROM public.bill_reminders br
    JOIN public.payable_bills pb ON pb.id = br.bill_id
    WHERE br.user_id = p_user_id
      AND br.reminder_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::DATE
      AND br.reminder_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::DATE
      AND NOT EXISTS (
        SELECT 1 FROM public.payable_bills pb2
        WHERE pb2.id = br.bill_id
          AND pb2.user_id = p_user_id
          AND pb2.due_date = br.reminder_date
      )
  ),

  financial_cycles_projection AS (
    SELECT
      'derived_projection'::TEXT AS agenda_item_type,
      'financial_cycle'::TEXT AS origin_type,
      fc.id AS origin_id,
      ('fc:' || fc.id::TEXT || ':' || to_char(
        make_date(
          EXTRACT(YEAR FROM p_from)::INT,
          EXTRACT(MONTH FROM p_from)::INT,
          LEAST(fc.day, 28)
        ), 'YYYY-MM-DD'
      ))::TEXT AS dedup_key,
      make_date(
        EXTRACT(YEAR FROM p_from)::INT,
        EXTRACT(MONTH FROM p_from)::INT,
        LEAST(fc.day, 28)
      )::TIMESTAMPTZ AS display_start_at,
      make_date(
        EXTRACT(YEAR FROM p_from)::INT,
        EXTRACT(MONTH FROM p_from)::INT,
        LEAST(fc.day, 28)
      )::TIMESTAMPTZ AS display_end_at,
      fc.name AS title,
      fc.type AS subtitle,
      CASE WHEN fc.active THEN 'active' ELSE 'inactive' END AS status,
      'cycle'::TEXT AS badge,
      ('/settings/cycles/' || fc.id::TEXT) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('cycle_type', fc.type, 'icon', fc.icon, 'color', fc.color) AS metadata
    FROM public.financial_cycles fc
    WHERE fc.user_id = p_user_id
      AND fc.active = true
      AND make_date(
        EXTRACT(YEAR FROM p_from)::INT,
        EXTRACT(MONTH FROM p_from)::INT,
        LEAST(fc.day, 28)
      ) BETWEEN (p_from AT TIME ZONE 'America/Sao_Paulo')::DATE
            AND (p_to AT TIME ZONE 'America/Sao_Paulo')::DATE
  )

  SELECT * FROM canonical_events
  UNION ALL
  SELECT * FROM payable_bills_projection
  UNION ALL
  SELECT * FROM bill_reminders_projection
  UNION ALL
  SELECT * FROM financial_cycles_projection
  ORDER BY display_start_at ASC;
$$;
COMMENT ON FUNCTION public.get_agenda_window IS 'Unified agenda window: canonical events + derived financial projections with deduplication';
