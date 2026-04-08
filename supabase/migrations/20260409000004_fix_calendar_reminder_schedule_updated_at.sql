-- calendar_reminder_schedule: trigger update_updated_at_column() requires updated_at column.

ALTER TABLE public.calendar_reminder_schedule
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE public.calendar_reminder_schedule SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE public.calendar_reminder_schedule
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;
