BEGIN;
ALTER TABLE public.calendar_reminder_schedule
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
COMMENT ON COLUMN public.calendar_reminder_schedule.attempt_count IS
  'Delivery attempts for this scheduled reminder row.';
COMMENT ON COLUMN public.calendar_reminder_schedule.last_error IS
  'Last delivery error observed by calendar-dispatch-reminders.';
COMMENT ON COLUMN public.calendar_reminder_schedule.provider_message_id IS
  'Message identifier returned by the outbound provider (e.g. UAZAPI/WhatsApp).';
COMMIT;
