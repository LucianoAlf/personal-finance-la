import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * calendar-handler runs under Deno and imports utils with Deno.env; we assert the
 * WhatsApp create path uses the semantic RPC instead of direct reminder table writes.
 */
describe('calendar-handler reminder path', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const handlerPath = join(dir, '..', 'calendar-handler.ts');
  const src = readFileSync(handlerPath, 'utf8');

  it('uses set_calendar_event_reminders RPC for Ana Clara create flow', () => {
    expect(src).toContain("'set_calendar_event_reminders'");
    expect(src).toContain('buildSetCalendarEventRemindersRpcArgs');
  });

  it('does not insert directly into canonical reminder tables', () => {
    expect(src).not.toMatch(/\.from\(\s*['"]calendar_event_reminders['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]calendar_reminder_schedule['"]\s*\)/);
  });
});
