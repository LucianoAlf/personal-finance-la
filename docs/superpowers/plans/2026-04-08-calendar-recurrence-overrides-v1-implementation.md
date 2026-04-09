# Calendar Recurrence And Overrides V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement persisted recurrence, window materialization, occurrence overrides, semantic RPCs, and `get_agenda_window` integration per `docs/superpowers/specs/2026-04-08-calendar-recurrence-overrides-v1-design.md`, with conservative override/reminder policies and TickTick occurrence-level remaining `skipped_unsupported`.

**Architecture:** PostgreSQL remains the source of truth. Add STABLE/helper SQL for expanding `daily` / `weekly` / `monthly` within `[p_from, p_to)`, compose results in `get_agenda_window`, and add SECURITY INVOKER RPCs mirroring existing calendar write patterns (`auth.uid()` + optional `p_user_id`). Structural changes while overrides exist are blocked unless an explicit cleanup path runs in the same transaction. `set_calendar_event_reminders` rejects recurring events.

**Tech Stack:** PostgreSQL (Supabase), PL/pgSQL, Vitest, TypeScript (RPC wrappers and types only), existing Deno edge functions unchanged for TickTick occurrence skip path.

**Spec:** `docs/superpowers/specs/2026-04-08-calendar-recurrence-overrides-v1-design.md`

---

## File structure (delta)

| Path | Responsibility |
|------|----------------|
| `supabase/migrations/20260409120000_calendar_recurrence_overrides_v1.sql` (timestamp adjust if collision) | Helper SQL + RPCs + `get_agenda_window` replacement + `set_calendar_event_reminders` guard |
| `src/types/calendar.types.ts` | Extend `AgendaItem.metadata` shape / error codes if needed |
| `src/lib/calendar-domain.ts` | Wrappers for new RPCs (no direct table writes) |
| `src/lib/__tests__/calendar-recurrence-policy.test.ts` | Pure tests: occurrence_key format, monthly skip rules (see Task 7) |
| `src/lib/__tests__/calendar-domain.test.ts` or new file | RPC arg builders / error mapping |
| `supabase/functions/process-whatsapp-message/calendar-domain-rpc.ts` | Builders for service-role RPC args when Ana Clara gains recurrence later |
| `supabase/functions/calendar-sync-ticktick/index.ts` | Verify no change required (already skips occurrence jobs) |

---

### Task 1: Occurrence key helper (SQL)

**Files:**
- Create: migration file (beginning of `20260409120000_calendar_recurrence_overrides_v1.sql`)

- [ ] **Step 1: Add immutable helper matching reminder-style ISO suffix**

```sql
CREATE OR REPLACE FUNCTION public.calendar_occurrence_key(p_event_id uuid, p_original_start timestamptz)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_event_id::text || ':' || trim(both '"' FROM to_json(p_original_start)::text);
$$;
```

- [ ] **Step 2: Comment** — document parity with `set_calendar_event_reminders` occurrence suffix (`trim(both '"' from to_json(timestamptz))`).

---

### Task 2: Explicit cleanup RPC for overrides (optional but recommended)

**Files:**
- Same migration

- [ ] **Step 1: Add `delete_calendar_occurrence_overrides_for_event(p_event_id uuid, p_user_id uuid DEFAULT NULL) RETURNS void`**

Logic mirrors `set_calendar_event_reminders` actor resolution (`COALESCE(auth.uid(), p_user_id)`, `forbidden_user_override`). `DELETE FROM calendar_event_occurrence_overrides WHERE event_id = p_event_id` after verifying `calendar_events.user_id = v_owner`.

- [ ] **Step 2: `GRANT EXECUTE ... TO authenticated`**

---

### Task 3: `set_calendar_event_recurrence` with conservative policy

**Files:**
- Same migration

- [ ] **Step 1: Before any structural change**, if `EXISTS (SELECT 1 FROM calendar_event_occurrence_overrides o WHERE o.event_id = p_event_id)` and the new payload is not idempotent with the current rule **or** template `start_at`/`end_at` would change: `RAISE EXCEPTION 'occurrence_overrides_block_structural_change'`.

- [ ] **Step 2:** If introducing recurrence (creating a new rule row) and `EXISTS` rows in `calendar_event_reminders` or `calendar_reminder_schedule` for that event: `RAISE EXCEPTION 'reminders_block_recurrence_until_cleared'` unless `p_confirm_drop_reminders boolean DEFAULT false` is true, in which case delete schedule rows then reminder rows in the same transaction before inserting the rule.

- [ ] **Step 3: Parameters (illustrative)** — `p_event_id`, `p_frequency`, `p_interval_value`, `p_by_weekday text[]`, `p_by_monthday int[]`, `p_starts_at timestamptz`, `p_until_at timestamptz`, `p_count_limit int`, `p_timezone text`, `p_user_id uuid`, `p_confirm_drop_overrides boolean DEFAULT false`, `p_confirm_drop_reminders boolean DEFAULT false`.

- [ ] **Step 4:** When `p_confirm_drop_overrides` is true, `DELETE` overrides first, then apply rule change.

- [ ] **Step 5:** Removing recurrence = `DELETE FROM calendar_event_recurrence_rules WHERE event_id = ...` (same guard if overrides exist unless confirm flag).

- [ ] **Step 6:** Idempotency: if normalized rule equals existing row and no template change, no-op.

---

### Task 4: `reschedule_calendar_occurrence` and `cancel_calendar_occurrence`

**Files:**
- Same migration

- [ ] **`reschedule_calendar_occurrence`**
  - Resolve `occurrence_key` from `p_occurrence_key` **or** compute from `p_original_start_at` + `p_event_id`.
  - `INSERT ... ON CONFLICT (event_id, occurrence_key) DO UPDATE` setting `override_start_at`, `override_end_at`, `is_cancelled = false`, clear `title_override`/`description_override` unless passed.
  - Enqueue `calendar_sync_jobs` with `job_type = 'upsert_occurrence_override'`, `occurrence_override_id`, `occurrence_key` (TickTick worker keeps skipping).

- [ ] **`cancel_calendar_occurrence`**
  - Upsert override with `is_cancelled = true`.
  - Enqueue `cancel_occurrence` job.

- [ ] **Idempotency:** same inputs → same row state; second call is no-op or harmless update.

---

### Task 5: Window expansion helper + `get_agenda_window` integration

**Files:**
- Same migration (replace `get_agenda_window` body)

- [ ] **Step 1: Internal function** e.g. `calendar_series_occurrences_in_window(event_row, rule_row, p_from, p_to) RETURNS TABLE(original_start_at timestamptz, original_end_at timestamptz)` implementing:
  - **daily:** step by `interval_value` days from series anchor within bounds
  - **weekly:** same with week step; if `by_weekday` empty, use weekday of template `calendar_events.start_at`; if non-empty, expand each listed weekday per interval week (document algorithm in SQL comments)
  - **monthly:** effective day = `COALESCE(single by_monthday, extract day from start_at)`; for each month in window, if day exists in month, emit occurrence; else skip (no clamp)
  - Respect `until_at`, `count_limit`, rule `starts_at`

- [ ] **Step 2: `get_agenda_window`**
  - Keep existing CTEs for financial projections.
  - `canonical_events_simple`: current logic (no recurrence rule).
  - `canonical_events_recurring`: join `calendar_events` + `calendar_event_recurrence_rules`, expand, left join overrides, filter `display_start` within `[p_from, p_to)`, drop cancelled, apply title/description overrides, set `dedup_key` to `'ceo:' || occurrence_key`, merge `metadata` json per spec.

- [ ] **Step 3:** `UNION ALL` order unchanged; final `ORDER BY display_start_at`.

---

### Task 6: Guard `set_calendar_event_reminders` for recurring events

**Files:**
- Same migration (`CREATE OR REPLACE` existing function from `20260409000008_set_calendar_event_reminders.sql` pattern)

- [ ] **Step 1:** After owner resolution, if `EXISTS (SELECT 1 FROM calendar_event_recurrence_rules r WHERE r.event_id = p_event_id)` then `RAISE EXCEPTION 'recurring_reminders_not_supported_v1'`.

---

### Task 7: Vitest — policy and monthly skip (no live DB required)

**Files:**
- Create: `src/lib/__tests__/calendar-recurrence-policy.test.ts`

- [ ] **Step 1: Monthly skip vectors** — pure TS functions duplicated **only** for test vectors (e.g. `monthHasDay(year, month, day): boolean`) asserting Feb/30 skips, Mar/31 exists.

```ts
import { describe, expect, it } from 'vitest';

function monthHasCalendarDay(year: number, monthIndex0: number, day: number): boolean {
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  return day >= 1 && day <= last;
}

describe('monthly recurrence policy (V1)', () => {
  it('skips February when day is 30', () => {
    expect(monthHasCalendarDay(2026, 1, 30)).toBe(false);
  });
  it('allows January 31', () => {
    expect(monthHasCalendarDay(2026, 0, 31)).toBe(true);
  });
});
```

- [ ] **Step 2: occurrence_key shape** — test string concat matches `eventId + ':' + iso` for a fixed instant (same as SQL `to_json` expectation or document deviation).

Run: `pnpm exec vitest run src/lib/__tests__/calendar-recurrence-policy.test.ts`  
Expected: PASS

---

### Task 8: Client wrappers and types

**Files:**
- Modify: `src/lib/calendar-domain.ts`
- Modify: `src/types/calendar.types.ts` as needed

- [ ] **Step 1:** Export `setCalendarEventRecurrenceDomain`, `rescheduleCalendarOccurrenceDomain`, `cancelCalendarOccurrenceDomain`, `deleteOccurrenceOverridesForEventDomain` calling respective RPCs.

- [ ] **Step 2:** Map new exception names to user-facing Portuguese in `mapRpcErrorMessage`.

---

### Task 9: Smoke (operational)

- [ ] **Step 1:** Local or linked: create event + rule daily, query `get_agenda_window`, assert multiple rows.
- [ ] **Step 2:** Add override reschedule; assert moved time.
- [ ] **Step 3:** Cancel one occurrence; assert hidden.
- [ ] **Step 4:** Attempt `set_calendar_event_reminders` on recurring event → expect error `recurring_reminders_not_supported_v1`.
- [ ] **Step 5:** With override present, attempt rule change without confirm → blocked; with `p_confirm_drop_overrides` → succeeds and overrides gone.

---

## Spec coverage checklist

| Spec section | Task |
|--------------|------|
| Monthly semantics / skip | Task 5, Task 7 |
| Override vs structural policy | Task 2, Task 3 |
| Reminders recurring rejected | Task 6 |
| reschedule / cancel RPCs | Task 4 |
| get_agenda_window | Task 5 |
| TickTick skipped occurrence | No code change; verify Task 9 optional grep |

## Plan self-review

- No `TBD` in executable sections; numeric migration timestamp may be adjusted to avoid collision in repo.
- If `get_agenda_window` becomes too large, split helper functions into same migration file as separate `CREATE FUNCTION` blocks (still one migration transaction per file as usual).

---

**Plan complete.** Two execution options:

1. **Subagent-driven** — fresh subagent per task, review between tasks.  
2. **Inline** — execute in this session with executing-plans checkpoints.

Which approach do you prefer for implementation?
