import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRecurringRemindersMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260411000002_recurring_reminders_v1.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('20260411000002_recurring_reminders_v1 migration', () => {
  it('defines recurring reminder population and lifts recurrence block on set_calendar_event_reminders', () => {
    const sql = loadRecurringRemindersMigration();

    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.calendar_populate_recurring_reminder_schedule/s);
    expect(sql).toContain('calendar_recurrence_expand_occurrences');
    expect(sql).toContain('calendar_occurrence_key');
    expect(sql).toMatch(/ON CONFLICT\s*\(\s*idempotency_key\s*\)\s*DO NOTHING/s);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.set_calendar_event_reminders/s);
    expect(sql).not.toMatch(
      /RAISE\s+EXCEPTION\s+'recurring_reminders_not_supported_v1'/,
    );
    expect(sql).toContain('INSERT INTO public.calendar_reminder_schedule');
    // Same idempotency shape as non-recurring: reminder_id + ':' + occurrence_key + ':whatsapp'
    expect(sql).toMatch(/\|\|\s*':whatsapp'/);
  });

  it('makes populate override-aware and refreshes pending rows; hooks reschedule/cancel', () => {
    const sql = loadRecurringRemindersMigration();

    expect(sql).toContain('calendar_event_occurrence_overrides');
    expect(sql).toContain('is_cancelled');
    expect(sql).toContain('override_start_at');
    expect(sql).toMatch(/DELETE\s+FROM\s+public\.calendar_reminder_schedule/si);
    expect(sql).toMatch(/delivery_status\s*=\s*'pending'/s);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.reschedule_calendar_occurrence/s);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.cancel_calendar_occurrence/s);
    const afterReschedule = sql.split(
      'CREATE OR REPLACE FUNCTION public.reschedule_calendar_occurrence',
    )[1];
    const [rescheduleBody, cancelTail] = afterReschedule.split(
      'CREATE OR REPLACE FUNCTION public.cancel_calendar_occurrence',
    );
    expect(rescheduleBody).toContain('PERFORM public.calendar_populate_recurring_reminder_schedule');
    expect(cancelTail).toContain('PERFORM public.calendar_populate_recurring_reminder_schedule');
  });
});
