# Agenda + TickTick Closure V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the agenda as a real operational tool with full TickTick bidirectional sync (reminders, recurrence, priority, hash-based change detection) and an expanded UI with proportional time blocks, category filters, ownership chooser, and reminder management.

**Architecture:** The existing `calendar-sync-ticktick` worker gains RRULE parsing, TRIGGER parsing, priority mapping, and hash-based change detection in both inbound and outbound paths. The frontend evolves from basic calendar to an operational agenda: WeekView with proportional time blocks, category-based color coding, an ownership chooser that gates creation between `calendar_events` and `payable_bills`, and an expanded modal with recurrence/reminders/priority/category. Clara gains category inference and reminder configuration via WhatsApp. All changes preserve the foundational premise: app is source of truth, connectors are optional.

**Tech Stack:** PostgreSQL (Supabase), PL/pgSQL, Deno (Edge Functions), TypeScript, React, Tailwind CSS, shadcn/ui, Vitest, TickTick Open API v1

**Spec:** `docs/superpowers/specs/2026-04-09-agenda-ticktick-closure-v1-design.md`

**Guardrails (carry from previous phase):**
- Ownership between `calendar_events` and `payable_bills` must not be broken
- Financial inbound goes to `payable_bills`, not `calendar_events`
- Delete inbound never deletes canonical local data
- Merge cross-provider remains out of V1
- Recurring reminders only for `calendar_events`; financial reminders stay in `bill_reminders`
- Conclusion done in TickTick has no faithful inbound mirroring in V1
- Absolute reminders (e.g. "1 day before at 09:00") are app-native only, no round-trip to TickTick
- `db push --linked` global is blocked; new migrations require surgical workaround

**Checkpoints:** After Task 2, Task 5, Task 8, Task 10

---

## File structure (delta)

| Path | Responsibility |
|------|----------------|
| `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts` | Modify: add RRULE parser, TRIGGER parser, priority mapper, hash builder, outbound payload enrichment |
| `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts` | Modify: tests for new parsers, hash, enriched payload |
| `supabase/functions/calendar-sync-ticktick/index.ts` | Modify: wire inbound recurrence/reminders/priority, hash-based change detection |
| `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts` | Create: integration-level tests for enriched inbound/outbound |
| `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts` | Modify: add category keyword extraction |
| `supabase/functions/process-whatsapp-message/calendar-handler.ts` | Modify: pass category to create, reminder config via WhatsApp |
| `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-category.test.ts` | Create: tests for category inference |
| `src/components/calendar/calendar-utils.ts` | Modify: expand badge styles for V1 categories, add event positioning helpers |
| `src/components/calendar/WeekView.tsx` | Modify: proportional time blocks, category colors, overlapping layout |
| `src/components/calendar/MonthView.tsx` | Modify: click on day opens creation modal instead of switching to DayView |
| `src/components/calendar/CalendarPage.tsx` → `src/pages/CalendarPage.tsx` | Modify: ownership chooser, category filter sidebar, mini-calendar |
| `src/components/calendar/CreateEventDialog.tsx` | Modify: add category, recurrence, reminders, priority fields |
| `src/components/calendar/AgendaItemSheet.tsx` | Modify: show reminders, recurrence, sync status, category badge |
| `src/components/calendar/CalendarFilters.tsx` | Modify: replace origin-type filter with category checkboxes |
| `src/components/calendar/OwnershipChooser.tsx` | Create: chooser dialog for Compromisso de agenda vs Obrigacao financeira |
| `src/components/calendar/RecurrenceSelector.tsx` | Create: recurrence preset + custom selector |
| `src/components/calendar/ReminderList.tsx` | Create: dynamic list of reminder offsets with add/remove |
| `src/components/calendar/CategorySelect.tsx` | Create: category dropdown for agenda (personal, work, mentoring) |
| `src/components/calendar/PrioritySelect.tsx` | Create: priority dropdown (none, low, medium, high) |
| `src/components/calendar/MiniCalendar.tsx` | Create: sidebar mini-calendar for date navigation |
| `src/lib/calendar-domain.ts` | Modify: extend create to accept category, priority; add reminder set wrapper |
| `src/types/calendar.types.ts` | Modify: add EventKind union, reminder_type field |

---

### Task 1: RRULE and TRIGGER parsers + priority mapper + hash builder

**Files:**
- Modify: `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`
- Modify: `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`

- [ ] **Step 1: Write failing tests for TRIGGER parser**

In `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`, add:

```typescript
import {
  parseTriggerToOffsetMinutes,
  offsetMinutesToTrigger,
} from '../ticktick-mapping.ts';

describe('parseTriggerToOffsetMinutes', () => {
  it('parses PT0S as 0', () => {
    expect(parseTriggerToOffsetMinutes('TRIGGER:PT0S')).toBe(0);
  });
  it('parses P0DT9H0M0S as 540', () => {
    expect(parseTriggerToOffsetMinutes('TRIGGER:P0DT9H0M0S')).toBe(540);
  });
  it('parses P1DT0H0M0S as 1440', () => {
    expect(parseTriggerToOffsetMinutes('TRIGGER:P1DT0H0M0S')).toBe(1440);
  });
  it('parses PT30M0S as 30', () => {
    expect(parseTriggerToOffsetMinutes('TRIGGER:PT30M0S')).toBe(30);
  });
  it('parses PT1H0M0S as 60', () => {
    expect(parseTriggerToOffsetMinutes('TRIGGER:PT1H0M0S')).toBe(60);
  });
  it('returns null for invalid format', () => {
    expect(parseTriggerToOffsetMinutes('not-a-trigger')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(parseTriggerToOffsetMinutes('')).toBeNull();
  });
});

describe('offsetMinutesToTrigger', () => {
  it('converts 0 to TRIGGER:PT0S', () => {
    expect(offsetMinutesToTrigger(0)).toBe('TRIGGER:PT0S');
  });
  it('converts 30 to TRIGGER:PT30M0S', () => {
    expect(offsetMinutesToTrigger(30)).toBe('TRIGGER:P0DT0H30M0S');
  });
  it('converts 540 to TRIGGER:P0DT9H0M0S', () => {
    expect(offsetMinutesToTrigger(540)).toBe('TRIGGER:P0DT9H0M0S');
  });
  it('converts 1440 to TRIGGER:P1DT0H0M0S', () => {
    expect(offsetMinutesToTrigger(1440)).toBe('TRIGGER:P1DT0H0M0S');
  });
  it('converts 2910 (2d 0h 30m) to TRIGGER:P2DT0H30M0S', () => {
    expect(offsetMinutesToTrigger(2910)).toBe('TRIGGER:P2DT0H30M0S');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`
Expected: FAIL — `parseTriggerToOffsetMinutes` and `offsetMinutesToTrigger` not defined

- [ ] **Step 3: Implement TRIGGER parser and builder**

In `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`, add:

```typescript
const TRIGGER_REGEX = /^TRIGGER:P(\d+)DT(\d+)H(\d+)M(\d+)S$/;
const TRIGGER_SHORT_REGEX = /^TRIGGER:PT(?:(\d+)H)?(\d+)M(\d+)S$/;
const TRIGGER_ZERO_REGEX = /^TRIGGER:PT0S$/;

export function parseTriggerToOffsetMinutes(trigger: string): number | null {
  if (!trigger) return null;
  if (TRIGGER_ZERO_REGEX.test(trigger)) return 0;
  const full = trigger.match(TRIGGER_REGEX);
  if (full) {
    const days = parseInt(full[1], 10);
    const hours = parseInt(full[2], 10);
    const minutes = parseInt(full[3], 10);
    return days * 1440 + hours * 60 + minutes;
  }
  const short = trigger.match(TRIGGER_SHORT_REGEX);
  if (short) {
    const hours = short[1] ? parseInt(short[1], 10) : 0;
    const minutes = parseInt(short[2], 10);
    return hours * 60 + minutes;
  }
  return null;
}

export function offsetMinutesToTrigger(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'TRIGGER:PT0S';
  const days = Math.floor(offsetMinutes / 1440);
  const remaining = offsetMinutes % 1440;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return `TRIGGER:P${days}DT${hours}H${minutes}M0S`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`
Expected: All TRIGGER tests PASS

- [ ] **Step 5: Write failing tests for RRULE parser**

In the same test file, add:

```typescript
import {
  parseRruleToRecurrenceFields,
  recurrenceFieldsToRrule,
} from '../ticktick-mapping.ts';

describe('parseRruleToRecurrenceFields', () => {
  it('parses FREQ=DAILY;INTERVAL=1', () => {
    expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1')).toEqual({
      frequency: 'daily',
      interval_value: 1,
      by_weekday: null,
      by_monthday: null,
      until_at: null,
      count_limit: null,
    });
  });
  it('parses FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR', () => {
    expect(parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR')).toEqual({
      frequency: 'weekly',
      interval_value: 1,
      by_weekday: ['MO', 'WE', 'FR'],
      by_monthday: null,
      until_at: null,
      count_limit: null,
    });
  });
  it('parses FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15', () => {
    expect(parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15')).toEqual({
      frequency: 'monthly',
      interval_value: 1,
      by_weekday: null,
      by_monthday: [15],
      until_at: null,
      count_limit: null,
    });
  });
  it('parses UNTIL', () => {
    const result = parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231T235959Z');
    expect(result?.until_at).toBe('20261231T235959Z');
  });
  it('parses COUNT', () => {
    const result = parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10');
    expect(result?.count_limit).toBe(10);
  });
  it('returns null for FREQ=YEARLY (unsupported V1)', () => {
    expect(parseRruleToRecurrenceFields('RRULE:FREQ=YEARLY;INTERVAL=1')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(parseRruleToRecurrenceFields('')).toBeNull();
  });
  it('returns null for BYSETPOS (unsupported V1)', () => {
    expect(parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;BYSETPOS=2;BYDAY=TU')).toBeNull();
  });
});

describe('recurrenceFieldsToRrule', () => {
  it('builds daily RRULE', () => {
    expect(recurrenceFieldsToRrule({
      frequency: 'daily', interval_value: 1,
      by_weekday: null, by_monthday: null, until_at: null, count_limit: null,
    })).toBe('RRULE:FREQ=DAILY;INTERVAL=1');
  });
  it('builds weekly with BYDAY', () => {
    expect(recurrenceFieldsToRrule({
      frequency: 'weekly', interval_value: 1,
      by_weekday: ['MO', 'WE', 'FR'], by_monthday: null, until_at: null, count_limit: null,
    })).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
  });
  it('builds monthly with BYMONTHDAY', () => {
    expect(recurrenceFieldsToRrule({
      frequency: 'monthly', interval_value: 1,
      by_weekday: null, by_monthday: [15], until_at: null, count_limit: null,
    })).toBe('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15');
  });
  it('includes COUNT', () => {
    expect(recurrenceFieldsToRrule({
      frequency: 'daily', interval_value: 2,
      by_weekday: null, by_monthday: null, until_at: null, count_limit: 5,
    })).toBe('RRULE:FREQ=DAILY;INTERVAL=2;COUNT=5');
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`
Expected: FAIL — functions not defined

- [ ] **Step 7: Implement RRULE parser and builder**

In `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`, add:

```typescript
export interface RecurrenceFields {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval_value: number;
  by_weekday: string[] | null;
  by_monthday: number[] | null;
  until_at: string | null;
  count_limit: number | null;
}

const SUPPORTED_FREQS = new Set(['DAILY', 'WEEKLY', 'MONTHLY']);
const UNSUPPORTED_PARAMS = new Set(['BYSETPOS', 'BYHOUR', 'BYMINUTE']);

export function parseRruleToRecurrenceFields(rrule: string): RecurrenceFields | null {
  if (!rrule) return null;
  const raw = rrule.replace(/^RRULE:/, '');
  const parts = raw.split(';');
  const params: Record<string, string> = {};
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) params[key] = value;
  }

  if (!params.FREQ || !SUPPORTED_FREQS.has(params.FREQ)) return null;
  for (const unsupported of UNSUPPORTED_PARAMS) {
    if (params[unsupported]) return null;
  }

  return {
    frequency: params.FREQ.toLowerCase() as RecurrenceFields['frequency'],
    interval_value: params.INTERVAL ? parseInt(params.INTERVAL, 10) : 1,
    by_weekday: params.BYDAY ? params.BYDAY.split(',') : null,
    by_monthday: params.BYMONTHDAY ? params.BYMONTHDAY.split(',').map(Number) : null,
    until_at: params.UNTIL ?? null,
    count_limit: params.COUNT ? parseInt(params.COUNT, 10) : null,
  };
}

export function recurrenceFieldsToRrule(fields: RecurrenceFields): string {
  let rrule = `RRULE:FREQ=${fields.frequency.toUpperCase()};INTERVAL=${fields.interval_value}`;
  if (fields.by_weekday?.length) rrule += `;BYDAY=${fields.by_weekday.join(',')}`;
  if (fields.by_monthday?.length) rrule += `;BYMONTHDAY=${fields.by_monthday.join(',')}`;
  if (fields.until_at) rrule += `;UNTIL=${fields.until_at}`;
  if (fields.count_limit) rrule += `;COUNT=${fields.count_limit}`;
  return rrule;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`
Expected: All RRULE tests PASS

- [ ] **Step 9: Write failing tests for priority mapper and hash builder**

In the same test file, add:

```typescript
import {
  mapTickTickPriority,
  mapAppPriorityToTickTick,
  buildExternalPayloadHash,
} from '../ticktick-mapping.ts';

describe('mapTickTickPriority', () => {
  it('maps 0 to null', () => { expect(mapTickTickPriority(0)).toBeNull(); });
  it('maps 1 to low', () => { expect(mapTickTickPriority(1)).toBe('low'); });
  it('maps 3 to medium', () => { expect(mapTickTickPriority(3)).toBe('medium'); });
  it('maps 5 to high', () => { expect(mapTickTickPriority(5)).toBe('high'); });
  it('maps unknown to null', () => { expect(mapTickTickPriority(99)).toBeNull(); });
});

describe('mapAppPriorityToTickTick', () => {
  it('maps null to 0', () => { expect(mapAppPriorityToTickTick(null)).toBe(0); });
  it('maps low to 1', () => { expect(mapAppPriorityToTickTick('low')).toBe(1); });
  it('maps medium to 3', () => { expect(mapAppPriorityToTickTick('medium')).toBe(3); });
  it('maps high to 5', () => { expect(mapAppPriorityToTickTick('high')).toBe(5); });
});

describe('buildExternalPayloadHash', () => {
  const task = {
    title: 'Test',
    startDate: '2026-04-15T09:00:00.000+0000',
    dueDate: '2026-04-15T11:00:00.000+0000',
    repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
    reminders: ['TRIGGER:PT30M0S'],
    priority: 3,
    status: 0,
  };
  it('returns a consistent string hash', () => {
    const h1 = buildExternalPayloadHash(task);
    const h2 = buildExternalPayloadHash(task);
    expect(h1).toBe(h2);
    expect(typeof h1).toBe('string');
    expect(h1.length).toBeGreaterThan(0);
  });
  it('changes when a field changes', () => {
    const h1 = buildExternalPayloadHash(task);
    const h2 = buildExternalPayloadHash({ ...task, title: 'Changed' });
    expect(h1).not.toBe(h2);
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`
Expected: FAIL — functions not defined

- [ ] **Step 11: Implement priority mapper and hash builder**

In `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`, add:

```typescript
const TICKTICK_PRIORITY_MAP: Record<number, string | null> = {
  0: null, 1: 'low', 3: 'medium', 5: 'high',
};
const APP_PRIORITY_MAP: Record<string, number> = {
  low: 1, medium: 3, high: 5,
};

export function mapTickTickPriority(priority: number): string | null {
  return TICKTICK_PRIORITY_MAP[priority] ?? null;
}

export function mapAppPriorityToTickTick(priority: string | null): number {
  if (!priority) return 0;
  return APP_PRIORITY_MAP[priority] ?? 0;
}

export interface HashableTaskFields {
  title: string;
  startDate?: string | null;
  dueDate?: string | null;
  repeatFlag?: string | null;
  reminders?: string[] | null;
  priority?: number | null;
  status?: number | null;
}

export function buildExternalPayloadHash(task: HashableTaskFields): string {
  const canonical = JSON.stringify([
    task.title,
    task.startDate ?? '',
    task.dueDate ?? '',
    task.repeatFlag ?? '',
    (task.reminders ?? []).sort().join(','),
    task.priority ?? 0,
    task.status ?? 0,
  ]);
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}
```

- [ ] **Step 12: Run all mapping tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts`
Expected: ALL PASS

- [ ] **Step 13: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts supabase/functions/calendar-sync-ticktick/__tests__/ticktick-mapping.test.ts
git commit -m "feat(sync): add RRULE parser, TRIGGER parser, priority mapper, and hash builder for TickTick closure V1"
```

---

### Task 2: Enrich outbound payload with recurrence, reminders, priority

**Files:**
- Modify: `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts` (`buildTickTickPayload`)
- Modify: `supabase/functions/calendar-sync-ticktick/index.ts` (fetch reminders + recurrence for outbound)
- Create: `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts`

- [ ] **Step 1: Write failing tests for enriched outbound payload**

Create `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  buildTickTickPayload,
  offsetMinutesToTrigger,
  recurrenceFieldsToRrule,
  mapAppPriorityToTickTick,
} from '../ticktick-mapping.ts';

describe('buildTickTickPayload — enriched outbound', () => {
  const baseEvent = {
    id: 'ev-1',
    title: 'Mentoria Fabiola',
    description: 'Google Meet',
    start_at: '2026-04-15T09:00:00.000Z',
    end_at: '2026-04-15T11:00:00.000Z',
    all_day: false,
    timezone: 'America/Sao_Paulo',
    status: 'scheduled' as const,
    location_text: null,
    event_kind: 'mentoring',
    sync_eligible: true,
    deleted_at: null,
  };

  it('includes reminders as TRIGGER array when provided', () => {
    const reminders = [{ remind_offset_minutes: 30 }, { remind_offset_minutes: 1440 }];
    const payload = buildTickTickPayload(baseEvent, 'proj-1', undefined, {
      reminders,
    });
    expect(payload.reminders).toEqual([
      'TRIGGER:P0DT0H30M0S',
      'TRIGGER:P1DT0H0M0S',
    ]);
  });

  it('includes repeatFlag when recurrence provided', () => {
    const recurrence = {
      frequency: 'weekly' as const,
      interval_value: 1,
      by_weekday: ['MO', 'WE', 'FR'],
      by_monthday: null,
      until_at: null,
      count_limit: null,
    };
    const payload = buildTickTickPayload(baseEvent, 'proj-1', undefined, {
      recurrence,
    });
    expect(payload.repeatFlag).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
  });

  it('includes priority when provided', () => {
    const payload = buildTickTickPayload(baseEvent, 'proj-1', undefined, {
      priority: 'high',
    });
    expect(payload.priority).toBe(5);
  });

  it('omits recurrence/reminders/priority when not provided', () => {
    const payload = buildTickTickPayload(baseEvent, 'proj-1');
    expect(payload.reminders).toBeUndefined();
    expect(payload.repeatFlag).toBeUndefined();
    expect(payload.priority).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts`
Expected: FAIL — `buildTickTickPayload` does not accept enrichment params

- [ ] **Step 3: Extend `buildTickTickPayload` signature**

In `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`, change the `buildTickTickPayload` function signature and body:

```typescript
export interface OutboundEnrichment {
  reminders?: { remind_offset_minutes: number }[];
  recurrence?: RecurrenceFields;
  priority?: string | null;
}

export function buildTickTickPayload(
  event: CalendarEventForSync,
  projectId: string,
  existingTaskId?: string,
  enrichment?: OutboundEnrichment,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: event.title,
    projectId,
    isAllDay: event.all_day,
    timeZone: event.timezone || 'America/Sao_Paulo',
  };

  if (existingTaskId) payload.id = existingTaskId;
  if (event.description) payload.content = event.description;
  if (event.start_at) payload.startDate = formatDateForTickTick(event.start_at);
  if (event.end_at) payload.dueDate = formatDateForTickTick(event.end_at);

  if (enrichment?.reminders?.length) {
    payload.reminders = enrichment.reminders.map((r) =>
      offsetMinutesToTrigger(r.remind_offset_minutes),
    );
  }
  if (enrichment?.recurrence) {
    payload.repeatFlag = recurrenceFieldsToRrule(enrichment.recurrence);
  }
  if (enrichment?.priority) {
    payload.priority = mapAppPriorityToTickTick(enrichment.priority);
  }

  return payload;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Update outbound handlers in `index.ts` to fetch enrichment data**

In `supabase/functions/calendar-sync-ticktick/index.ts`, modify `handleUpsertEvent` to:
1. Fetch `calendar_event_reminders` for the event (only where `enabled = true`)
2. Fetch `calendar_event_recurrence_rules` for the event
3. Read `metadata.priority` from the event
4. Build enrichment object and pass to `buildTickTickPayload`

```typescript
// Inside handleUpsertEvent, before calling buildTickTickPayload:
const { data: reminders } = await supabaseClient
  .from('calendar_event_reminders')
  .select('remind_offset_minutes')
  .eq('event_id', event.id)
  .eq('enabled', true);

const { data: recurrenceRows } = await supabaseClient
  .from('calendar_event_recurrence_rules')
  .select('frequency, interval_value, by_weekday, by_monthday, until_at, count_limit')
  .eq('event_id', event.id)
  .limit(1);

const enrichment: OutboundEnrichment = {};
if (reminders?.length) {
  enrichment.reminders = reminders;
}
if (recurrenceRows?.[0]) {
  enrichment.recurrence = recurrenceRows[0] as RecurrenceFields;
}
const priority = (event.metadata as Record<string, unknown>)?.priority as string | null;
if (priority) {
  enrichment.priority = priority;
}

const payload = buildTickTickPayload(event, projectId, existingTaskId, enrichment);
```

- [ ] **Step 6: Run full mapping + closure test suites**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts supabase/functions/calendar-sync-ticktick/index.ts supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts
git commit -m "feat(sync): enrich outbound TickTick payload with recurrence, reminders, and priority"
```

---

### Task 3: Enrich inbound path with recurrence, reminders, priority, and hash-based change detection

**Files:**
- Modify: `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts` (extend `TickTickTaskInbound`)
- Modify: `supabase/functions/calendar-sync-ticktick/index.ts` (inbound enrichment + hash detection)
- Modify: `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts`

- [ ] **Step 1: Write failing tests for inbound enrichment**

In `ticktick-sync-closure.test.ts`, add:

```typescript
import {
  parseTriggerToOffsetMinutes,
  parseRruleToRecurrenceFields,
  mapTickTickPriority,
  buildExternalPayloadHash,
} from '../ticktick-mapping.ts';

describe('inbound enrichment integration', () => {
  const task = {
    id: 'tt-1',
    title: 'Mentoria Semanal',
    content: 'Google Meet',
    startDate: '2026-04-15T09:00:00.000+0000',
    dueDate: '2026-04-15T11:00:00.000+0000',
    isAllDay: false,
    timeZone: 'America/Sao_Paulo',
    projectId: 'proj-mentoring',
    status: 0,
    repeatFlag: 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=TU',
    reminders: ['TRIGGER:P0DT9H0M0S', 'TRIGGER:PT30M0S'],
    priority: 5,
  };

  it('extracts recurrence fields from repeatFlag', () => {
    const fields = parseRruleToRecurrenceFields(task.repeatFlag);
    expect(fields).toEqual({
      frequency: 'weekly',
      interval_value: 1,
      by_weekday: ['TU'],
      by_monthday: null,
      until_at: null,
      count_limit: null,
    });
  });

  it('extracts reminder offsets from reminders array', () => {
    const offsets = task.reminders.map(parseTriggerToOffsetMinutes);
    expect(offsets).toEqual([540, 30]);
  });

  it('maps priority correctly', () => {
    expect(mapTickTickPriority(task.priority)).toBe('high');
  });

  it('produces stable hash for change detection', () => {
    const h1 = buildExternalPayloadHash(task);
    const h2 = buildExternalPayloadHash(task);
    expect(h1).toBe(h2);
  });

  it('detects change when reminders differ', () => {
    const h1 = buildExternalPayloadHash(task);
    const h2 = buildExternalPayloadHash({ ...task, reminders: ['TRIGGER:PT30M0S'] });
    expect(h1).not.toBe(h2);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (parsers already exist from Task 1)**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-sync-closure.test.ts`
Expected: ALL PASS (these use already-implemented functions)

- [ ] **Step 3: Extend `TickTickTaskInbound` interface**

In `ticktick-mapping.ts`, update the `TickTickTaskInbound` interface:

```typescript
export interface TickTickTaskInbound {
  id: string;
  title: string;
  content?: string;
  desc?: string;
  startDate?: string;
  dueDate?: string;
  isAllDay?: boolean;
  timeZone?: string;
  projectId: string;
  modifiedTime?: string;
  status: number;
  repeatFlag?: string;
  reminders?: string[];
  priority?: number;
  items?: unknown[];
  sortOrder?: number;
}
```

- [ ] **Step 4: Update inbound path in `index.ts` — persist recurrence, reminders, priority, hash**

In `supabase/functions/calendar-sync-ticktick/index.ts`, in the inbound new-task creation path (inside `processInboundTickTickForUser`), after inserting the `calendar_events` row and the `calendar_external_event_links` row:

```typescript
// After creating the canonical event and link:

// 1. Persist recurrence if present
if (task.repeatFlag) {
  const recurrenceFields = parseRruleToRecurrenceFields(task.repeatFlag);
  if (recurrenceFields) {
    await supabaseClient.rpc('set_calendar_event_recurrence', {
      p_event_id: newEventId,
      p_frequency: recurrenceFields.frequency,
      p_interval_value: recurrenceFields.interval_value,
      p_by_weekday: recurrenceFields.by_weekday,
      p_by_monthday: recurrenceFields.by_monthday,
      p_until_at: recurrenceFields.until_at,
      p_count_limit: recurrenceFields.count_limit,
    });
  } else {
    console.warn(`[inbound] rrule_unsupported_v1 for task ${task.id}: ${task.repeatFlag}`);
  }
}

// 2. Persist reminders if present
if (task.reminders?.length) {
  const offsets = task.reminders
    .map(parseTriggerToOffsetMinutes)
    .filter((v): v is number => v !== null);
  if (offsets.length > 0) {
    await supabaseClient.rpc('set_calendar_event_reminders', {
      p_event_id: newEventId,
      p_reminders: offsets.map((offset) => ({
        reminder_kind: 'before_start',
        remind_offset_minutes: offset,
        channel_policy: 'default',
      })),
    });
  }
}

// 3. Persist priority in metadata
if (task.priority && task.priority > 0) {
  const priorityLabel = mapTickTickPriority(task.priority);
  if (priorityLabel) {
    await supabaseClient
      .from('calendar_events')
      .update({ metadata: { priority: priorityLabel } })
      .eq('id', newEventId);
  }
}

// 4. Store payload hash for change detection
const payloadHash = buildExternalPayloadHash(task);
await supabaseClient
  .from('calendar_external_event_links')
  .update({ external_payload_hash: payloadHash })
  .eq('event_id', newEventId)
  .eq('provider', 'ticktick');
```

- [ ] **Step 5: Replace timestamp-based change detection with hash-based**

In the inbound update path (existing task matched to local link), replace `detectSyncAction` with hash comparison:

```typescript
// For existing linked tasks, replace the detectSyncAction call:
const currentHash = buildExternalPayloadHash(task);
const storedHash = link.external_payload_hash;
const hasChanged = currentHash !== storedHash;

if (!hasChanged) {
  continue; // No change detected
}

// Existing logic for update/conflict follows, using the link's last_synced_at
// After successful update, persist new hash:
await supabaseClient
  .from('calendar_external_event_links')
  .update({
    external_payload_hash: currentHash,
    last_synced_at: new Date().toISOString(),
  })
  .eq('id', link.id);
```

- [ ] **Step 6: Add `external_payload_hash` column if not present**

Check if `external_payload_hash` already exists on `calendar_external_event_links`. If not, add to the next migration or use the surgical approach:

```sql
ALTER TABLE public.calendar_external_event_links
  ADD COLUMN IF NOT EXISTS external_payload_hash TEXT;
COMMENT ON COLUMN public.calendar_external_event_links.external_payload_hash IS
  'Hash of relevant external fields for change detection without modifiedDate. Built from title+dates+rrule+reminders+priority+status.';
```

- [ ] **Step 7: Run full test suite**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/ supabase/migrations/
git commit -m "feat(sync): enrich inbound with recurrence/reminders/priority and switch to hash-based change detection"
```

---

### Task 4: Update types and calendar-domain for category, priority, and reminders

**Files:**
- Modify: `src/types/calendar.types.ts`
- Modify: `src/lib/calendar-domain.ts`

- [ ] **Step 1: Add `EventKind` union type and extend `CalendarEventSource`**

In `src/types/calendar.types.ts`:

```typescript
export type EventKind = 'personal' | 'work' | 'mentoring';

export type CalendarEventSource = 'internal' | 'external';

export type EventPriority = 'low' | 'medium' | 'high' | null;
```

- [ ] **Step 2: Add `ReminderType` to distinguish relative vs absolute**

```typescript
export type ReminderType = 'relative' | 'absolute';

export interface CalendarEventReminder {
  id: string;
  event_id: string;
  reminder_kind: CalendarReminderKind;
  remind_offset_minutes: number;
  reminder_type?: ReminderType;
  channel_policy: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Extend `CreateCalendarEventDomainInput`**

In `src/lib/calendar-domain.ts`, extend the input type:

```typescript
export interface CreateCalendarEventDomainInput {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  locationText?: string;
  eventKind?: string;
  priority?: string | null;
}
```

- [ ] **Step 4: Add `setCalendarEventRemindersDomain` wrapper**

In `src/lib/calendar-domain.ts`, add:

```typescript
export interface ReminderInput {
  reminder_kind: string;
  remind_offset_minutes: number;
  channel_policy: string;
}

export async function setCalendarEventRemindersDomain(
  eventId: string,
  reminders: ReminderInput[],
): Promise<void> {
  const { getSupabaseClient } = await import('@/lib/supabase');
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('set_calendar_event_reminders', {
    p_event_id: eventId,
    p_reminders: reminders,
  });
  if (error) throw new Error(mapCalendarDomainRpcError(error.message));
}
```

- [ ] **Step 5: Pass priority in `createCalendarEventDomain`**

Update `createCalendarEventDomain` to include priority in metadata after creation if provided:

```typescript
// After successful event creation:
if (input.priority) {
  const supabase = getSupabaseClient();
  await supabase
    .from('calendar_events')
    .update({ metadata: { priority: input.priority } })
    .eq('id', eventId);
}
```

- [ ] **Step 6: Run existing calendar domain tests**

Run: `pnpm exec vitest run src/lib/__tests__/calendar-domain.test.ts`
Expected: PASS (no breaking changes)

- [ ] **Step 7: Commit**

```bash
git add src/types/calendar.types.ts src/lib/calendar-domain.ts
git commit -m "feat(domain): extend types with EventKind, ReminderType, priority; add setCalendarEventRemindersDomain"
```

---

### Task 5: Category colors, event positioning helpers, and badge system

**Files:**
- Modify: `src/components/calendar/calendar-utils.ts`

- [ ] **Step 1: Write failing tests**

Create `src/components/calendar/__tests__/calendar-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getCategoryStyle,
  calculateEventPosition,
  CATEGORY_STYLES,
} from '../calendar-utils';

describe('getCategoryStyle', () => {
  it('returns blue for personal', () => {
    expect(getCategoryStyle('personal').color).toBe('#4A90D9');
  });
  it('returns purple for work', () => {
    expect(getCategoryStyle('work').color).toBe('#7B68EE');
  });
  it('returns orange for mentoring', () => {
    expect(getCategoryStyle('mentoring').color).toBe('#F5A623');
  });
  it('returns pink for financial', () => {
    expect(getCategoryStyle('financial').color).toBe('#F18181');
  });
  it('returns gray for external', () => {
    expect(getCategoryStyle('external').color).toBe('#9CA3AF');
  });
  it('returns default for unknown', () => {
    expect(getCategoryStyle('unknown').color).toBe('#6B7280');
  });
});

describe('calculateEventPosition', () => {
  it('calculates top and height for 09:00-12:00 event', () => {
    const pos = calculateEventPosition('2026-04-15T09:00:00.000Z', '2026-04-15T12:00:00.000Z', 6);
    expect(pos.topSlots).toBe(3); // 09-06 = 3 hours from grid start
    expect(pos.heightSlots).toBe(3); // 3 hours duration
  });
  it('clamps minimum height to 0.5 slots for very short events', () => {
    const pos = calculateEventPosition('2026-04-15T09:00:00.000Z', '2026-04-15T09:15:00.000Z', 6);
    expect(pos.heightSlots).toBeGreaterThanOrEqual(0.5);
  });
  it('handles all-day by returning topSlots=-1', () => {
    const pos = calculateEventPosition('2026-04-15T00:00:00.000Z', null, 6, true);
    expect(pos.topSlots).toBe(-1);
    expect(pos.heightSlots).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/components/calendar/__tests__/calendar-utils.test.ts`
Expected: FAIL — functions not defined

- [ ] **Step 3: Implement category styles and event positioning**

In `src/components/calendar/calendar-utils.ts`, add:

```typescript
export interface CategoryStyle {
  color: string;
  bg: string;
  text: string;
  label: string;
  icon: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  personal: { color: '#4A90D9', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Pessoal', icon: 'User' },
  work: { color: '#7B68EE', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Trabalho', icon: 'Briefcase' },
  mentoring: { color: '#F5A623', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Mentoria', icon: 'GraduationCap' },
  financial: { color: '#F18181', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Conta', icon: 'DollarSign' },
  external: { color: '#9CA3AF', bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', label: 'Externo', icon: 'Globe' },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  color: '#6B7280', bg: 'bg-muted', text: 'text-muted-foreground', label: 'Evento', icon: 'Calendar',
};

export function getCategoryStyle(eventKind: string | null | undefined): CategoryStyle {
  if (!eventKind) return DEFAULT_CATEGORY_STYLE;
  return CATEGORY_STYLES[eventKind] ?? DEFAULT_CATEGORY_STYLE;
}

export interface EventPosition {
  topSlots: number;
  heightSlots: number;
}

export function calculateEventPosition(
  startIso: string,
  endIso: string | null,
  gridStartHour: number,
  allDay?: boolean,
): EventPosition {
  if (allDay) return { topSlots: -1, heightSlots: 0 };
  const start = parseISO(startIso);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const topSlots = startHour - gridStartHour;

  if (!endIso) return { topSlots, heightSlots: 1 };
  const end = parseISO(endIso);
  const endHour = end.getHours() + end.getMinutes() / 60;
  const heightSlots = Math.max(endHour - startHour, 0.5);
  return { topSlots, heightSlots };
}
```

Also update the existing `BADGE_STYLES` to align:

```typescript
const BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  personal: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Pessoal' },
  work: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Trabalho' },
  mentoring: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Mentoria' },
  finance: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Financeiro' },
  financial: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Conta' },
  bill: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-danger', label: 'Conta' },
  bill_reminder: { bg: 'bg-warning-subtle', text: 'text-warning', label: 'Lembrete' },
  cycle: { bg: 'bg-info-subtle', text: 'text-info', label: 'Ciclo' },
  external: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', label: 'Externo' },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/components/calendar/__tests__/calendar-utils.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/calendar-utils.ts src/components/calendar/__tests__/calendar-utils.test.ts
git commit -m "feat(ui): add category styles, event positioning helpers, and aligned badge system"
```

---

### Task 6: OwnershipChooser + CategorySelect + PrioritySelect components

**Files:**
- Create: `src/components/calendar/OwnershipChooser.tsx`
- Create: `src/components/calendar/CategorySelect.tsx`
- Create: `src/components/calendar/PrioritySelect.tsx`

- [ ] **Step 1: Create OwnershipChooser**

Create `src/components/calendar/OwnershipChooser.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, DollarSign } from 'lucide-react';
import { useState } from 'react';

export type OwnershipChoice = 'agenda' | 'financial';

interface OwnershipChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (choice: OwnershipChoice) => void;
}

export function OwnershipChooser({ open, onOpenChange, onChoose }: OwnershipChooserProps) {
  const [selected, setSelected] = useState<OwnershipChoice>('agenda');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>O que voce quer criar?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <button
            type="button"
            onClick={() => setSelected('agenda')}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              selected === 'agenda'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Compromisso de agenda</p>
              <p className="text-sm text-muted-foreground">
                Reuniao, mentoria, tarefa, evento pessoal ou de trabalho
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelected('financial')}
            className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              selected === 'financial'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <DollarSign className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium">Obrigacao financeira</p>
              <p className="text-sm text-muted-foreground">
                Conta, assinatura, parcela, vencimento, cobranca
              </p>
            </div>
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onChoose(selected)}>Continuar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create CategorySelect**

Create `src/components/calendar/CategorySelect.tsx`:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_STYLES } from './calendar-utils';

const AGENDA_CATEGORIES = ['personal', 'work', 'mentoring'] as const;

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function CategorySelect({ value, onValueChange }: CategorySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Categoria" />
      </SelectTrigger>
      <SelectContent>
        {AGENDA_CATEGORIES.map((key) => {
          const style = CATEGORY_STYLES[key];
          return (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: style.color }}
                />
                {style.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: Create PrioritySelect**

Create `src/components/calendar/PrioritySelect.tsx`:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRIORITIES = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
] as const;

interface PrioritySelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function PrioritySelect({ value, onValueChange }: PrioritySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Prioridade" />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Run lint check**

Run: `pnpm exec tsc --noEmit`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/OwnershipChooser.tsx src/components/calendar/CategorySelect.tsx src/components/calendar/PrioritySelect.tsx
git commit -m "feat(ui): add OwnershipChooser, CategorySelect, and PrioritySelect components"
```

---

### Task 7: RecurrenceSelector and ReminderList components

**Files:**
- Create: `src/components/calendar/RecurrenceSelector.tsx`
- Create: `src/components/calendar/ReminderList.tsx`

- [ ] **Step 1: Create RecurrenceSelector**

Create `src/components/calendar/RecurrenceSelector.tsx`:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';

export interface RecurrenceConfig {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  byWeekday: string[];
  byMonthday: number[];
  endType: 'never' | 'date' | 'count';
  endDate?: string;
  endCount?: number;
}

const DEFAULT_CONFIG: RecurrenceConfig = {
  frequency: 'none',
  interval: 1,
  byWeekday: [],
  byMonthday: [],
  endType: 'never',
};

interface RecurrenceSelectorProps {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
}

export function RecurrenceSelector({ value, onChange }: RecurrenceSelectorProps) {
  const config = value || DEFAULT_CONFIG;

  const handleFrequencyChange = (freq: string) => {
    onChange({ ...config, frequency: freq as RecurrenceConfig['frequency'] });
  };

  if (config.frequency === 'none') {
    return (
      <Select value={config.frequency} onValueChange={handleFrequencyChange}>
        <SelectTrigger>
          <SelectValue placeholder="Recorrencia" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhuma</SelectItem>
          <SelectItem value="daily">Diaria</SelectItem>
          <SelectItem value="weekly">Semanal</SelectItem>
          <SelectItem value="monthly">Mensal</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Repetir:</Label>
        <Select value={config.frequency} onValueChange={handleFrequencyChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="daily">Diaria</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
        <Label className="shrink-0">A cada:</Label>
        <Input
          type="number"
          min={1}
          max={99}
          className="w-16"
          value={config.interval}
          onChange={(e) =>
            onChange({ ...config, interval: Math.max(1, parseInt(e.target.value) || 1) })
          }
        />
      </div>
      {config.frequency === 'monthly' && (
        <div className="space-y-1">
          <RadioGroup
            value={config.byMonthday.length > 0 ? 'monthday' : 'default'}
            onValueChange={(v) => {
              if (v === 'monthday') {
                onChange({ ...config, byMonthday: [15] });
              } else {
                onChange({ ...config, byMonthday: [] });
              }
            }}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="default" id="rec-default" />
              <Label htmlFor="rec-default">Na mesma data</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="monthday" id="rec-monthday" />
              <Label htmlFor="rec-monthday">No dia</Label>
              {config.byMonthday.length > 0 && (
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="w-16"
                  value={config.byMonthday[0] ?? 1}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      byMonthday: [Math.min(31, Math.max(1, parseInt(e.target.value) || 1))],
                    })
                  }
                />
              )}
            </div>
          </RadioGroup>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Termina:</Label>
        <Select
          value={config.endType}
          onValueChange={(v) =>
            onChange({ ...config, endType: v as RecurrenceConfig['endType'] })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Nunca</SelectItem>
            <SelectItem value="count">Apos N vezes</SelectItem>
          </SelectContent>
        </Select>
        {config.endType === 'count' && (
          <Input
            type="number"
            min={1}
            className="w-20"
            value={config.endCount ?? 10}
            onChange={(e) =>
              onChange({ ...config, endCount: parseInt(e.target.value) || 10 })
            }
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ReminderList**

Create `src/components/calendar/ReminderList.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

export interface ReminderEntry {
  id: string;
  offsetMinutes: number;
}

const OFFSET_PRESETS = [
  { value: '0', label: 'No horario' },
  { value: '5', label: '5 minutos antes' },
  { value: '15', label: '15 minutos antes' },
  { value: '30', label: '30 minutos antes' },
  { value: '60', label: '1 hora antes' },
  { value: '120', label: '2 horas antes' },
  { value: '1440', label: '1 dia antes' },
  { value: '2880', label: '2 dias antes' },
] as const;

interface ReminderListProps {
  reminders: ReminderEntry[];
  onChange: (reminders: ReminderEntry[]) => void;
}

export function ReminderList({ reminders, onChange }: ReminderListProps) {
  const addReminder = () => {
    const id = crypto.randomUUID();
    onChange([...reminders, { id, offsetMinutes: 30 }]);
  };

  const removeReminder = (id: string) => {
    onChange(reminders.filter((r) => r.id !== id));
  };

  const updateOffset = (id: string, offsetMinutes: number) => {
    onChange(
      reminders.map((r) => (r.id === id ? { ...r, offsetMinutes } : r)),
    );
  };

  return (
    <div className="space-y-2">
      {reminders.map((r, idx) => (
        <div key={r.id} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
          <Select
            value={String(r.offsetMinutes)}
            onValueChange={(v) => updateOffset(r.id, parseInt(v, 10))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFSET_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">relativo</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => removeReminder(r.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addReminder}
        className="w-full"
      >
        + Adicionar lembrete
      </Button>
      {reminders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Na V1, apenas lembretes relativos espelham fielmente para TickTick.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run lint check**

Run: `pnpm exec tsc --noEmit`
Expected: No new type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/RecurrenceSelector.tsx src/components/calendar/ReminderList.tsx
git commit -m "feat(ui): add RecurrenceSelector and ReminderList components for expanded modal"
```

---

### Task 8: Expand CreateEventDialog with all new fields

**Files:**
- Modify: `src/components/calendar/CreateEventDialog.tsx`

- [ ] **Step 1: Update CreateEventDialog imports and state**

Add imports for new components and extend form state:

```tsx
import { CategorySelect } from './CategorySelect';
import { PrioritySelect } from './PrioritySelect';
import { RecurrenceSelector, type RecurrenceConfig } from './RecurrenceSelector';
import { ReminderList, type ReminderEntry } from './ReminderList';
import { setCalendarEventRemindersDomain, setCalendarEventRecurrenceDomain } from '@/lib/calendar-domain';
```

Add new state variables:

```tsx
const [category, setCategory] = useState('personal');
const [priority, setPriority] = useState('none');
const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
  frequency: 'none', interval: 1, byWeekday: [], byMonthday: [], endType: 'never',
});
const [reminders, setReminders] = useState<ReminderEntry[]>([]);
```

- [ ] **Step 2: Add new fields to the form body**

After the existing location field, before the submit button, add the new form sections:

```tsx
{/* Category and Priority row */}
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Categoria</Label>
    <CategorySelect value={category} onValueChange={setCategory} />
  </div>
  <div className="space-y-2">
    <Label>Prioridade</Label>
    <PrioritySelect value={priority} onValueChange={setPriority} />
  </div>
</div>

{/* Recurrence */}
<div className="space-y-2">
  <Label>Recorrencia</Label>
  <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
</div>

{/* Reminders */}
<div className="space-y-2">
  <Label>Lembretes</Label>
  <ReminderList reminders={reminders} onChange={setReminders} />
</div>
```

- [ ] **Step 3: Update handleSubmit to pass category, priority, and post-create enrichment**

```tsx
const handleSubmit = async () => {
  if (!title.trim()) {
    toast.error('Titulo obrigatorio');
    return;
  }
  // ... existing validation ...

  try {
    const { eventId } = await createCalendarEventDomain({
      title: title.trim(),
      description: description.trim() || undefined,
      date: format(date, 'yyyy-MM-dd'),
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      allDay,
      locationText: location.trim() || undefined,
      eventKind: category,
      priority: priority === 'none' ? undefined : priority,
    });

    // Set recurrence if configured
    if (recurrence.frequency !== 'none') {
      await setCalendarEventRecurrenceDomain({
        eventId,
        frequency: recurrence.frequency === 'custom' ? 'daily' : recurrence.frequency,
        intervalValue: recurrence.interval,
        byWeekday: recurrence.byWeekday.length ? recurrence.byWeekday : undefined,
        byMonthday: recurrence.byMonthday.length ? recurrence.byMonthday : undefined,
        countLimit: recurrence.endType === 'count' ? recurrence.endCount : undefined,
      });
    }

    // Set reminders if any
    if (reminders.length > 0) {
      await setCalendarEventRemindersDomain(
        eventId,
        reminders.map((r) => ({
          reminder_kind: 'before_start',
          remind_offset_minutes: r.offsetMinutes,
          channel_policy: 'default',
        })),
      );
    }

    toast.success('Compromisso criado');
    onSuccess();
    resetForm();
    onOpenChange(false);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar compromisso';
    toast.error(msg);
  }
};
```

- [ ] **Step 4: Add resetForm to clear new fields**

```tsx
const resetForm = () => {
  setTitle('');
  setDescription('');
  setDate(defaultDate);
  setStartTime('09:00');
  setEndTime('10:00');
  setAllDay(false);
  setLocation('');
  setCategory('personal');
  setPriority('none');
  setRecurrence({ frequency: 'none', interval: 1, byWeekday: [], byMonthday: [], endType: 'never' });
  setReminders([]);
};
```

- [ ] **Step 5: Run lint check and verify no type errors**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/CreateEventDialog.tsx
git commit -m "feat(ui): expand CreateEventDialog with category, priority, recurrence, and reminders"
```

---

### Task 9: WeekView with proportional time blocks and category colors

**Files:**
- Modify: `src/components/calendar/WeekView.tsx`

- [ ] **Step 1: Replace chip-based rendering with proportional blocks**

Update `WeekView.tsx` to use `calculateEventPosition` and `getCategoryStyle`:

```tsx
import { calculateEventPosition, getCategoryStyle } from './calendar-utils';
```

Replace the current per-cell rendering with a positioned overlay approach:

```tsx
const HOUR_HEIGHT_PX = 56; // 3.5rem = 56px
const GRID_START_HOUR = 6;

function WeekEventBlock({
  item,
  onItemClick,
}: {
  item: AgendaItem;
  onItemClick: (item: AgendaItem) => void;
}) {
  const pos = calculateEventPosition(
    item.display_start_at,
    item.display_end_at,
    GRID_START_HOUR,
    item.metadata?.all_day === true,
  );

  if (pos.topSlots < 0) return null; // all-day handled separately

  const catStyle = getCategoryStyle(
    (item.metadata?.event_kind as string) ?? item.badge,
  );
  const top = pos.topSlots * HOUR_HEIGHT_PX;
  const height = Math.max(pos.heightSlots * HOUR_HEIGHT_PX, HOUR_HEIGHT_PX * 0.5);

  return (
    <button
      type="button"
      onClick={() => onItemClick(item)}
      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-left text-xs overflow-hidden border-l-2 ${catStyle.bg}`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        borderLeftColor: catStyle.color,
      }}
    >
      <span className="font-medium truncate block">{item.title}</span>
      {pos.heightSlots >= 1 && (
        <span className="text-muted-foreground truncate block">
          {format(parseISO(item.display_start_at), 'HH:mm')}
          {item.display_end_at && ` - ${format(parseISO(item.display_end_at), 'HH:mm')}`}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Add all-day row at top of each day column**

Before the hour grid, render all-day items:

```tsx
function AllDayRow({ items, onItemClick }: { items: AgendaItem[]; onItemClick: (item: AgendaItem) => void }) {
  const allDayItems = items.filter((i) => i.metadata?.all_day === true);
  if (allDayItems.length === 0) return null;
  return (
    <div className="flex gap-1 px-1 py-0.5 min-h-[1.5rem] border-b bg-muted/30">
      {allDayItems.map((item) => {
        const catStyle = getCategoryStyle(
          (item.metadata?.event_kind as string) ?? item.badge,
        );
        return (
          <button
            key={item.dedup_key}
            type="button"
            onClick={() => onItemClick(item)}
            className={`rounded px-1.5 py-0.5 text-xs truncate border-l-2 ${catStyle.bg}`}
            style={{ borderLeftColor: catStyle.color }}
          >
            {item.title}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update day column to use relative positioning for blocks**

Each day column becomes a relative container with absolute positioned event blocks:

```tsx
<div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT_PX}px` }}>
  {/* Hour grid lines */}
  {HOURS.map((hour) => (
    <div
      key={hour}
      className="absolute left-0 right-0 border-t border-border/50"
      style={{ top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT_PX}px`, height: `${HOUR_HEIGHT_PX}px` }}
    />
  ))}
  {/* Event blocks */}
  {timedItems.map((item) => (
    <WeekEventBlock key={item.dedup_key} item={item} onItemClick={onItemClick} />
  ))}
  {/* Now indicator */}
  {isToday && <NowIndicator gridStartHour={GRID_START_HOUR} hourHeight={HOUR_HEIGHT_PX} />}
</div>
```

- [ ] **Step 4: Run lint and visual check**

Run: `pnpm exec tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/WeekView.tsx
git commit -m "feat(ui): WeekView with proportional time blocks and category-colored event rendering"
```

---

### Task 10: CalendarPage updates — ownership chooser, category filters, MonthView click behavior

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/components/calendar/MonthView.tsx`
- Modify: `src/components/calendar/CalendarFilters.tsx`

- [ ] **Step 1: Integrate OwnershipChooser into CalendarPage**

In `src/pages/CalendarPage.tsx`, replace the direct `CreateEventDialog` trigger:

```tsx
import { OwnershipChooser, type OwnershipChoice } from '@/components/calendar/OwnershipChooser';

// State
const [chooserOpen, setChooserOpen] = useState(false);
const [createAgendaOpen, setCreateAgendaOpen] = useState(false);

const handleNewClick = () => setChooserOpen(true);

const handleOwnershipChoice = (choice: OwnershipChoice) => {
  setChooserOpen(false);
  if (choice === 'agenda') {
    setCreateAgendaOpen(true);
  } else {
    // Navigate to financial creation page
    navigate('/contas?novo=1');
  }
};
```

Update the header button:

```tsx
<Button onClick={handleNewClick}>
  <Plus className="mr-2 h-4 w-4" />
  Novo
</Button>
```

Add both dialogs:

```tsx
<OwnershipChooser open={chooserOpen} onOpenChange={setChooserOpen} onChoose={handleOwnershipChoice} />
<CreateEventDialog open={createAgendaOpen} onOpenChange={setCreateAgendaOpen} defaultDate={anchor} onSuccess={() => refetch()} />
```

- [ ] **Step 2: Add category filter state and sidebar**

```tsx
const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
  new Set(['personal', 'work', 'mentoring', 'financial', 'external']),
);

const toggleCategory = (cat: string) => {
  setEnabledCategories((prev) => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    return next;
  });
};

// Filter items by category
const categoryFilteredItems = filteredItems.filter((item) => {
  const kind = (item.metadata?.event_kind as string) ?? 'personal';
  return enabledCategories.has(kind);
});
```

- [ ] **Step 3: Update MonthView click behavior**

In `src/components/calendar/MonthView.tsx`, change the day click handler to NOT switch to DayView. Instead, emit a `onDayClick` callback that CalendarPage uses to open creation:

```tsx
// MonthView props change:
interface MonthViewProps {
  anchor: Date;
  items: AgendaItem[];
  onItemClick: (item: AgendaItem) => void;
  onDayClick: (date: Date) => void; // new: replaces view switching
}

// In the day cell click handler:
<button onClick={() => onDayClick(day)} ...>
```

In CalendarPage:

```tsx
const handleDayClick = (date: Date) => {
  setAnchor(date);
  setCreateDefaultDate(date);
  setChooserOpen(true);
};
```

- [ ] **Step 4: Replace CalendarFilters with category checkboxes**

In `src/components/calendar/CalendarFilters.tsx`, replace the dropdown with category checkboxes:

```tsx
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORY_STYLES } from './calendar-utils';

const FILTER_CATEGORIES = ['personal', 'work', 'mentoring', 'financial', 'external'] as const;

interface CategoryFilterProps {
  enabled: Set<string>;
  onToggle: (category: string) => void;
}

export function CategoryFilter({ enabled, onToggle }: CategoryFilterProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Categorias
      </p>
      {FILTER_CATEGORIES.map((cat) => {
        const style = CATEGORY_STYLES[cat];
        return (
          <label
            key={cat}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Checkbox
              checked={enabled.has(cat)}
              onCheckedChange={() => onToggle(cat)}
            />
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: style.color }}
            />
            <span className="text-sm">{style.label}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run lint and type check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/CalendarPage.tsx src/components/calendar/MonthView.tsx src/components/calendar/CalendarFilters.tsx
git commit -m "feat(ui): ownership chooser, category filter sidebar, and MonthView click opens creation"
```

---

### Task 11: Expand AgendaItemSheet with reminders, recurrence, sync status

**Files:**
- Modify: `src/components/calendar/AgendaItemSheet.tsx`

- [ ] **Step 1: Show category badge with color**

```tsx
import { getCategoryStyle } from './calendar-utils';

// In the detail rendering:
const eventKind = (item.metadata?.event_kind as string) ?? item.badge;
const catStyle = getCategoryStyle(eventKind);

// Add to the sheet body:
<div className="flex items-center gap-2">
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${catStyle.bg} ${catStyle.text}`}
  >
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: catStyle.color }} />
    {catStyle.label}
  </span>
</div>
```

- [ ] **Step 2: Show priority if present**

```tsx
const priority = (item.metadata?.priority as string) ?? null;
{priority && (
  <div className="text-sm">
    <span className="text-muted-foreground">Prioridade: </span>
    <span className="capitalize">{priority}</span>
  </div>
)}
```

- [ ] **Step 3: Show recurrence info if present**

```tsx
const isRecurring = item.metadata?.is_recurring === true || item.metadata?.recurrence_frequency;
{isRecurring && (
  <div className="flex items-center gap-1.5 text-sm">
    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
    <span>Recorrente</span>
  </div>
)}
```

- [ ] **Step 4: Show sync status if linked**

```tsx
const syncProvider = (item.metadata?.sync_provider as string) ?? null;
const syncStatus = (item.metadata?.sync_status as string) ?? null;
{syncProvider && (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Globe className="h-3 w-3" />
    <span>
      {syncProvider === 'ticktick' ? 'TickTick' : syncProvider}
      {syncStatus === 'synced' && ' - Sincronizado'}
      {syncStatus === 'pending' && ' - Pendente'}
      {syncStatus === 'remote_deleted' && ' - Removido do provider'}
    </span>
  </div>
)}
```

- [ ] **Step 5: Run lint check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/AgendaItemSheet.tsx
git commit -m "feat(ui): expand AgendaItemSheet with category, priority, recurrence, and sync status"
```

---

### Task 12: Clara category inference and reminder configuration

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts`
- Modify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Create: `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-category.test.ts`

- [ ] **Step 1: Write failing tests for category extraction**

Create `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-category.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractCategoryHint } from '../calendar-intent-parser.ts';

describe('extractCategoryHint', () => {
  it('extracts mentoring from "mentoria com Fabiola"', () => {
    expect(extractCategoryHint('mentoria com Fabiola')).toBe('mentoring');
  });
  it('extracts work from "reuniao de trabalho"', () => {
    expect(extractCategoryHint('reuniao de trabalho')).toBe('work');
  });
  it('extracts work from "call com o time"', () => {
    expect(extractCategoryHint('call com o time')).toBe('work');
  });
  it('returns personal for "dentista amanha"', () => {
    expect(extractCategoryHint('dentista amanha')).toBe('personal');
  });
  it('extracts mentoring from "mentoring session"', () => {
    expect(extractCategoryHint('mentoring session')).toBe('mentoring');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-category.test.ts`
Expected: FAIL — `extractCategoryHint` not defined

- [ ] **Step 3: Implement `extractCategoryHint`**

In `calendar-intent-parser.ts`, add:

```typescript
const MENTORING_PATTERNS = [
  /\bmentoria\b/i,
  /\bmentoring\b/i,
  /\bmentorado\b/i,
];

const WORK_PATTERNS = [
  /\btrabalho\b/i,
  /\breuniao\b/i,
  /\breunião\b/i,
  /\bmeeting\b/i,
  /\bcall\b/i,
  /\bsync\b/i,
  /\b1:1\b/i,
  /\btime\b/i,
  /\bsprint\b/i,
  /\bdaily\b/i,
  /\bretro\b/i,
];

export function extractCategoryHint(text: string): string {
  for (const pattern of MENTORING_PATTERNS) {
    if (pattern.test(text)) return 'mentoring';
  }
  for (const pattern of WORK_PATTERNS) {
    if (pattern.test(text)) return 'work';
  }
  return 'personal';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-category.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Add `categoryHint` to `CalendarParsedIntent`**

In `calendar-intent-parser.ts`, extend the interface:

```typescript
export interface CalendarParsedIntent {
  intent: CalendarIntentType;
  title?: string;
  rawText: string;
  reminderOffsetMinutes?: number;
  dateHint?: string;
  timeHint?: string;
  recurrenceHint?: string;
  categoryHint?: string;
}
```

In `parseCalendarIntent`, add to the `create` branch:

```typescript
const categoryHint = extractCategoryHint(text);
// ...
return {
  intent: 'create',
  title: extractedTitle,
  rawText: text,
  recurrenceHint,
  reminderOffsetMinutes: reminderOffset,
  categoryHint,
};
```

- [ ] **Step 6: Update `criarEvento` in handler to use categoryHint**

In `calendar-handler.ts`, modify `criarEvento`:

```typescript
async function criarEvento(
  userId: string,
  phone: string,
  title: string,
  reminderOffsetMinutes?: number,
  recurrenceHint?: string,
  categoryHint?: string,
) {
  // ... existing logic ...
  // Pass category to create_calendar_event RPC:
  const eventKind = categoryHint || 'personal';
  // In buildCreateCalendarEventRpcArgs, add p_event_kind: eventKind
```

Update the `processarComandoAgenda` switch to pass `categoryHint`:

```typescript
case 'create':
  return criarEvento(
    userId,
    phone,
    parsed.title!,
    parsed.reminderOffsetMinutes,
    parsed.recurrenceHint,
    parsed.categoryHint,
  );
```

- [ ] **Step 7: Run all WhatsApp tests**

Run: `pnpm exec vitest run supabase/functions/process-whatsapp-message/__tests__/`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/process-whatsapp-message/
git commit -m "feat(clara): add category inference for event creation and pass to create RPC"
```

---

### Task 13: Deploy, smoke test, and final verification

**Files:**
- Deploy: `calendar-sync-ticktick`, `process-whatsapp-message`, `calendar-dispatch-reminders`
- Schema: apply `external_payload_hash` column if needed

- [ ] **Step 1: Run full test suite**

Run: `pnpm exec vitest run`
Expected: ALL PASS

- [ ] **Step 2: Run type check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Apply schema migration for `external_payload_hash`**

If the column was not already added, apply surgically:

```sql
ALTER TABLE public.calendar_external_event_links
  ADD COLUMN IF NOT EXISTS external_payload_hash TEXT;
```

Register in `schema_migrations` if using surgical approach.

- [ ] **Step 4: Deploy edge functions**

```bash
npx supabase functions deploy calendar-sync-ticktick --project-ref sbnpmhmvcspwcyjhftlw
npx supabase functions deploy process-whatsapp-message --project-ref sbnpmhmvcspwcyjhftlw
npx supabase functions deploy calendar-dispatch-reminders --project-ref sbnpmhmvcspwcyjhftlw
```

- [ ] **Step 5: Verify frontend builds**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Manual smoke test checklist**

- [ ] OwnershipChooser opens when clicking "Novo" on agenda page
- [ ] Choosing "Compromisso de agenda" opens expanded CreateEventDialog
- [ ] Choosing "Obrigacao financeira" navigates to contas
- [ ] Category, priority, recurrence, and reminders fields work in CreateEventDialog
- [ ] WeekView shows events with proportional height and category colors
- [ ] Category filter checkboxes show/hide events correctly
- [ ] AgendaItemSheet shows category badge, priority, sync status
- [ ] MonthView click on day opens chooser (not DayView switch)

- [ ] **Step 7: Commit final state**

```bash
git add -A
git commit -m "feat: Agenda + TickTick Closure V1 — full bidirectional sync, expanded UI, category system"
```

---

## Self-Review Checklist

### Spec Coverage
| Spec Section | Task(s) |
|-------------|---------|
| A.3 TRIGGER mapping | Task 1 (parser), Task 2 (outbound), Task 3 (inbound) |
| A.4 RRULE mapping | Task 1 (parser), Task 2 (outbound), Task 3 (inbound) |
| A.5 Project/list mapping | Uses existing `ticktick_default_list_mappings` |
| A.6 Bidirectional cycle | Task 2 (outbound enrichment), Task 3 (inbound enrichment) |
| A.7 Gaps | All 9 gaps addressed across Tasks 1-3 |
| A.8 Hash-based detection | Task 1 (hash builder), Task 3 (integration) |
| B.1 Categories | Task 5 (styles), Task 6 (CategorySelect), Task 10 (filter) |
| B.2 Proportional blocks | Task 5 (positioning), Task 9 (WeekView) |
| B.3 Click behavior | Task 10 (MonthView, CalendarPage) |
| B.4 Expanded modal + chooser | Task 6 (chooser), Task 7 (recurrence/reminders), Task 8 (integration) |
| B.5 Financial modal | Task 10 (navigate to contas) |
| B.6 Page layout | Task 10 (CalendarPage) |
| B.7 Color badges | Task 5 (utils), Task 9 (WeekView), Task 11 (sheet) |
| C.1-C.4 Reminders | Task 1 (TRIGGER), Task 2 (outbound), Task 3 (inbound), Task 7 (ReminderList) |
| D.1-D.3 Clara | Task 12 (category inference, reminder config) |

### Placeholder Scan
No TBD, TODO, or "implement later" found.

### Type Consistency
- `RecurrenceFields` used in Task 1, 2, 3 — consistent interface
- `OutboundEnrichment` defined in Task 2, used in Task 2
- `ReminderEntry` defined in Task 7, used in Task 8
- `RecurrenceConfig` defined in Task 7, used in Task 8
- `CategoryStyle` defined in Task 5, used in Tasks 9, 10, 11
- `OwnershipChoice` defined in Task 6, used in Task 10
- `EventKind` defined in Task 4, used in CategorySelect
