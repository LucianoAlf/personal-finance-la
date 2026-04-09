import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('calendar-dispatch-reminders occurrence wiring', () => {
  it('loads override-aware display helper and skips cancelled occurrences', () => {
    const path = join(__dirname, '../index.ts');
    const src = readFileSync(path, 'utf-8');
    expect(src).toContain("from '../_shared/calendar-occurrence-display.ts'");
    expect(src).toContain('resolveCalendarReminderDisplayStart');
    expect(src).toContain('calendar_event_occurrence_overrides');
    expect(src).toContain('occurrence_cancelled');
    expect(src).toContain('resolved.displayAt');
  });
});
