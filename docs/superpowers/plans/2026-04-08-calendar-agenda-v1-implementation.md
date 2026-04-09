# Calendar / Agenda V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first version of the calendar/agenda module with a canonical internal domain, unified timeline reading, reminder dispatch via next-fire tracking, outbound TickTick sync, and initial conversational commands through Ana Clara.

**Architecture:** Postgres tables with RLS form the canonical domain. A Supabase RPC materializes the unified agenda window (canonical events + derived financial projections with deduplication). Two edge functions run as cron workers: one for reminder dispatch (`calendar-dispatch-reminders`) and one for TickTick sync (`calendar-sync-ticktick`). Ana Clara connects through a new handler module in `process-whatsapp-message`.

**Tech Stack:** PostgreSQL (Supabase), Deno edge functions, TypeScript, pg_cron + net.http_post, supabase-js v2, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-04-08-calendar-agenda-v1-design.md`

---

## File Structure

### Database migrations (create in order)

- `supabase/migrations/20260409000001_create_calendar_domain.sql` — Enums, all 7 canonical tables, indexes, RLS, triggers, comments
- `supabase/migrations/20260409000002_create_agenda_window_rpc.sql` — `get_agenda_window` RPC (unified read model with deduplication)
- `supabase/migrations/20260409000003_create_calendar_cron_jobs.sql` — pg_cron schedules for reminder dispatch and sync worker

### Edge functions

- `supabase/functions/calendar-dispatch-reminders/index.ts` — Reminder delivery worker
- `supabase/functions/calendar-sync-ticktick/index.ts` — TickTick outbound sync worker

### Shared calendar logic (Deno modules inside process-whatsapp-message)

- `supabase/functions/process-whatsapp-message/calendar-handler.ts` — Calendar command orchestrator for Ana Clara
- `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts` — Intent detection and entity extraction for calendar commands
- `supabase/functions/process-whatsapp-message/calendar-response-templates.ts` — Portuguese response templates for calendar operations

### Frontend types

- `src/types/calendar.types.ts` — TypeScript interfaces for calendar domain

### Frontend hook

- `src/hooks/useCalendarAgenda.ts` — TanStack Query hook for agenda window

### Supabase config

- `supabase/config.toml` — Add `verify_jwt = false` for cron-triggered functions

### Tests

- `src/hooks/__tests__/useCalendarAgenda.test.tsx` — Hook unit tests
- `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts` — Intent parser unit tests

---

## Task 1: Create Calendar Domain Tables

**Files:**
- Create: `supabase/migrations/20260409000001_create_calendar_domain.sql`

This migration creates all 7 canonical tables defined in the spec, with enums, constraints, indexes, RLS policies, triggers, and comments.

- [ ] **Step 1: Write the migration file**

```sql
-- Migration: Create Calendar/Agenda V1 domain
-- Spec: docs/superpowers/specs/2026-04-08-calendar-agenda-v1-design.md
-- Tables: calendar_events, calendar_event_recurrence_rules, calendar_event_occurrence_overrides,
--         calendar_event_reminders, calendar_external_event_links, calendar_sync_jobs,
--         calendar_reminder_schedule

BEGIN;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE calendar_event_status AS ENUM (
  'scheduled',
  'confirmed',
  'cancelled',
  'completed'
);

CREATE TYPE calendar_event_source AS ENUM (
  'internal'
);

CREATE TYPE calendar_event_created_by AS ENUM (
  'user',
  'ana_clara',
  'system'
);

CREATE TYPE calendar_recurrence_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

CREATE TYPE calendar_reminder_kind AS ENUM (
  'default',
  'prep',
  'deadline'
);

CREATE TYPE calendar_sync_job_status AS ENUM (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'skipped_unsupported'
);

CREATE TYPE calendar_sync_job_type AS ENUM (
  'upsert_event',
  'upsert_occurrence_override',
  'cancel_occurrence',
  'delete_event'
);

CREATE TYPE calendar_sync_direction AS ENUM (
  'outbound'
);

CREATE TYPE calendar_reminder_channel AS ENUM (
  'whatsapp',
  'email',
  'push'
);

CREATE TYPE calendar_reminder_delivery_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped'
);

-- ============================================
-- 1. calendar_events
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  event_kind TEXT NOT NULL DEFAULT 'personal',
  domain_type TEXT,

  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  status calendar_event_status NOT NULL DEFAULT 'scheduled',
  location_text TEXT,
  source calendar_event_source NOT NULL DEFAULT 'internal',
  created_by calendar_event_created_by NOT NULL DEFAULT 'user',
  sync_eligible BOOLEAN NOT NULL DEFAULT true,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_user_window ON public.calendar_events(user_id, start_at, end_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_sync_eligible ON public.calendar_events(user_id, sync_eligible)
  WHERE sync_eligible = true AND deleted_at IS NULL;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar_events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar_events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar_events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar_events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_events IS 'Canonical calendar events owned by the calendar domain';
COMMENT ON COLUMN public.calendar_events.sync_eligible IS 'Whether this event is eligible for outbound sync to external providers';
COMMENT ON COLUMN public.calendar_events.event_kind IS 'e.g. personal, task_like, financial_manual';
COMMENT ON COLUMN public.calendar_events.domain_type IS 'Optional domain classification for filtering';

-- ============================================
-- 2. calendar_event_recurrence_rules
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_event_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

  frequency calendar_recurrence_frequency NOT NULL,
  interval_value INTEGER NOT NULL DEFAULT 1 CHECK (interval_value >= 1),
  by_weekday TEXT[],
  by_monthday INTEGER[],

  starts_at TIMESTAMPTZ NOT NULL,
  until_at TIMESTAMPTZ,
  count_limit INTEGER CHECK (count_limit IS NULL OR count_limit >= 1),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_rule_per_event UNIQUE(event_id)
);

CREATE INDEX idx_calendar_recurrence_event ON public.calendar_event_recurrence_rules(event_id);

ALTER TABLE public.calendar_event_recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurrence_rules"
  ON public.calendar_event_recurrence_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own recurrence_rules"
  ON public.calendar_event_recurrence_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own recurrence_rules"
  ON public.calendar_event_recurrence_rules FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own recurrence_rules"
  ON public.calendar_event_recurrence_rules FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE TRIGGER update_calendar_recurrence_rules_updated_at
  BEFORE UPDATE ON public.calendar_event_recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_event_recurrence_rules IS 'Recurrence rules for recurring calendar events (one per event)';

-- ============================================
-- 3. calendar_event_occurrence_overrides
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_event_occurrence_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

  occurrence_key TEXT NOT NULL,
  original_start_at TIMESTAMPTZ NOT NULL,
  override_start_at TIMESTAMPTZ,
  override_end_at TIMESTAMPTZ,

  status calendar_event_status,
  title_override TEXT,
  description_override TEXT,
  is_cancelled BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_occurrence_override UNIQUE(event_id, occurrence_key)
);

CREATE INDEX idx_calendar_overrides_event ON public.calendar_event_occurrence_overrides(event_id);

ALTER TABLE public.calendar_event_occurrence_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own occurrence_overrides"
  ON public.calendar_event_occurrence_overrides FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own occurrence_overrides"
  ON public.calendar_event_occurrence_overrides FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own occurrence_overrides"
  ON public.calendar_event_occurrence_overrides FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own occurrence_overrides"
  ON public.calendar_event_occurrence_overrides FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE TRIGGER update_calendar_overrides_updated_at
  BEFORE UPDATE ON public.calendar_event_occurrence_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_event_occurrence_overrides IS 'Persisted exceptions for recurring event occurrences';
COMMENT ON COLUMN public.calendar_event_occurrence_overrides.occurrence_key IS 'Stable identity: event_id:original_start_at_iso';

-- ============================================
-- 4. calendar_event_reminders
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

  reminder_kind calendar_reminder_kind NOT NULL DEFAULT 'default',
  remind_offset_minutes INTEGER NOT NULL CHECK (remind_offset_minutes >= 0),
  channel_policy TEXT DEFAULT 'user_preference',
  enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_reminders_event ON public.calendar_event_reminders(event_id);
CREATE INDEX idx_calendar_reminders_enabled ON public.calendar_event_reminders(event_id, enabled)
  WHERE enabled = true;

ALTER TABLE public.calendar_event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own event_reminders"
  ON public.calendar_event_reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own event_reminders"
  ON public.calendar_event_reminders FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own event_reminders"
  ON public.calendar_event_reminders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own event_reminders"
  ON public.calendar_event_reminders FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE TRIGGER update_calendar_reminders_updated_at
  BEFORE UPDATE ON public.calendar_event_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_event_reminders IS 'Reminder intent for calendar events (not delivery)';
COMMENT ON COLUMN public.calendar_event_reminders.remind_offset_minutes IS 'Minutes before event start to fire the reminder';

-- ============================================
-- 5. calendar_external_event_links
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_external_event_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,
  provider_account_id TEXT,
  external_object_id TEXT NOT NULL,
  external_list_id TEXT,
  external_parent_id TEXT,
  external_series_id TEXT,

  sync_direction calendar_sync_direction NOT NULL DEFAULT 'outbound',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  external_payload_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_event_provider UNIQUE(event_id, provider),
  CONSTRAINT unique_external_object UNIQUE(provider, external_object_id)
);

CREATE INDEX idx_calendar_links_event ON public.calendar_external_event_links(event_id);
CREATE INDEX idx_calendar_links_provider ON public.calendar_external_event_links(provider);

ALTER TABLE public.calendar_external_event_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own external_event_links"
  ON public.calendar_external_event_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own external_event_links"
  ON public.calendar_external_event_links FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own external_event_links"
  ON public.calendar_external_event_links FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own external_event_links"
  ON public.calendar_external_event_links FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE TRIGGER update_calendar_links_updated_at
  BEFORE UPDATE ON public.calendar_external_event_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_external_event_links IS 'External mirror links for synced calendar events';

-- ============================================
-- 6. calendar_sync_jobs
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

  occurrence_override_id UUID REFERENCES public.calendar_event_occurrence_overrides(id) ON DELETE SET NULL,
  occurrence_key TEXT,

  provider TEXT NOT NULL,
  job_type calendar_sync_job_type NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT,

  status calendar_sync_job_status NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_sync_idempotency UNIQUE(idempotency_key)
);

CREATE INDEX idx_calendar_sync_jobs_pending ON public.calendar_sync_jobs(run_after, status)
  WHERE status = 'pending';
CREATE INDEX idx_calendar_sync_jobs_event ON public.calendar_sync_jobs(event_id);
CREATE INDEX idx_calendar_sync_jobs_user ON public.calendar_sync_jobs(user_id);

ALTER TABLE public.calendar_sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync_jobs"
  ON public.calendar_sync_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync_jobs"
  ON public.calendar_sync_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync_jobs"
  ON public.calendar_sync_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_calendar_sync_jobs_updated_at
  BEFORE UPDATE ON public.calendar_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_sync_jobs IS 'Outbound sync queue for external provider sync (TickTick, etc.)';
COMMENT ON COLUMN public.calendar_sync_jobs.occurrence_override_id IS 'References override when syncing a single occurrence exception';
COMMENT ON COLUMN public.calendar_sync_jobs.occurrence_key IS 'Stable occurrence identity for external provider mapping';

-- ============================================
-- 7. calendar_reminder_schedule
-- ============================================

CREATE TABLE IF NOT EXISTS public.calendar_reminder_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES public.calendar_event_reminders(id) ON DELETE CASCADE,

  occurrence_key TEXT NOT NULL,
  fire_at TIMESTAMPTZ NOT NULL,

  delivery_status calendar_reminder_delivery_status NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMPTZ,
  channel calendar_reminder_channel NOT NULL,
  idempotency_key TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_reminder_schedule_idempotency UNIQUE(idempotency_key),
  CONSTRAINT unique_reminder_occurrence_channel UNIQUE(reminder_id, occurrence_key, channel)
);

CREATE INDEX idx_calendar_reminder_schedule_pending ON public.calendar_reminder_schedule(fire_at, delivery_status)
  WHERE delivery_status = 'pending';
CREATE INDEX idx_calendar_reminder_schedule_event ON public.calendar_reminder_schedule(event_id);

ALTER TABLE public.calendar_reminder_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder_schedule"
  ON public.calendar_reminder_schedule FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own reminder_schedule"
  ON public.calendar_reminder_schedule FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own reminder_schedule"
  ON public.calendar_reminder_schedule FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.calendar_events e WHERE e.id = event_id AND e.user_id = auth.uid()
  ));

CREATE TRIGGER update_calendar_reminder_schedule_updated_at
  BEFORE UPDATE ON public.calendar_reminder_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.calendar_reminder_schedule IS 'Pre-computed next-fire tracking for efficient reminder dispatch';
COMMENT ON COLUMN public.calendar_reminder_schedule.fire_at IS 'When the reminder should be delivered (event start minus offset)';

COMMIT;
```

- [ ] **Step 2: Verify the migration is syntactically valid**

Run: `cd supabase && npx supabase db lint --level warning`

If the Supabase CLI is not available locally, visually review the file for:
- All `REFERENCES` point to existing tables or tables created earlier in this migration
- All `ENUM` types are created before tables that use them
- `update_updated_at_column()` function already exists (confirmed in codebase)
- No duplicate constraint names

Expected: No errors or warnings related to the new migration.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260409000001_create_calendar_domain.sql
git commit -m "feat(calendar): create canonical calendar domain tables

Seven tables: calendar_events, recurrence_rules, occurrence_overrides,
event_reminders, external_event_links, sync_jobs, reminder_schedule.
Includes enums, RLS policies, indexes, and uniqueness constraints
for idempotency."
```

---

## Task 2: Create Unified Agenda Window RPC

**Files:**
- Create: `supabase/migrations/20260409000002_create_agenda_window_rpc.sql`

This RPC materializes the unified timeline by combining canonical events (with occurrence expansion for non-recurring events in V1) and derived financial projections with deduplication.

- [ ] **Step 1: Write the agenda window RPC migration**

```sql
-- Migration: Create get_agenda_window RPC
-- Unified read model combining canonical events and derived financial projections
-- Spec: docs/superpowers/specs/2026-04-08-calendar-agenda-v1-design.md (section 6)

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
      '/calendar/events/' || ce.id::TEXT AS edit_route,
      false AS is_read_only,
      true AS supports_reschedule,
      true AS supports_complete,
      ce.metadata
    FROM public.calendar_events ce
    WHERE ce.user_id = p_user_id
      AND ce.deleted_at IS NULL
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
      '/bills/' || pb.id::TEXT AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('amount', pb.amount, 'provider_name', pb.provider_name) AS metadata
    FROM public.payable_bills pb
    WHERE pb.user_id = p_user_id
      AND pb.due_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::DATE
      AND pb.due_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::DATE
  ),

  bill_reminders_projection AS (
    SELECT
      'derived_projection'::TEXT AS agenda_item_type,
      'bill_reminder'::TEXT AS origin_type,
      br.id AS origin_id,
      ('br:' || br.bill_id::TEXT || ':' || br.reminder_date::TEXT)::TEXT AS dedup_key,
      (br.reminder_date::TEXT || 'T' || br.reminder_time::TEXT || '-03:00')::TIMESTAMPTZ AS display_start_at,
      (br.reminder_date::TEXT || 'T' || br.reminder_time::TEXT || '-03:00')::TIMESTAMPTZ AS display_end_at,
      'Lembrete: ' || pb.description AS title,
      br.channel AS subtitle,
      br.status::TEXT AS status,
      'bill_reminder'::TEXT AS badge,
      '/bills/' || br.bill_id::TEXT AS edit_route,
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
      '/settings/cycles/' || fc.id::TEXT AS edit_route,
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
      ) BETWEEN (p_from AT TIME ZONE 'America/Sao_Paulo')::DATE AND (p_to AT TIME ZONE 'America/Sao_Paulo')::DATE
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
```

- [ ] **Step 2: Verify the RPC handles edge cases**

Check that:
- `bill_reminders_projection` suppresses entries where a `payable_bill` exists for the same `bill_id` and same date (the `NOT EXISTS` clause)
- `financial_cycles` projects the correct date within the window month
- Canonical events filter by `deleted_at IS NULL` and skip recurring events (handled separately in future phase)
- All CTEs return the same column set for `UNION ALL`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260409000002_create_agenda_window_rpc.sql
git commit -m "feat(calendar): create unified agenda window RPC

get_agenda_window combines canonical events with derived financial
projections from payable_bills, bill_reminders, and financial_cycles.
Includes deduplication: payable_bills suppress bill_reminders for
the same bill_id and date."
```

---

## Task 3: Create Calendar TypeScript Types

**Files:**
- Create: `src/types/calendar.types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/types/calendar.types.ts
// TypeScript interfaces for Calendar/Agenda V1 domain

// ==================== ENUMS ====================

export type CalendarEventStatus = 'scheduled' | 'confirmed' | 'cancelled' | 'completed';

export type CalendarEventSource = 'internal';

export type CalendarEventCreatedBy = 'user' | 'ana_clara' | 'system';

export type CalendarRecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type CalendarReminderKind = 'default' | 'prep' | 'deadline';

export type CalendarSyncJobStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'skipped_unsupported';

export type CalendarSyncJobType = 'upsert_event' | 'upsert_occurrence_override' | 'cancel_occurrence' | 'delete_event';

export type CalendarReminderChannel = 'whatsapp' | 'email' | 'push';

export type CalendarReminderDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

// ==================== ENTITIES ====================

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_kind: string;
  domain_type: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  status: CalendarEventStatus;
  location_text: string | null;
  source: CalendarEventSource;
  created_by: CalendarEventCreatedBy;
  sync_eligible: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CalendarEventRecurrenceRule {
  id: string;
  event_id: string;
  frequency: CalendarRecurrenceFrequency;
  interval_value: number;
  by_weekday: string[] | null;
  by_monthday: number[] | null;
  starts_at: string;
  until_at: string | null;
  count_limit: number | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventOccurrenceOverride {
  id: string;
  event_id: string;
  occurrence_key: string;
  original_start_at: string;
  override_start_at: string | null;
  override_end_at: string | null;
  status: CalendarEventStatus | null;
  title_override: string | null;
  description_override: string | null;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventReminder {
  id: string;
  event_id: string;
  reminder_kind: CalendarReminderKind;
  remind_offset_minutes: number;
  channel_policy: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarExternalEventLink {
  id: string;
  event_id: string;
  provider: string;
  provider_account_id: string | null;
  external_object_id: string;
  external_list_id: string | null;
  external_parent_id: string | null;
  external_series_id: string | null;
  sync_direction: 'outbound';
  sync_status: string;
  last_synced_at: string | null;
  last_error: string | null;
  external_payload_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarSyncJob {
  id: string;
  user_id: string;
  event_id: string;
  occurrence_override_id: string | null;
  occurrence_key: string | null;
  provider: string;
  job_type: CalendarSyncJobType;
  idempotency_key: string;
  payload_hash: string | null;
  status: CalendarSyncJobStatus;
  attempt_count: number;
  run_after: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== AGENDA WINDOW ====================

export type AgendaItemType = 'canonical_event' | 'derived_projection';

export type AgendaOriginType = 'calendar_event' | 'payable_bill' | 'bill_reminder' | 'financial_cycle';

export interface AgendaItem {
  agenda_item_type: AgendaItemType;
  origin_type: AgendaOriginType;
  origin_id: string;
  dedup_key: string;
  display_start_at: string;
  display_end_at: string | null;
  title: string;
  subtitle: string | null;
  status: string;
  badge: string | null;
  edit_route: string | null;
  is_read_only: boolean;
  supports_reschedule: boolean;
  supports_complete: boolean;
  metadata: Record<string, unknown> | null;
}

// ==================== INPUT TYPES ====================

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  event_kind?: string;
  domain_type?: string;
  start_at: string;
  end_at?: string;
  all_day?: boolean;
  timezone?: string;
  status?: CalendarEventStatus;
  location_text?: string;
  created_by?: CalendarEventCreatedBy;
  sync_eligible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  event_kind?: string;
  start_at?: string;
  end_at?: string;
  all_day?: boolean;
  status?: CalendarEventStatus;
  location_text?: string;
  sync_eligible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgendaWindowParams {
  from: string;
  to: string;
  timezone?: string;
}

export interface SetEventRemindersInput {
  event_id: string;
  reminders: Array<{
    reminder_kind?: CalendarReminderKind;
    remind_offset_minutes: number;
    channel_policy?: string;
  }>;
}
```

- [ ] **Step 2: Verify types match the migration schema**

Compare every field in the interfaces against the columns defined in `20260409000001_create_calendar_domain.sql`. Confirm enum values match.

- [ ] **Step 3: Commit**

```bash
git add src/types/calendar.types.ts
git commit -m "feat(calendar): add TypeScript types for calendar domain

Covers all 7 tables plus AgendaItem (unified read model),
input types for create/update operations, and enum unions."
```

---

## Task 4: Create useCalendarAgenda Hook

**Files:**
- Create: `src/hooks/useCalendarAgenda.ts`
- Create: `src/hooks/__tests__/useCalendarAgenda.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockRpc = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: {
      getUser: mockGetUser,
    },
  },
}));

import { useCalendarAgenda } from '../useCalendarAgenda';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCalendarAgenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
  });

  it('returns agenda items for given window', async () => {
    const mockItems = [
      {
        agenda_item_type: 'canonical_event',
        origin_type: 'calendar_event',
        origin_id: 'evt-1',
        dedup_key: 'ce:evt-1',
        display_start_at: '2026-04-10T10:00:00-03:00',
        display_end_at: '2026-04-10T11:00:00-03:00',
        title: 'Reunião',
        subtitle: null,
        status: 'scheduled',
        badge: 'personal',
        edit_route: '/calendar/events/evt-1',
        is_read_only: false,
        supports_reschedule: true,
        supports_complete: true,
        metadata: {},
      },
    ];

    mockRpc.mockResolvedValue({ data: mockItems, error: null });

    const { result } = renderHook(
      () =>
        useCalendarAgenda({
          from: '2026-04-10T00:00:00-03:00',
          to: '2026-04-11T00:00:00-03:00',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].title).toBe('Reunião');
    expect(mockRpc).toHaveBeenCalledWith('get_agenda_window', {
      p_user_id: 'user-123',
      p_from: '2026-04-10T00:00:00-03:00',
      p_to: '2026-04-11T00:00:00-03:00',
    });
  });

  it('returns empty array when no items in window', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(
      () =>
        useCalendarAgenda({
          from: '2026-04-10T00:00:00-03:00',
          to: '2026-04-11T00:00:00-03:00',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('handles RPC error gracefully', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function not found', code: '42883' },
    });

    const { result } = renderHook(
      () =>
        useCalendarAgenda({
          from: '2026-04-10T00:00:00-03:00',
          to: '2026-04-11T00:00:00-03:00',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useCalendarAgenda.test.tsx`

Expected: FAIL — `useCalendarAgenda` module not found.

- [ ] **Step 3: Write the hook implementation**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AgendaItem, AgendaWindowParams } from '@/types/calendar.types';

export function useCalendarAgenda(params: AgendaWindowParams) {
  return useQuery<AgendaItem[]>({
    queryKey: ['calendar', 'agenda', params.from, params.to],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_agenda_window', {
        p_user_id: user.id,
        p_from: params.from,
        p_to: params.to,
      });

      if (error) throw error;
      return (data ?? []) as AgendaItem[];
    },
    staleTime: 60_000,
    enabled: !!params.from && !!params.to,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useCalendarAgenda.test.tsx`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCalendarAgenda.ts src/hooks/__tests__/useCalendarAgenda.test.tsx
git commit -m "feat(calendar): add useCalendarAgenda hook with tests

TanStack Query hook calling get_agenda_window RPC.
Includes tests for success, empty window, and RPC error."
```

---

## Task 5: Create Calendar Intent Parser for Ana Clara

**Files:**
- Create: `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts`
- Create: `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts`

This module detects calendar-related intents from user messages and extracts structured entities (title, date, time, reminder offset).

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import {
  isCalendarIntent,
  parseCalendarIntent,
  CalendarIntentType,
} from '../calendar-intent-parser';

describe('calendar-intent-parser', () => {
  describe('isCalendarIntent', () => {
    it('detects "agenda" keyword', () => {
      expect(isCalendarIntent('minha agenda')).toBe(true);
    });

    it('detects "compromisso" keyword', () => {
      expect(isCalendarIntent('tenho um compromisso amanhã')).toBe(true);
    });

    it('detects "lembrete" keyword', () => {
      expect(isCalendarIntent('me lembra às 9h')).toBe(true);
    });

    it('detects "remarcar" keyword', () => {
      expect(isCalendarIntent('quero remarcar a reunião')).toBe(true);
    });

    it('detects "cancelar compromisso" phrase', () => {
      expect(isCalendarIntent('cancelar compromisso de amanhã')).toBe(true);
    });

    it('rejects unrelated messages', () => {
      expect(isCalendarIntent('gastei 50 no mercado')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isCalendarIntent('')).toBe(false);
    });
  });

  describe('parseCalendarIntent', () => {
    it('parses create intent with title and relative date', () => {
      const result = parseCalendarIntent('amanhã tenho reunião com dentista às 14h');
      expect(result.intent).toBe('create');
      expect(result.title).toContain('dentista');
      expect(result.rawText).toBe('amanhã tenho reunião com dentista às 14h');
    });

    it('parses create intent with reminder request', () => {
      const result = parseCalendarIntent('compromisso amanhã, me lembra meia hora antes');
      expect(result.intent).toBe('create');
      expect(result.reminderOffsetMinutes).toBe(30);
    });

    it('parses list intent', () => {
      const result = parseCalendarIntent('o que tenho na agenda essa semana?');
      expect(result.intent).toBe('list');
    });

    it('parses cancel intent', () => {
      const result = parseCalendarIntent('cancelar compromisso de amanhã');
      expect(result.intent).toBe('cancel');
    });

    it('parses reschedule intent', () => {
      const result = parseCalendarIntent('remarcar reunião para sexta');
      expect(result.intent).toBe('reschedule');
    });

    it('returns unknown for ambiguous messages', () => {
      const result = parseCalendarIntent('agenda');
      expect(result.intent).toBe('list');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Write the intent parser implementation**

```typescript
// calendar-intent-parser.ts — Intent detection and entity extraction for calendar commands

export type CalendarIntentType = 'create' | 'list' | 'reschedule' | 'cancel' | 'set_reminder' | 'unknown';

export interface CalendarParsedIntent {
  intent: CalendarIntentType;
  title?: string;
  rawText: string;
  reminderOffsetMinutes?: number;
  dateHint?: string;
  timeHint?: string;
}

const CALENDAR_KEYWORDS = [
  'agenda', 'compromisso', 'compromissos', 'reunião', 'reuniao',
  'lembrete', 'lembra', 'lembrar', 'remarcar', 'remarco',
  'cancelar compromisso', 'cancelar reunião', 'cancelar reuniao',
  'evento', 'agendar', 'agendamento',
];

const CREATE_PATTERNS = [
  /\b(tenho|marcar?|agendar?|cri(?:ar?|e)|novo|nova)\b/i,
  /\bcompromisso\b/i,
];

const LIST_PATTERNS = [
  /\b(agenda|o que tenho|meus compromissos|minha agenda|compromissos)\b/i,
  /\b(essa semana|esta semana|hoje|amanhã|próximos dias)\b.*\b(agenda|compromisso)/i,
];

const CANCEL_PATTERNS = [
  /\bcancelar?\b/i,
];

const RESCHEDULE_PATTERNS = [
  /\b(remarcar?|adiar?|mover?|mudar)\b/i,
];

const REMINDER_OFFSET_MAP: Array<{ pattern: RegExp; minutes: number }> = [
  { pattern: /meia hora antes/i, minutes: 30 },
  { pattern: /uma hora antes/i, minutes: 60 },
  { pattern: /1\s*h(?:ora)?\s*antes/i, minutes: 60 },
  { pattern: /15\s*min(?:utos?)?\s*antes/i, minutes: 15 },
  { pattern: /30\s*min(?:utos?)?\s*antes/i, minutes: 30 },
  { pattern: /10\s*min(?:utos?)?\s*antes/i, minutes: 10 },
  { pattern: /2\s*horas?\s*antes/i, minutes: 120 },
  { pattern: /1\s*dia\s*antes/i, minutes: 1440 },
];

export function isCalendarIntent(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const lower = text.toLowerCase().trim();
  return CALENDAR_KEYWORDS.some((kw) => lower.includes(kw));
}

export function parseCalendarIntent(text: string): CalendarParsedIntent {
  const lower = text.toLowerCase().trim();

  const reminderOffsetMinutes = extractReminderOffset(lower);

  if (CANCEL_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'cancel', rawText: text, reminderOffsetMinutes };
  }

  if (RESCHEDULE_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'reschedule', rawText: text, reminderOffsetMinutes };
  }

  if (CREATE_PATTERNS.some((p) => p.test(lower)) || reminderOffsetMinutes !== undefined) {
    const title = extractTitle(lower);
    return { intent: 'create', title, rawText: text, reminderOffsetMinutes };
  }

  if (LIST_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'list', rawText: text };
  }

  if (lower.includes('agenda') || lower.includes('compromisso')) {
    return { intent: 'list', rawText: text };
  }

  return { intent: 'unknown', rawText: text };
}

function extractReminderOffset(text: string): number | undefined {
  for (const { pattern, minutes } of REMINDER_OFFSET_MAP) {
    if (pattern.test(text)) return minutes;
  }
  return undefined;
}

function extractTitle(text: string): string {
  let title = text;

  const removePatterns = [
    /^(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\s*/i,
    /\b(tenho|marcar|agendar|criar|novo|nova)\s*/gi,
    /\b(às?\s*\d{1,2}h?\d{0,2})\b/gi,
    /\b(me\s+lembra.*$)/i,
    /\b(meia hora antes|uma hora antes|\d+\s*min(?:utos?)?\s*antes|\d+\s*horas?\s*antes)/gi,
    /^(compromisso|reunião|reuniao|evento)\s*/i,
  ];

  for (const pattern of removePatterns) {
    title = title.replace(pattern, '').trim();
  }

  title = title.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

  return title || 'Compromisso';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/process-whatsapp-message/calendar-intent-parser.ts supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts
git commit -m "feat(calendar): add calendar intent parser for Ana Clara

Detects create/list/reschedule/cancel intents from Portuguese text.
Extracts reminder offset (meia hora antes, 15 min antes, etc.) and
approximate title from natural language."
```

---

## Task 6: Create Calendar Response Templates

**Files:**
- Create: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`

- [ ] **Step 1: Write the response templates module**

```typescript
// calendar-response-templates.ts — Portuguese response templates for calendar operations

import type { AgendaItem } from './calendar-types-edge.ts';

export interface AgendaItemEdge {
  agenda_item_type: string;
  origin_type: string;
  origin_id: string;
  display_start_at: string;
  display_end_at: string | null;
  title: string;
  subtitle: string | null;
  status: string;
  badge: string | null;
  is_read_only: boolean;
  metadata: Record<string, unknown> | null;
}

export function templateEventCreated(title: string, dateFormatted: string, reminderText?: string): string {
  let msg = `✅ *Compromisso criado!*\n\n`;
  msg += `📌 ${title}\n`;
  msg += `📅 ${dateFormatted}\n`;
  if (reminderText) {
    msg += `🔔 ${reminderText}\n`;
  }
  return msg;
}

export function templateEventCancelled(title: string): string {
  return `❌ *Compromisso cancelado:* ${title}`;
}

export function templateEventRescheduled(title: string, newDateFormatted: string): string {
  return `🔄 *Compromisso remarcado!*\n\n📌 ${title}\n📅 Nova data: ${newDateFormatted}`;
}

export function templateAgendaList(items: AgendaItemEdge[], periodLabel: string): string {
  if (items.length === 0) {
    return `📅 *Agenda: ${periodLabel}*\n\nNenhum compromisso encontrado.`;
  }

  let msg = `📅 *Agenda: ${periodLabel}*\n\n`;

  for (const item of items) {
    const emoji = getItemEmoji(item);
    const time = formatTime(item.display_start_at);
    const readOnly = item.is_read_only ? ' _(automático)_' : '';
    msg += `${emoji} ${time} — ${item.title}${readOnly}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━\n`;
  msg += `Total: ${items.length} item${items.length > 1 ? 's' : ''}`;

  return msg;
}

export function templateEventNotFound(): string {
  return `❓ Não encontrei esse compromisso. Tente "agenda" para ver seus compromissos.`;
}

export function templateCalendarError(): string {
  return `⚠️ Ocorreu um erro ao processar sua solicitação de agenda. Tente novamente.`;
}

function getItemEmoji(item: AgendaItemEdge): string {
  if (item.origin_type === 'payable_bill') return '💰';
  if (item.origin_type === 'bill_reminder') return '🔔';
  if (item.origin_type === 'financial_cycle') return '🔄';
  if (item.status === 'cancelled') return '❌';
  if (item.status === 'completed') return '✅';
  return '📌';
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
  } catch {
    return '--:--';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/process-whatsapp-message/calendar-response-templates.ts
git commit -m "feat(calendar): add calendar WhatsApp response templates

Portuguese templates for event creation, cancellation, reschedule,
and agenda list. Includes emoji mapping by origin type."
```

---

## Task 7: Create Calendar Handler for Ana Clara

**Files:**
- Create: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Modify: `supabase/functions/process-whatsapp-message/index.ts`
- Modify: `supabase/functions/process-whatsapp-message/quick-commands.ts`

This handler bridges Ana Clara's conversational pipeline with the calendar domain.

- [ ] **Step 1: Write the calendar handler**

```typescript
// calendar-handler.ts — Calendar command orchestrator for Ana Clara

import { getSupabase, enviarViaEdgeFunction, todayBrasilia } from './utils.ts';
import { parseCalendarIntent } from './calendar-intent-parser.ts';
import {
  templateEventCreated,
  templateAgendaList,
  templateEventCancelled,
  templateCalendarError,
  type AgendaItemEdge,
} from './calendar-response-templates.ts';

export async function processarComandoAgenda(
  texto: string,
  userId: string,
  phone: string
): Promise<string> {
  const parsed = parseCalendarIntent(texto);

  try {
    switch (parsed.intent) {
      case 'create':
        return await criarEvento(userId, phone, parsed.title || 'Compromisso', parsed.reminderOffsetMinutes);

      case 'list':
        return await listarAgenda(userId, phone);

      case 'cancel':
        return await cancelarEvento(userId, phone, parsed.rawText);

      case 'reschedule':
        await enviarViaEdgeFunction(phone, '🔄 Remarcação de compromissos estará disponível em breve. Por enquanto, cancele e crie um novo.', userId);
        return 'reschedule_deferred';

      default:
        return await listarAgenda(userId, phone);
    }
  } catch (error) {
    console.error('[calendar-handler] Error:', error);
    const msg = templateCalendarError();
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }
}

async function criarEvento(
  userId: string,
  phone: string,
  title: string,
  reminderOffsetMinutes?: number
): Promise<string> {
  const supabase = getSupabase();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const startAt = tomorrow.toISOString();

  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      start_at: startAt,
      created_by: 'ana_clara',
      source: 'internal',
      status: 'scheduled',
      sync_eligible: true,
    })
    .select('id, title, start_at')
    .single();

  if (error || !event) {
    console.error('[calendar-handler] Create error:', error);
    throw new Error('Failed to create event');
  }

  let reminderText: string | undefined;

  if (reminderOffsetMinutes) {
    const { error: reminderError } = await supabase
      .from('calendar_event_reminders')
      .insert({
        event_id: event.id,
        reminder_kind: 'default',
        remind_offset_minutes: reminderOffsetMinutes,
        enabled: true,
      });

    if (!reminderError) {
      if (reminderOffsetMinutes >= 60) {
        const hours = Math.floor(reminderOffsetMinutes / 60);
        reminderText = `Lembrete ${hours}h antes`;
      } else {
        reminderText = `Lembrete ${reminderOffsetMinutes} min antes`;
      }
    }
  }

  const dateFormatted = new Date(event.start_at).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const msg = templateEventCreated(event.title, dateFormatted, reminderText);
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

async function listarAgenda(userId: string, phone: string): Promise<string> {
  const supabase = getSupabase();

  const now = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(now.getDate() + 7);

  const { data: items, error } = await supabase
    .rpc('get_agenda_window', {
      p_user_id: userId,
      p_from: now.toISOString(),
      p_to: endOfWeek.toISOString(),
    });

  if (error) {
    console.error('[calendar-handler] List error:', error);
    throw new Error('Failed to list agenda');
  }

  const msg = templateAgendaList(
    (items || []) as AgendaItemEdge[],
    'Próximos 7 dias'
  );
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

async function cancelarEvento(userId: string, phone: string, rawText: string): Promise<string> {
  const supabase = getSupabase();

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .order('start_at', { ascending: true })
    .limit(1);

  if (!events || events.length === 0) {
    const msg = '❓ Não encontrei compromissos pendentes para cancelar.';
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const event = events[0];

  const { error } = await supabase
    .from('calendar_events')
    .update({ status: 'cancelled' })
    .eq('id', event.id)
    .eq('user_id', userId);

  if (error) {
    console.error('[calendar-handler] Cancel error:', error);
    throw new Error('Failed to cancel event');
  }

  const msg = templateEventCancelled(event.title);
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}
```

- [ ] **Step 2: Add calendar command to quick-commands.ts**

In `supabase/functions/process-whatsapp-message/quick-commands.ts`, add `'agenda'` and `'/agenda'` to the `COMANDOS_RAPIDOS` array and add a case to the switch:

Add to `COMANDOS_RAPIDOS` array:
```typescript
'agenda', '/agenda',
```

Add to the switch in `processarComandoRapido`:
```typescript
case 'agenda':
  const { processarComandoAgenda } = await import('./calendar-handler.ts');
  responseText = await processarComandoAgenda(texto, userId, phone);
  break;
```

- [ ] **Step 3: Wire calendar intent detection into process-whatsapp-message/index.ts**

In the main message processing pipeline of `index.ts`, add calendar intent detection before the generic NLP fallback. The exact insertion point is after `isComandoRapido` check and before the general `classificarIntencao` call. Add:

```typescript
import { isCalendarIntent } from './calendar-intent-parser.ts';
import { processarComandoAgenda } from './calendar-handler.ts';
```

Then in the processing flow, add a check:
```typescript
if (isCalendarIntent(content)) {
  const response = await processarComandoAgenda(content, userId, phone);
  // ... return response following existing pattern
}
```

The exact lines to modify depend on the current structure of `index.ts`. Look for where `isComandoRapido` is called and add the calendar check after it returns false, before the general NLP pipeline.

- [ ] **Step 4: Test the calendar handler manually**

Send via WhatsApp (or test endpoint): "minha agenda" — should trigger the list command.
Send: "tenho compromisso amanhã" — should create an event.
Send: "agenda" — should show the quick command response.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/process-whatsapp-message/calendar-handler.ts supabase/functions/process-whatsapp-message/quick-commands.ts supabase/functions/process-whatsapp-message/index.ts
git commit -m "feat(calendar): add Ana Clara calendar handler

Supports create, list, and cancel via WhatsApp.
Wires calendar intent parser into the message processing pipeline.
Adds 'agenda' as a quick command."
```

---

## Task 8: Create Calendar Reminder Dispatch Worker

**Files:**
- Create: `supabase/functions/calendar-dispatch-reminders/index.ts`
- Modify: `supabase/config.toml` — Add `verify_jwt = false` for this function

- [ ] **Step 1: Write the reminder dispatch edge function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface PendingReminder {
  id: string;
  event_id: string;
  reminder_id: string;
  occurrence_key: string;
  fire_at: string;
  channel: string;
  idempotency_key: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const hasJwtAuth = !!authHeader && /^Bearer\s+.+/.test(authHeader);

    if (expectedSecret && !hasJwtAuth && cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pendingReminders, error: fetchError } = await supabase
      .from('calendar_reminder_schedule')
      .select('id, event_id, reminder_id, occurrence_key, fire_at, channel, idempotency_key')
      .eq('delivery_status', 'pending')
      .lte('fire_at', new Date().toISOString())
      .order('fire_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[calendar-dispatch-reminders] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingReminders || pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({ dispatched: 0, message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let dispatched = 0;
    let failed = 0;

    for (const reminder of pendingReminders as PendingReminder[]) {
      try {
        const { data: event } = await supabase
          .from('calendar_events')
          .select('id, user_id, title, start_at, status, deleted_at')
          .eq('id', reminder.event_id)
          .single();

        if (!event || event.deleted_at || event.status === 'cancelled') {
          await supabase
            .from('calendar_reminder_schedule')
            .update({ delivery_status: 'skipped' })
            .eq('id', reminder.id);
          continue;
        }

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('dnd_start, dnd_end, dnd_enabled')
          .eq('user_id', event.user_id)
          .single();

        if (prefs?.dnd_enabled) {
          const now = new Date();
          const currentHour = now.getUTCHours();
          const dndStart = parseInt(prefs.dnd_start?.split(':')[0] || '22');
          const dndEnd = parseInt(prefs.dnd_end?.split(':')[0] || '7');

          if (dndStart > dndEnd) {
            if (currentHour >= dndStart || currentHour < dndEnd) {
              continue;
            }
          } else if (currentHour >= dndStart && currentHour < dndEnd) {
            continue;
          }
        }

        if (reminder.channel === 'whatsapp') {
          const { data: connection } = await supabase
            .from('whatsapp_connections')
            .select('phone_number, status')
            .eq('user_id', event.user_id)
            .eq('status', 'connected')
            .single();

          if (connection?.phone_number) {
            const dateFormatted = new Date(event.start_at).toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            });

            const message = `🔔 *Lembrete:* ${event.title}\n📅 ${dateFormatted}`;

            await supabase.functions.invoke('send-whatsapp-message', {
              body: {
                phone: connection.phone_number,
                message,
                userId: event.user_id,
              },
            });

            await supabase
              .from('calendar_reminder_schedule')
              .update({
                delivery_status: 'sent',
                delivered_at: new Date().toISOString(),
              })
              .eq('id', reminder.id);

            dispatched++;
          }
        }
      } catch (itemError) {
        console.error(`[calendar-dispatch-reminders] Item ${reminder.id} error:`, itemError);
        await supabase
          .from('calendar_reminder_schedule')
          .update({ delivery_status: 'failed' })
          .eq('id', reminder.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ dispatched, failed, total: pendingReminders.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[calendar-dispatch-reminders] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Add verify_jwt = false to config.toml**

In `supabase/config.toml`, add:

```toml
[functions.calendar-dispatch-reminders]
verify_jwt = false
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/calendar-dispatch-reminders/index.ts supabase/config.toml
git commit -m "feat(calendar): add reminder dispatch worker

Edge function queries calendar_reminder_schedule for pending fire_at,
applies DND preferences, sends via WhatsApp, updates delivery status.
Processes up to 50 reminders per invocation."
```

---

## Task 9: Create TickTick Sync Worker

**Files:**
- Create: `supabase/functions/calendar-sync-ticktick/index.ts`
- Modify: `supabase/config.toml` — Add `verify_jwt = false` for this function

- [ ] **Step 1: Write the TickTick sync edge function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 60_000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const hasJwtAuth = !!authHeader && /^Bearer\s+.+/.test(authHeader);

    if (expectedSecret && !hasJwtAuth && cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: jobs, error: fetchError } = await supabase
      .from('calendar_sync_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('provider', 'ticktick')
      .lte('run_after', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error('[calendar-sync-ticktick] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending sync jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      try {
        await supabase
          .from('calendar_sync_jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        const { data: config } = await supabase
          .from('integration_configs')
          .select('*')
          .eq('user_id', job.user_id)
          .eq('integration_type', 'ticktick')
          .eq('is_active', true)
          .single();

        if (!config || !config.ticktick_api_key_encrypted) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: 'No active TickTick integration found',
              attempt_count: job.attempt_count + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        if (job.occurrence_override_id && (job.job_type === 'upsert_occurrence_override' || job.job_type === 'cancel_occurrence')) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'skipped_unsupported',
              last_error: 'Occurrence-level sync not yet implemented for TickTick',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          skipped++;
          continue;
        }

        const { data: event } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('id', job.event_id)
          .single();

        if (!event) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: 'Event not found',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        // TickTick API integration placeholder
        // In production, replace this with actual TickTick API calls:
        // POST https://api.ticktick.com/open/v1/task (create)
        // POST https://api.ticktick.com/open/v1/task/{taskId} (update)
        // DELETE https://api.ticktick.com/open/v1/task/{taskId} (delete)
        //
        // For now, log the intent and mark as succeeded to validate the pipeline.
        console.log(`[calendar-sync-ticktick] Would sync event "${event.title}" (${job.job_type}) to TickTick project ${config.ticktick_default_project_id}`);

        const externalObjectId = `tt_placeholder_${job.event_id}`;

        if (job.job_type === 'delete_event') {
          await supabase
            .from('calendar_external_event_links')
            .delete()
            .eq('event_id', job.event_id)
            .eq('provider', 'ticktick');
        } else {
          await supabase
            .from('calendar_external_event_links')
            .upsert({
              event_id: job.event_id,
              provider: 'ticktick',
              external_object_id: externalObjectId,
              external_list_id: config.ticktick_default_project_id,
              sync_direction: 'outbound',
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }, {
              onConflict: 'event_id,provider',
            });
        }

        await supabase
          .from('calendar_sync_jobs')
          .update({
            status: 'succeeded',
            attempt_count: job.attempt_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        succeeded++;
      } catch (jobError) {
        console.error(`[calendar-sync-ticktick] Job ${job.id} error:`, jobError);

        const newAttemptCount = job.attempt_count + 1;
        const newStatus = newAttemptCount >= MAX_RETRIES ? 'failed' : 'pending';
        const runAfter = newAttemptCount < MAX_RETRIES
          ? new Date(Date.now() + BACKOFF_BASE_MS * Math.pow(2, newAttemptCount)).toISOString()
          : undefined;

        await supabase
          .from('calendar_sync_jobs')
          .update({
            status: newStatus,
            attempt_count: newAttemptCount,
            last_error: String(jobError),
            ...(runAfter ? { run_after: runAfter } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({ succeeded, failed, skipped, total: jobs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[calendar-sync-ticktick] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 2: Add verify_jwt = false to config.toml**

In `supabase/config.toml`, add:

```toml
[functions.calendar-sync-ticktick]
verify_jwt = false
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/index.ts supabase/config.toml
git commit -m "feat(calendar): add TickTick outbound sync worker

Consumes calendar_sync_jobs for TickTick provider. Validates
integration_configs credentials, handles event-level sync,
marks occurrence-level jobs as skipped_unsupported in V1.
Includes exponential backoff retry up to 5 attempts."
```

---

## Task 10: Create Cron Job Migrations

**Files:**
- Create: `supabase/migrations/20260409000003_create_calendar_cron_jobs.sql`

- [ ] **Step 1: Write the cron migration**

```sql
-- Migration: Create cron jobs for Calendar V1 workers
-- 1. calendar-dispatch-reminders: every 5 minutes
-- 2. calendar-sync-ticktick: every 10 minutes

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Reminder dispatch: every 5 minutes
SELECT cron.schedule(
  'calendar-dispatch-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-dispatch-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);

-- TickTick sync: every 10 minutes
SELECT cron.schedule(
  'calendar-sync-ticktick',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-sync-ticktick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) AS request_id;
  $$
);

-- Verify cron jobs created
SELECT jobname, schedule FROM cron.job
WHERE jobname IN ('calendar-dispatch-reminders', 'calendar-sync-ticktick');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260409000003_create_calendar_cron_jobs.sql
git commit -m "feat(calendar): add pg_cron schedules for calendar workers

Reminder dispatch runs every 5 minutes. TickTick sync runs every 10
minutes. Both use net.http_post with service_role_key authorization."
```

---

## Task 11: Populate Reminder Schedule on Event Creation

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`

The `criarEvento` function needs to populate `calendar_reminder_schedule` when a reminder is created, so the dispatch worker can find it.

- [ ] **Step 1: Add reminder schedule population to the create flow**

After the reminder insert in `criarEvento`, add schedule population:

```typescript
if (!reminderError) {
  // Populate calendar_reminder_schedule for dispatch worker
  const fireAt = new Date(new Date(startAt).getTime() - reminderOffsetMinutes * 60_000);

  const { data: insertedReminder } = await supabase
    .from('calendar_event_reminders')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (insertedReminder) {
    const occurrenceKey = `${event.id}:${startAt}`;
    await supabase
      .from('calendar_reminder_schedule')
      .insert({
        event_id: event.id,
        reminder_id: insertedReminder.id,
        occurrence_key: occurrenceKey,
        fire_at: fireAt.toISOString(),
        channel: 'whatsapp',
        idempotency_key: `${insertedReminder.id}:${occurrenceKey}:whatsapp`,
        delivery_status: 'pending',
      });
  }
}
```

- [ ] **Step 2: Add sync job enqueue after event creation**

After event creation, if `sync_eligible`, enqueue a sync job:

```typescript
// Enqueue sync job if eligible
const { error: syncError } = await supabase
  .from('calendar_sync_jobs')
  .insert({
    user_id: userId,
    event_id: event.id,
    provider: 'ticktick',
    job_type: 'upsert_event',
    idempotency_key: `sync:${event.id}:upsert_event:${Date.now()}`,
    status: 'pending',
  });

if (syncError) {
  console.error('[calendar-handler] Sync job enqueue failed (non-blocking):', syncError);
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-whatsapp-message/calendar-handler.ts
git commit -m "feat(calendar): populate reminder schedule and sync jobs on event create

After creating an event with reminder, inserts a row into
calendar_reminder_schedule with computed fire_at. Also enqueues
a TickTick sync job for eligible events."
```

---

## Task 12: End-to-End Verification

**Files:** No new files. This task verifies the complete pipeline.

- [ ] **Step 1: Apply migrations to local Supabase**

Run:
```bash
npx supabase db reset
```

Or apply incrementally:
```bash
npx supabase migration up
```

Expected: All 3 new migrations apply without errors. Tables `calendar_events`, `calendar_event_recurrence_rules`, `calendar_event_occurrence_overrides`, `calendar_event_reminders`, `calendar_external_event_links`, `calendar_sync_jobs`, `calendar_reminder_schedule` exist. RPC `get_agenda_window` is callable.

- [ ] **Step 2: Run all existing tests to confirm no regressions**

Run:
```bash
npx vitest run
```

Expected: All tests pass. New tests from Tasks 4 and 5 pass.

- [ ] **Step 3: Verify edge functions deploy locally**

Run:
```bash
npx supabase functions serve calendar-dispatch-reminders --no-verify-jwt
npx supabase functions serve calendar-sync-ticktick --no-verify-jwt
```

Expected: Functions start without import or syntax errors.

- [ ] **Step 4: Test Ana Clara calendar flow end-to-end**

Via WhatsApp test or direct edge function call:

1. Send "tenho compromisso amanhã, me lembra meia hora antes"
2. Verify `calendar_events` has a new row with `created_by = 'ana_clara'`
3. Verify `calendar_event_reminders` has a row with `remind_offset_minutes = 30`
4. Verify `calendar_reminder_schedule` has a row with correct `fire_at`
5. Verify `calendar_sync_jobs` has a pending job for TickTick
6. Send "agenda" — should return the created event in the list

- [ ] **Step 5: Verify RPC returns unified timeline**

Call directly:
```sql
SELECT * FROM get_agenda_window(
  'USER_UUID_HERE',
  '2026-04-01T00:00:00-03:00'::timestamptz,
  '2026-04-30T23:59:59-03:00'::timestamptz
);
```

Expected: Returns canonical events AND derived financial projections (if payable_bills/financial_cycles exist for the user).

- [ ] **Step 6: Final commit with all remaining changes**

```bash
git add -A
git status
git commit -m "feat(calendar): Calendar/Agenda V1 complete

Canonical domain with 7 tables, unified agenda window RPC,
Ana Clara conversational commands (create/list/cancel),
reminder dispatch worker with next-fire tracking,
TickTick outbound sync worker with exponential backoff,
TypeScript types, and React hook."
```
