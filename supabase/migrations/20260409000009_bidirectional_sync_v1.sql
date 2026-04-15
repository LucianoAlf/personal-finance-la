-- Bidirectional calendar sync V1: schema extensions (enums, links, jobs, integration_configs, payable_bills.source).
-- Relocated from 20260408225941_bidirectional_sync_v1.sql (must run after calendar domain types/tables).

BEGIN;

-- ============================================
-- ENUM extensions (idempotent)
-- ============================================

ALTER TYPE public.calendar_sync_direction ADD VALUE IF NOT EXISTS 'inbound';
ALTER TYPE public.calendar_sync_direction ADD VALUE IF NOT EXISTS 'bidirectional';

ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'inbound_upsert';
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'inbound_delete';
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'inbound_financial_routed';
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'conflict_detected';

ALTER TYPE public.calendar_event_source ADD VALUE IF NOT EXISTS 'external';

-- ============================================
-- payable_bills: explicit provenance (not JSON metadata)
-- ============================================

ALTER TABLE public.payable_bills
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.payable_bills.source IS
  'Origin of the bill row: manual (UI entry), whatsapp (assistant), external_import (inbound sync or external calendar/finance import).';

-- ============================================
-- calendar_sync_jobs
-- ============================================

ALTER TABLE public.calendar_sync_jobs
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Audit / inbound-only rows (e.g. inbound_financial_routed, origin-only inbound_delete) have no calendar event.
ALTER TABLE public.calendar_sync_jobs
  ALTER COLUMN event_id DROP NOT NULL;

COMMENT ON COLUMN public.calendar_sync_jobs.event_id IS
  'Canonical calendar event when applicable; NULL for audit-only inbound jobs (financial routing, origin-only deletes, etc.). FK still enforces referential integrity when set.';

-- ============================================
-- integration_configs: inbound sync state
-- ============================================

ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS last_inbound_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inbound_sync_cursor TEXT,
  ADD COLUMN IF NOT EXISTS ticktick_default_list_mappings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================
-- calendar_external_event_links
-- ============================================

ALTER TABLE public.calendar_external_event_links
  ADD COLUMN IF NOT EXISTS last_remote_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS origin_type TEXT,
  ADD COLUMN IF NOT EXISTS origin_id UUID;

ALTER TABLE public.calendar_external_event_links
  ALTER COLUMN event_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.calendar_external_event_links'::regclass
      AND c.conname = 'calendar_external_event_links_event_xor_origin_chk'
  ) THEN
    ALTER TABLE public.calendar_external_event_links
      ADD CONSTRAINT calendar_external_event_links_event_xor_origin_chk
      CHECK (
        (event_id IS NOT NULL AND origin_id IS NULL)
        OR (event_id IS NULL AND origin_id IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_calendar_external_event_links_origin
  ON public.calendar_external_event_links (origin_type, origin_id)
  WHERE origin_id IS NOT NULL;

COMMIT;
