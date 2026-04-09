import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('calendar-handler reschedule + recurrence path', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const handlerPath = join(dir, '..', 'calendar-handler.ts');
  const src = readFileSync(handlerPath, 'utf8');

  it('uses reschedule_calendar_occurrence and get_agenda_window for remarcar flow', () => {
    expect(src).toContain("'reschedule_calendar_occurrence'");
    expect(src).toContain('buildRescheduleCalendarOccurrenceRpcArgs');
    expect(src).toContain("'get_agenda_window'");
    expect(src).toContain('original_start_at');
  });

  it('applies recurrence before reminders on create to avoid reminder block', () => {
    const recurrenceIdx = src.indexOf("'set_calendar_event_recurrence'");
    const remindersIdx = src.indexOf("'set_calendar_event_reminders'");
    expect(recurrenceIdx).toBeGreaterThan(-1);
    expect(remindersIdx).toBeGreaterThan(-1);
    expect(recurrenceIdx).toBeLessThan(remindersIdx);
  });

  it('does not reference payable_bills in handler', () => {
    expect(src).not.toMatch(/payable_bills/i);
  });
});
