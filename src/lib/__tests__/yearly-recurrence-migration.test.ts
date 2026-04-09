import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadYearlyRecurrenceMigration(): string {
  const path = join(
    __dirname,
    '../../../supabase/migrations/20260411120000_enable_yearly_calendar_recurrence.sql',
  );
  return readFileSync(path, 'utf-8');
}

describe('20260411120000_enable_yearly_calendar_recurrence migration', () => {
  it('enables yearly expansion and enqueues outbound sync when recurrence changes', () => {
    const sql = loadYearlyRecurrenceMigration();

    expect(sql).toContain("IF r.frequency = 'yearly' THEN");
    expect(sql).toContain('make_date(v_y, v_anchor_month_num, v_effective_monthday)');
    expect(sql).not.toContain("RAISE EXCEPTION 'yearly_recurrence_deferred_v1'");
    expect(sql).toMatch(/INSERT INTO public\.calendar_sync_jobs\s*\(/s);
    expect(sql).toContain("'upsert_event'");
    expect(sql).toMatch(/'sync:'\s*\|\|\s*p_event_id::text\s*\|\|\s*':upsert_event:recurrence:'/s);
  });
});
