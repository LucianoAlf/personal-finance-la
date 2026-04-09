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
CREATE INDEX idx_calendar_events_user_id
  ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_user_window
  ON public.calendar_events(user_id, start_at, end_at)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_sync_eligible
  ON public.calendar_events(user_id, sync_eligible)
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
COMMENT ON COLUMN public.calendar_events.event_kind IS 'Classification: personal, task_like, financial_manual';
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
CREATE INDEX idx_calendar_recurrence_event
  ON public.calendar_event_recurrence_rules(event_id);
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
CREATE INDEX idx_calendar_overrides_event
  ON public.calendar_event_occurrence_overrides(event_id);
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
CREATE INDEX idx_calendar_reminders_event
  ON public.calendar_event_reminders(event_id);
CREATE INDEX idx_calendar_reminders_enabled
  ON public.calendar_event_reminders(event_id, enabled)
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
CREATE INDEX idx_calendar_links_event
  ON public.calendar_external_event_links(event_id);
CREATE INDEX idx_calendar_links_provider
  ON public.calendar_external_event_links(provider);
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
CREATE INDEX idx_calendar_sync_jobs_pending
  ON public.calendar_sync_jobs(run_after, status)
  WHERE status = 'pending';
CREATE INDEX idx_calendar_sync_jobs_event
  ON public.calendar_sync_jobs(event_id);
CREATE INDEX idx_calendar_sync_jobs_user
  ON public.calendar_sync_jobs(user_id);
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
CREATE INDEX idx_calendar_reminder_schedule_pending
  ON public.calendar_reminder_schedule(fire_at, delivery_status)
  WHERE delivery_status = 'pending';
CREATE INDEX idx_calendar_reminder_schedule_event
  ON public.calendar_reminder_schedule(event_id);
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
