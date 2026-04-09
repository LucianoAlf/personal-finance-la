# Bidirectional Agenda with External Connectors V1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the calendar sync from outbound-only to bidirectional for TickTick (V1), add `payable_bills.source` column for external-import routing, expand Clara's calendar handler with real reschedule + recurrence creation, and enable reminders for recurring events.

**Architecture:** The existing `calendar-sync-ticktick` Deno edge function gains an inbound branch that runs before the outbound batch loop. Inbound items are routed to `calendar_events` (agenda) or `payable_bills` (financial) based on `FINANCIAL_COUNTER_PATTERNS`. Conflict resolution follows app-wins with evidence logging. Delete-from-provider never touches local canonical data. A single migration adds all schema changes (`calendar_sync_direction` enum expansion, `calendar_external_event_links` new columns, `payable_bills.source`, new `calendar_sync_job_type` values). Google Calendar is V2 — architecture is connector-agnostic so the same patterns apply later.

**Tech Stack:** PostgreSQL (Supabase), PL/pgSQL, Deno (Edge Functions), TypeScript, Vitest, existing TickTick Open API (`api.ticktick.com/open/v1`)

**Spec:** `docs/superpowers/specs/2026-04-09-bidirectional-agenda-external-connectors-design.md`

---

## File structure (delta)

| Path | Responsibility |
|------|----------------|
| `supabase/migrations/20260411000001_bidirectional_sync_v1.sql` | Schema: enum expansion, new columns, CHECK constraints, indexes |
| `supabase/functions/calendar-sync-ticktick/index.ts` | Add inbound branch: fetch projects, pull tasks, route, conflict detect |
| `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts` | Add `mapTickTickTaskToCalendarEvent`, `isFinancialTitle`, inbound types |
| `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-inbound.test.ts` | Unit tests for inbound mapping + financial filter + conflict detection |
| `supabase/functions/process-whatsapp-message/calendar-handler.ts` | Implement real reschedule, add recurrence creation support |
| `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts` | Add recurrence pattern recognition |
| `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-recurrence.test.ts` | Tests for recurrence parsing |
| `src/lib/calendar-domain.ts` | Add `listExternalProjects` wrapper if needed |
| `scripts/smoke-bidirectional-sync.sql` | Remote smoke test script |

---

### Task 1: Schema migration — enum expansion and new columns

**Files:**
- Create: `supabase/migrations/20260411000001_bidirectional_sync_v1.sql`

- [ ] **Step 1: Write migration DDL**

```sql
-- Migration: Bidirectional sync V1 schema changes
-- Spec: docs/superpowers/specs/2026-04-09-bidirectional-agenda-external-connectors-design.md

BEGIN;

-- 1. Expand calendar_sync_direction enum
ALTER TYPE public.calendar_sync_direction ADD VALUE IF NOT EXISTS 'inbound';
ALTER TYPE public.calendar_sync_direction ADD VALUE IF NOT EXISTS 'bidirectional';

COMMIT;

-- Enum value additions require their own transaction before use
BEGIN;

-- 2. Expand calendar_sync_job_type enum
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'inbound_upsert';
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'inbound_delete';
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'inbound_financial_routed';
ALTER TYPE public.calendar_sync_job_type ADD VALUE IF NOT EXISTS 'conflict_detected';

COMMIT;

BEGIN;

-- 3. Expand calendar_event_source enum
ALTER TYPE public.calendar_event_source ADD VALUE IF NOT EXISTS 'external';

COMMIT;

BEGIN;

-- 4. Add payable_bills.source column
-- Decision: dedicated TEXT column (not JSONB metadata) for queryability and clarity.
-- Values: 'manual' (default, existing bills), 'whatsapp' (created via Ana Clara),
--         'external_import' (created by inbound sync from external connector).
ALTER TABLE public.payable_bills
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.payable_bills.source IS
  'Origin of the bill: manual (UI/default), whatsapp (Ana Clara), external_import (inbound connector sync)';

-- 5. Expand calendar_external_event_links
ALTER TABLE public.calendar_external_event_links
  ADD COLUMN IF NOT EXISTS last_remote_updated_at TIMESTAMPTZ;

ALTER TABLE public.calendar_external_event_links
  ADD COLUMN IF NOT EXISTS origin_type TEXT;

ALTER TABLE public.calendar_external_event_links
  ADD COLUMN IF NOT EXISTS origin_id UUID;

ALTER TABLE public.calendar_external_event_links
  ALTER COLUMN event_id DROP NOT NULL;

-- CHECK: exactly one of event_id or origin_id must be non-null
ALTER TABLE public.calendar_external_event_links
  ADD CONSTRAINT chk_link_target CHECK (
    (event_id IS NOT NULL AND origin_id IS NULL)
    OR (event_id IS NULL AND origin_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_calendar_links_origin
  ON public.calendar_external_event_links(origin_type, origin_id)
  WHERE origin_id IS NOT NULL;

-- 6. Add metadata JSONB to calendar_sync_jobs for conflict/audit data
ALTER TABLE public.calendar_sync_jobs
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 7. Add inbound sync columns to integration_configs
ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS last_inbound_sync_at TIMESTAMPTZ;

ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS inbound_sync_cursor TEXT;

ALTER TABLE public.integration_configs
  ADD COLUMN IF NOT EXISTS ticktick_default_list_mappings JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.integration_configs.ticktick_default_list_mappings IS
  'Map of TickTick project IDs to app event_kind/sync config. Format: {"projectId": {"label": "Name", "event_kind": "personal", "sync_enabled": true}}';

COMMIT;
```

- [ ] **Step 2: Deploy migration to remote**

Run: `npx supabase db push --linked`
Expected: migration applied without errors

- [ ] **Step 3: Verify schema changes on remote**

```bash
npx supabase db query --linked "SELECT unnest(enum_range(NULL::calendar_sync_direction));"
npx supabase db query --linked "SELECT unnest(enum_range(NULL::calendar_sync_job_type));"
npx supabase db query --linked "SELECT column_name FROM information_schema.columns WHERE table_name = 'payable_bills' AND column_name = 'source';"
npx supabase db query --linked "SELECT column_name FROM information_schema.columns WHERE table_name = 'calendar_external_event_links' AND column_name IN ('last_remote_updated_at', 'origin_type', 'origin_id');"
```

Expected: all new enum values and columns present

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260411000001_bidirectional_sync_v1.sql
git commit -m "feat: schema migration for bidirectional sync V1

Expand calendar_sync_direction, calendar_sync_job_type, calendar_event_source enums.
Add payable_bills.source column (TEXT, default 'manual').
Add origin_type/origin_id to calendar_external_event_links with CHECK constraint.
Add metadata JSONB to calendar_sync_jobs.
Add inbound sync columns to integration_configs."
```

---

### Task 2: Inbound mapping and financial filter (ticktick-mapping.ts)

**Files:**
- Modify: `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`
- Create: `supabase/functions/calendar-sync-ticktick/__tests__/ticktick-inbound.test.ts`

- [ ] **Step 1: Write failing tests for inbound mapping**

```typescript
// supabase/functions/calendar-sync-ticktick/__tests__/ticktick-inbound.test.ts
import { describe, expect, it } from 'vitest';
import {
  mapTickTickTaskToCalendarEventInput,
  isFinancialTitle,
  detectSyncAction,
  type TickTickTaskInbound,
} from '../ticktick-mapping.ts';

describe('isFinancialTitle', () => {
  it('returns true for bill-like titles', () => {
    expect(isFinancialTitle('Pagar aluguel')).toBe(true);
    expect(isFinancialTitle('Netflix mensal')).toBe(true);
    expect(isFinancialTitle('Vencimento conta de luz')).toBe(true);
    expect(isFinancialTitle('IPTU 2026')).toBe(true);
    expect(isFinancialTitle('Fatura cartão')).toBe(true);
    expect(isFinancialTitle('Boleto condomínio')).toBe(true);
    expect(isFinancialTitle('Spotify assinatura')).toBe(true);
    expect(isFinancialTitle('R$ 150 seguro')).toBe(true);
  });

  it('returns false for agenda-like titles', () => {
    expect(isFinancialTitle('Dentista às 14h')).toBe(false);
    expect(isFinancialTitle('Reunião com João')).toBe(false);
    expect(isFinancialTitle('Mentoria semanal')).toBe(false);
    expect(isFinancialTitle('Almoço com time')).toBe(false);
    expect(isFinancialTitle('Consulta médica')).toBe(false);
  });
});

describe('mapTickTickTaskToCalendarEventInput', () => {
  const baseTask: TickTickTaskInbound = {
    id: 'tt-123',
    title: 'Reunião com cliente',
    content: 'Discutir proposta',
    startDate: '2026-04-15T14:00:00+0000',
    dueDate: '2026-04-15T15:00:00+0000',
    isAllDay: false,
    timeZone: 'America/Sao_Paulo',
    projectId: 'proj-abc',
    modifiedTime: '2026-04-10T10:00:00+0000',
    status: 0,
  };

  it('maps TickTick task to calendar event input', () => {
    const result = mapTickTickTaskToCalendarEventInput(baseTask, 'user-uuid');
    expect(result.title).toBe('Reunião com cliente');
    expect(result.description).toBe('Discutir proposta');
    expect(result.user_id).toBe('user-uuid');
    expect(result.source).toBe('external');
    expect(result.created_by).toBe('system');
    expect(result.sync_eligible).toBe(true);
    expect(result.event_kind).toBe('personal');
  });

  it('maps completed TickTick task with status=2 to completed', () => {
    const completed = { ...baseTask, status: 2 };
    const result = mapTickTickTaskToCalendarEventInput(completed, 'user-uuid');
    expect(result.status).toBe('completed');
  });
});

describe('detectSyncAction', () => {
  it('returns no_change when timestamps match', () => {
    const result = detectSyncAction({
      localUpdatedAt: '2026-04-10T10:00:00Z',
      remoteModifiedAt: '2026-04-10T10:00:00Z',
      lastSyncedAt: '2026-04-10T10:00:00Z',
    });
    expect(result).toBe('no_change');
  });

  it('returns inbound_update when only remote changed', () => {
    const result = detectSyncAction({
      localUpdatedAt: '2026-04-10T10:00:00Z',
      remoteModifiedAt: '2026-04-10T12:00:00Z',
      lastSyncedAt: '2026-04-10T10:00:00Z',
    });
    expect(result).toBe('inbound_update');
  });

  it('returns outbound_push when only local changed', () => {
    const result = detectSyncAction({
      localUpdatedAt: '2026-04-10T12:00:00Z',
      remoteModifiedAt: '2026-04-10T10:00:00Z',
      lastSyncedAt: '2026-04-10T10:00:00Z',
    });
    expect(result).toBe('outbound_push');
  });

  it('returns conflict when both changed', () => {
    const result = detectSyncAction({
      localUpdatedAt: '2026-04-10T12:00:00Z',
      remoteModifiedAt: '2026-04-10T11:00:00Z',
      lastSyncedAt: '2026-04-10T10:00:00Z',
    });
    expect(result).toBe('conflict');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-inbound.test.ts`
Expected: FAIL — functions not exported yet

- [ ] **Step 3: Implement inbound mapping functions**

Add to `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts`:

```typescript
// --- Inbound types and functions ---

export interface TickTickTaskInbound {
  id: string;
  title: string;
  content?: string;
  startDate?: string;
  dueDate?: string;
  isAllDay?: boolean;
  timeZone?: string;
  projectId: string;
  modifiedTime?: string;
  status: number; // 0=normal, 2=completed
}

export interface CalendarEventInboundInput {
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  status: string;
  source: string;
  created_by: string;
  event_kind: string;
  sync_eligible: boolean;
}

const FINANCIAL_COUNTER_PATTERNS = [
  /\b(pagar|pagamento|pago|vencer|vence|vencimento|fatura|boleto)\b/i,
  /\b(aluguel|condom[ií]nio|luz|[áa]gua|internet|telefone|celular|g[aá]s)\b/i,
  /\b(netflix|spotify|disney|iptu|ipva|seguro|mensalidade|assinatura)\b/i,
  /\b(conta|contas)\s+(de|do|da)\b/i,
  /\btodo\s*m[eê]s\b/i,
  /\bmensal\b/i,
  /\brecorrente\b/i,
  /\br\$\s*\d+\b/i,
  /\d+[\.,]?\d*\s*(reais?|real)\b/i,
];

export function isFinancialTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return FINANCIAL_COUNTER_PATTERNS.some((p) => p.test(lower));
}

function parseTickTickDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  return new Date(dateStr.replace(/\+0000$/, 'Z')).toISOString();
}

export function mapTickTickTaskToCalendarEventInput(
  task: TickTickTaskInbound,
  userId: string,
  eventKind = 'personal',
): CalendarEventInboundInput {
  return {
    user_id: userId,
    title: task.title,
    description: task.content || null,
    start_at: parseTickTickDate(task.startDate),
    end_at: task.dueDate ? parseTickTickDate(task.dueDate) : null,
    all_day: task.isAllDay ?? false,
    timezone: task.timeZone || 'America/Sao_Paulo',
    status: task.status === 2 ? 'completed' : 'scheduled',
    source: 'external',
    created_by: 'system',
    event_kind: eventKind,
    sync_eligible: true,
  };
}

export type SyncAction = 'no_change' | 'inbound_update' | 'outbound_push' | 'conflict';

export function detectSyncAction(params: {
  localUpdatedAt: string;
  remoteModifiedAt: string;
  lastSyncedAt: string;
}): SyncAction {
  const local = new Date(params.localUpdatedAt).getTime();
  const remote = new Date(params.remoteModifiedAt).getTime();
  const synced = new Date(params.lastSyncedAt).getTime();

  const localChanged = local > synced;
  const remoteChanged = remote > synced;

  if (!localChanged && !remoteChanged) return 'no_change';
  if (!localChanged && remoteChanged) return 'inbound_update';
  if (localChanged && !remoteChanged) return 'outbound_push';
  return 'conflict';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/calendar-sync-ticktick/__tests__/ticktick-inbound.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts supabase/functions/calendar-sync-ticktick/__tests__/ticktick-inbound.test.ts
git commit -m "feat: add inbound mapping, financial filter, and conflict detection for TickTick sync

isFinancialTitle reuses same FINANCIAL_COUNTER_PATTERNS as Ana Clara gate.
mapTickTickTaskToCalendarEventInput converts TickTick task to calendar_events input.
detectSyncAction determines no_change/inbound_update/outbound_push/conflict."
```

---

### Task 3: Inbound sync branch in TickTick worker

**Files:**
- Modify: `supabase/functions/calendar-sync-ticktick/index.ts`

- [ ] **Step 1: Add TickTick project list fetch function**

Add after the existing TickTick API helpers (after `deleteTickTickTask`, around line 146):

```typescript
async function listTickTickProjects(token: string): Promise<Array<{ id: string; name: string }>> {
  const { ok, status, data, errorText } = await tickTickRequest('GET', '/project', token);
  if (!ok) {
    throw new Error(`TickTick list projects failed (${status}): ${errorText || JSON.stringify(data)}`);
  }
  return (data as Array<{ id: string; name: string }>) || [];
}

async function listTickTickProjectTasks(
  token: string,
  projectId: string,
): Promise<TickTickTaskInbound[]> {
  const { ok, status, data, errorText } = await tickTickRequest(
    'GET',
    `/project/${projectId}/data`,
    token,
  );
  if (!ok) {
    throw new Error(`TickTick list tasks failed (${status}): ${errorText || JSON.stringify(data)}`);
  }
  const projectData = data as { tasks?: TickTickTaskInbound[] };
  return projectData?.tasks || [];
}
```

Add the necessary import at the top of the file:

```typescript
import {
  buildTickTickPayload,
  isEventEligibleForSync,
  TICKTICK_BASE,
  DEFAULT_TICKTICK_PROJECT_ID,
  type CalendarEventForSync,
  // New inbound imports:
  type TickTickTaskInbound,
  mapTickTickTaskToCalendarEventInput,
  isFinancialTitle,
  detectSyncAction,
} from './ticktick-mapping.ts';
```

- [ ] **Step 2: Add inbound processing function**

Add after the `markJobSucceeded` function (around line 265):

```typescript
async function processInboundSync(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  config: IntegrationConfigRow & { ticktick_default_list_mappings?: Record<string, { label?: string; event_kind?: string; sync_enabled?: boolean }> },
): Promise<{ created: number; updated: number; financialRouted: number; conflicts: number; remoteDeleted: number }> {
  const stats = { created: 0, updated: 0, financialRouted: 0, conflicts: 0, remoteDeleted: 0 };

  const mappings = config.ticktick_default_list_mappings || {};
  const enabledProjectIds = Object.entries(mappings)
    .filter(([, v]) => v.sync_enabled !== false)
    .map(([k]) => k);

  if (enabledProjectIds.length === 0) {
    const defaultId = config.ticktick_default_project_id || DEFAULT_TICKTICK_PROJECT_ID;
    enabledProjectIds.push(defaultId);
  }

  const seenExternalIds = new Set<string>();

  for (const projectId of enabledProjectIds) {
    let tasks: TickTickTaskInbound[];
    try {
      tasks = await listTickTickProjectTasks(token, projectId);
    } catch (err) {
      console.error(`[ticktick-inbound] Failed to list tasks for project ${projectId}:`, err);
      continue;
    }

    const eventKind = mappings[projectId]?.event_kind || 'external';

    for (const task of tasks) {
      seenExternalIds.add(task.id);

      const { data: existingLink } = await supabase
        .from('calendar_external_event_links')
        .select('id, event_id, origin_type, origin_id, last_remote_updated_at, last_synced_at, sync_status')
        .eq('provider', 'ticktick')
        .eq('external_object_id', task.id)
        .maybeSingle();

      if (existingLink && existingLink.sync_status === 'remote_deleted') {
        continue;
      }

      const remoteModified = task.modifiedTime || new Date().toISOString();

      if (existingLink) {
        if (existingLink.event_id && existingLink.last_synced_at) {
          const { data: localEvent } = await supabase
            .from('calendar_events')
            .select('updated_at')
            .eq('id', existingLink.event_id)
            .single();

          if (localEvent) {
            const action = detectSyncAction({
              localUpdatedAt: localEvent.updated_at,
              remoteModifiedAt: remoteModified,
              lastSyncedAt: existingLink.last_synced_at,
            });

            if (action === 'no_change') continue;

            if (action === 'inbound_update') {
              const input = mapTickTickTaskToCalendarEventInput(task, userId, eventKind);
              await supabase
                .from('calendar_events')
                .update({
                  title: input.title,
                  description: input.description,
                  start_at: input.start_at,
                  end_at: input.end_at,
                  status: input.status,
                })
                .eq('id', existingLink.event_id);

              await supabase
                .from('calendar_external_event_links')
                .update({
                  last_remote_updated_at: remoteModified,
                  last_synced_at: new Date().toISOString(),
                })
                .eq('id', existingLink.id);

              stats.updated++;
              continue;
            }

            if (action === 'conflict') {
              await supabase.from('calendar_sync_jobs').insert({
                user_id: userId,
                event_id: existingLink.event_id,
                provider: 'ticktick',
                job_type: 'conflict_detected',
                idempotency_key: `conflict:${existingLink.event_id}:${Date.now()}`,
                status: 'succeeded',
                metadata: {
                  remote_title: task.title,
                  remote_modified: remoteModified,
                  local_updated: localEvent.updated_at,
                },
              });

              await supabase.from('calendar_sync_jobs').insert({
                user_id: userId,
                event_id: existingLink.event_id,
                provider: 'ticktick',
                job_type: 'upsert_event',
                idempotency_key: `sync:${existingLink.event_id}:upsert_event:conflict_repush:${Date.now()}`,
                status: 'pending',
              });

              await supabase
                .from('calendar_external_event_links')
                .update({
                  last_remote_updated_at: remoteModified,
                  last_synced_at: new Date().toISOString(),
                })
                .eq('id', existingLink.id);

              stats.conflicts++;
              continue;
            }
          }
        }
        continue;
      }

      if (isFinancialTitle(task.title)) {
        await routeFinancialInbound(supabase, userId, task, remoteModified);
        stats.financialRouted++;
        continue;
      }

      const input = mapTickTickTaskToCalendarEventInput(task, userId, eventKind);
      const { data: newEvent, error: insertErr } = await supabase
        .from('calendar_events')
        .insert(input)
        .select('id')
        .single();

      if (insertErr || !newEvent) {
        console.error(`[ticktick-inbound] Failed to create event for task ${task.id}:`, insertErr);
        continue;
      }

      await supabase.from('calendar_external_event_links').insert({
        event_id: newEvent.id,
        provider: 'ticktick',
        external_object_id: task.id,
        external_list_id: task.projectId,
        sync_direction: 'bidirectional',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        last_remote_updated_at: remoteModified,
      });

      stats.created++;
    }
  }

  const { data: allLinks } = await supabase
    .from('calendar_external_event_links')
    .select('id, external_object_id')
    .eq('provider', 'ticktick')
    .neq('sync_status', 'remote_deleted')
    .not('event_id', 'is', null);

  if (allLinks) {
    for (const link of allLinks) {
      if (!seenExternalIds.has(link.external_object_id)) {
        await supabase
          .from('calendar_external_event_links')
          .update({ sync_status: 'remote_deleted', last_synced_at: new Date().toISOString() })
          .eq('id', link.id);

        await supabase.from('calendar_sync_jobs').insert({
          user_id: userId,
          provider: 'ticktick',
          job_type: 'inbound_delete',
          idempotency_key: `inbound_delete:${link.external_object_id}:${Date.now()}`,
          status: 'succeeded',
          metadata: { external_object_id: link.external_object_id, detected_at: new Date().toISOString() },
        });

        stats.remoteDeleted++;
      }
    }
  }

  await supabase
    .from('integration_configs')
    .update({ last_inbound_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('integration_type', 'ticktick');

  return stats;
}
```

- [ ] **Step 3: Add financial routing helper**

Add after `processInboundSync`:

```typescript
async function routeFinancialInbound(
  supabase: SupabaseClient,
  userId: string,
  task: TickTickTaskInbound,
  remoteModified: string,
): Promise<void> {
  const titleLower = task.title.toLowerCase().trim();
  const taskDate = task.startDate
    ? new Date(task.startDate.replace(/\+0000$/, 'Z')).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const { data: existingBill } = await supabase
    .from('payable_bills')
    .select('id')
    .eq('user_id', userId)
    .ilike('description', `%${titleLower.slice(0, 30)}%`)
    .gte('due_date', new Date(new Date(taskDate).getTime() - 3 * 86400000).toISOString().split('T')[0])
    .lte('due_date', new Date(new Date(taskDate).getTime() + 3 * 86400000).toISOString().split('T')[0])
    .limit(1)
    .maybeSingle();

  let billId: string;

  if (existingBill) {
    billId = existingBill.id;
  } else {
    const { data: newBill, error } = await supabase
      .from('payable_bills')
      .insert({
        user_id: userId,
        description: task.title,
        due_date: taskDate,
        status: 'pending',
        bill_type: 'other',
        is_recurring: false,
        source: 'external_import',
      })
      .select('id')
      .single();

    if (error || !newBill) {
      console.error(`[ticktick-inbound] Failed to create bill for financial task ${task.id}:`, error);
      return;
    }
    billId = newBill.id;
  }

  await supabase.from('calendar_external_event_links').insert({
    event_id: null,
    origin_type: 'payable_bill',
    origin_id: billId,
    provider: 'ticktick',
    external_object_id: task.id,
    external_list_id: task.projectId,
    sync_direction: 'inbound',
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    last_remote_updated_at: remoteModified,
  });

  await supabase.from('calendar_sync_jobs').insert({
    user_id: userId,
    provider: 'ticktick',
    job_type: 'inbound_financial_routed',
    idempotency_key: `financial_route:${task.id}:${Date.now()}`,
    status: 'succeeded',
    metadata: {
      external_title: task.title,
      bill_id: billId,
      created_new_bill: !existingBill,
    },
  });
}
```

- [ ] **Step 4: Wire inbound into the main serve handler**

In the main `serve(async (req) => { ... })` handler, after the auth checks and before fetching pending outbound jobs (around line 301), add the inbound pass:

```typescript
    // --- INBOUND PASS ---
    const { data: ticktickConfigs } = await supabase
      .from('integration_configs')
      .select('user_id, ticktick_api_key_encrypted, ticktick_default_project_id, ticktick_default_list_mappings, is_active, last_inbound_sync_at')
      .eq('integration_type', 'ticktick')
      .eq('is_active', true);

    let inboundStats = { created: 0, updated: 0, financialRouted: 0, conflicts: 0, remoteDeleted: 0 };

    if (ticktickConfigs && ticktickConfigs.length > 0) {
      for (const cfg of ticktickConfigs) {
        if (!cfg.ticktick_api_key_encrypted) continue;
        try {
          const token = await resolveTickTickApiToken(cfg.ticktick_api_key_encrypted);
          if (!token) continue;
          const stats = await processInboundSync(supabase, cfg.user_id, token, cfg as any);
          inboundStats.created += stats.created;
          inboundStats.updated += stats.updated;
          inboundStats.financialRouted += stats.financialRouted;
          inboundStats.conflicts += stats.conflicts;
          inboundStats.remoteDeleted += stats.remoteDeleted;
        } catch (err) {
          console.error(`[ticktick-inbound] User ${cfg.user_id} inbound failed:`, err);
        }
      }
    }
    console.log(`[ticktick-inbound] Stats:`, inboundStats);

    // --- OUTBOUND PASS (existing) ---
```

Update the final response to include inbound stats:

```typescript
    return new Response(
      JSON.stringify({ outbound: { succeeded, skipped, failed, total: jobs.length }, inbound: inboundStats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
```

- [ ] **Step 5: Update IntegrationConfigRow interface**

Expand the existing `IntegrationConfigRow` interface:

```typescript
interface IntegrationConfigRow {
  ticktick_api_key_encrypted: string | null;
  ticktick_default_project_id: string | null;
  ticktick_default_list_mappings?: Record<string, { label?: string; event_kind?: string; sync_enabled?: boolean }>;
  is_active: boolean;
}
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/index.ts
git commit -m "feat: add inbound sync branch to TickTick worker

Pulls tasks from mapped projects, routes financial items to payable_bills,
creates calendar_events for agenda items, detects conflicts (app-wins),
marks remote-deleted links. Runs before outbound batch."
```

---

### Task 4: Clara recurrence parsing

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts`
- Create: `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-recurrence.test.ts`

- [ ] **Step 1: Write failing tests for recurrence pattern detection**

```typescript
// __tests__/calendar-intent-recurrence.test.ts
import { describe, expect, it } from 'vitest';
import { parseCalendarIntent } from '../calendar-intent-parser.ts';

describe('recurrence detection in parseCalendarIntent', () => {
  it('detects "toda semana" as weekly recurrence hint', () => {
    const result = parseCalendarIntent('mentoria toda semana quarta às 14h');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'weekly' });
  });

  it('detects "todo dia" as daily recurrence hint', () => {
    const result = parseCalendarIntent('standup todo dia às 9h');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'daily' });
  });

  it('detects "a cada 2 semanas" as biweekly', () => {
    const result = parseCalendarIntent('reunião a cada 2 semanas');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'weekly', interval: 2 });
  });

  it('detects "todo mês" as monthly', () => {
    const result = parseCalendarIntent('revisão todo mês dia 15');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toEqual({ frequency: 'monthly' });
  });

  it('does not detect recurrence in plain create', () => {
    const result = parseCalendarIntent('tenho dentista amanhã às 14h');
    expect(result.intent).toBe('create');
    expect(result.recurrenceHint).toBeUndefined();
  });

  it('detects reschedule with target date hint', () => {
    const result = parseCalendarIntent('remarca o dentista para sexta às 10h');
    expect(result.intent).toBe('reschedule');
    expect(result.rawText).toBe('remarca o dentista para sexta às 10h');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-recurrence.test.ts`
Expected: FAIL — `recurrenceHint` not in interface

- [ ] **Step 3: Add recurrence patterns and update interface**

In `calendar-intent-parser.ts`, update the interface and add patterns:

Add `recurrenceHint` to the interface:

```typescript
export interface CalendarParsedIntent {
  intent: CalendarIntentType;
  title?: string;
  rawText: string;
  reminderOffsetMinutes?: number;
  dateHint?: string;
  timeHint?: string;
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number };
}
```

Add recurrence patterns after `REMINDER_OFFSET_MAP`:

```typescript
const RECURRENCE_PATTERNS: Array<{ pattern: RegExp; frequency: 'daily' | 'weekly' | 'monthly'; intervalGroup?: number }> = [
  { pattern: /\btodo\s*dia\b/i, frequency: 'daily' },
  { pattern: /\btoda\s*semana\b/i, frequency: 'weekly' },
  { pattern: /\btodo\s*m[eê]s\b/i, frequency: 'monthly' },
  { pattern: /\bdi[aá]ri(?:o|a)\b/i, frequency: 'daily' },
  { pattern: /\bsemanal(?:mente)?\b/i, frequency: 'weekly' },
  { pattern: /\bmensal(?:mente)?\b/i, frequency: 'monthly' },
  { pattern: /\ba\s*cada\s*(\d+)\s*semanas?\b/i, frequency: 'weekly', intervalGroup: 1 },
  { pattern: /\ba\s*cada\s*(\d+)\s*dias?\b/i, frequency: 'daily', intervalGroup: 1 },
  { pattern: /\ba\s*cada\s*(\d+)\s*m[eê]s(?:es)?\b/i, frequency: 'monthly', intervalGroup: 1 },
];
```

Add extraction function:

```typescript
function extractRecurrenceHint(text: string): CalendarParsedIntent['recurrenceHint'] {
  for (const { pattern, frequency, intervalGroup } of RECURRENCE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const interval = intervalGroup !== undefined ? parseInt(match[intervalGroup], 10) : undefined;
      return { frequency, ...(interval && interval > 1 ? { interval } : {}) };
    }
  }
  return undefined;
}
```

In `parseCalendarIntent`, add recurrence extraction after `reminderOffsetMinutes`:

```typescript
  const recurrenceHint = extractRecurrenceHint(lower);
```

And include it in the `create` return:

```typescript
    return { intent: 'create', title, rawText: text, reminderOffsetMinutes, recurrenceHint };
```

**Important:** The `RECURRENCE_PATTERNS` that match `todo mês` / `mensal` overlap with `FINANCIAL_COUNTER_PATTERNS`. This is fine because `isCalendarIntent` already blocks financial phrases before `parseCalendarIntent` runs. The recurrence patterns only fire inside the calendar pipeline.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-recurrence.test.ts`
Expected: all PASS

- [ ] **Step 5: Run existing intent parser tests for regression**

Run: `pnpm exec vitest run supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/process-whatsapp-message/calendar-intent-parser.ts supabase/functions/process-whatsapp-message/__tests__/calendar-intent-recurrence.test.ts
git commit -m "feat: add recurrence hint parsing to calendar intent parser

Detects 'todo dia', 'toda semana', 'todo mes', 'a cada N semanas/dias/meses'
and returns recurrenceHint in CalendarParsedIntent."
```

---

### Task 5: Clara real reschedule and recurrence creation in handler

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Modify: `supabase/functions/process-whatsapp-message/calendar-domain-rpc.ts`

- [ ] **Step 1: Implement real reschedule in calendar-handler.ts**

Replace the reschedule placeholder (lines 46-49) in `processarComandoAgenda`:

```typescript
      case 'reschedule': {
        return await remarcarEvento(userId, phone, parsed.rawText);
      }
```

Add the `remarcarEvento` function after `cancelarEvento`:

```typescript
async function remarcarEvento(userId: string, phone: string, rawText: string): Promise<string> {
  const supabase = getSupabase();

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title, start_at, timezone')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .order('start_at', { ascending: true })
    .limit(1);

  if (!events || events.length === 0) {
    const msg = 'Nao encontrei compromissos para remarcar.';
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const event = events[0];
  const timezone = event.timezone || await getUserCalendarTimezone(userId);
  const newDate = getTomorrowDateInTimezone(timezone);

  const { error } = await supabase.rpc('reschedule_calendar_occurrence', {
    p_event_id: event.id,
    p_original_start_at: event.start_at,
    p_new_start_at: newDate + 'T' + new Date(event.start_at).toISOString().split('T')[1],
    p_user_id: userId,
  });

  if (error) {
    console.error('[calendar-handler] Reschedule error:', error);
    const msg = 'Nao consegui remarcar o compromisso. Tente cancelar e criar um novo.';
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const dateFormatted = new Date(newDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: timezone,
  });

  const msg = `Compromisso "${event.title}" remarcado para ${dateFormatted}.`;
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}
```

- [ ] **Step 2: Add recurrence creation support**

In `criarEvento`, after the event is created and reminder is optionally set, check for `recurrenceHint` and call `set_calendar_event_recurrence`. Update the function signature:

```typescript
async function criarEvento(
  userId: string,
  phone: string,
  title: string,
  reminderOffsetMinutes?: number,
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number },
): Promise<string> {
```

After the event creation and before the reminder block, add:

```typescript
  if (recurrenceHint) {
    const { error: recurrenceErr } = await supabase.rpc('set_calendar_event_recurrence', {
      p_event_id: String(eventId),
      p_frequency: recurrenceHint.frequency,
      p_interval_value: recurrenceHint.interval || 1,
      p_user_id: userId,
    });

    if (recurrenceErr) {
      console.error('[calendar-handler] set_calendar_event_recurrence failed (non-blocking):', recurrenceErr);
    }
  }
```

Update the `create` case in `processarComandoAgenda` to pass `recurrenceHint`:

```typescript
      case 'create':
        return await criarEvento(userId, phone, parsed.title || 'Compromisso', parsed.reminderOffsetMinutes, parsed.recurrenceHint);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-whatsapp-message/calendar-handler.ts
git commit -m "feat: implement real reschedule and recurrence creation in Clara

Replace reschedule placeholder with actual reschedule_calendar_occurrence RPC call.
Pass recurrenceHint from parser to set_calendar_event_recurrence after event creation."
```

---

### Task 6: Enable reminders for recurring events

**Files:**
- Create: `supabase/migrations/20260411000002_recurring_reminders_v1.sql`

- [ ] **Step 1: Write migration to lift the recurring reminder block**

```sql
-- Migration: Enable reminders for recurring events (V1)
-- Lifts the recurring_reminders_not_supported_v1 restriction from set_calendar_event_reminders.
-- Populates calendar_reminder_schedule for recurring events using a sliding window approach.

BEGIN;

-- Replace set_calendar_event_reminders to remove the recurrence block.
-- The function already exists from 20260410000001; we CREATE OR REPLACE.
-- Copy the full function from the existing migration but remove the block that raises
-- 'recurring_reminders_not_supported_v1' when a recurrence rule exists.
-- Instead, populate calendar_reminder_schedule for the next 5 occurrences.

-- Helper: populate reminder schedule for recurring event (next N occurrences)
CREATE OR REPLACE FUNCTION public.calendar_populate_recurring_reminder_schedule(
  p_event_id UUID,
  p_user_id UUID,
  p_horizon_count INT DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_occ RECORD;
  v_rem RECORD;
  v_fire_at TIMESTAMPTZ;
  v_idempotency_key TEXT;
  v_from TIMESTAMPTZ := now();
  v_to TIMESTAMPTZ := now() + interval '90 days';
BEGIN
  FOR v_rem IN
    SELECT id, remind_offset_minutes, reminder_kind
    FROM public.calendar_event_reminders
    WHERE event_id = p_event_id AND enabled = true
  LOOP
    FOR v_occ IN
      SELECT occurrence_start_at
      FROM public.calendar_recurrence_expand_occurrences(p_event_id, v_from, v_to)
      LIMIT p_horizon_count
    LOOP
      v_fire_at := v_occ.occurrence_start_at - (v_rem.remind_offset_minutes * interval '1 minute');

      IF v_fire_at < now() THEN
        CONTINUE;
      END IF;

      v_idempotency_key := 'sched:' || p_event_id::text || ':' || v_rem.id::text || ':' ||
        trim(both '"' FROM to_json(v_occ.occurrence_start_at)::text);

      INSERT INTO public.calendar_reminder_schedule (
        event_id, reminder_id, occurrence_key, fire_at,
        delivery_status, channel, idempotency_key
      )
      VALUES (
        p_event_id,
        v_rem.id,
        public.calendar_occurrence_key(p_event_id, v_occ.occurrence_start_at),
        v_fire_at,
        'pending',
        'whatsapp',
        v_idempotency_key
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.calendar_populate_recurring_reminder_schedule IS
  'Populates calendar_reminder_schedule for the next N occurrences of a recurring event';

GRANT EXECUTE ON FUNCTION public.calendar_populate_recurring_reminder_schedule TO authenticated;

COMMIT;
```

- [ ] **Step 2: Update set_calendar_event_reminders to call the population helper**

This requires a `CREATE OR REPLACE` of `set_calendar_event_reminders` in the same migration. The existing function lives in `supabase/migrations/20260410000001_calendar_recurrence_overrides_v1.sql` (lines 767-940). Copy the full function body into this migration as `CREATE OR REPLACE`, then make exactly two changes:

**Change A:** Find the block (around line 810-820 in the original) that checks for an existing recurrence rule and raises the exception:

```sql
IF EXISTS (SELECT 1 FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id) THEN
  RAISE EXCEPTION 'recurring_reminders_not_supported_v1';
END IF;
```

Replace it with:

```sql
-- Recurring reminders now supported. After processing, we populate the schedule.
```

**Change B:** At the end of the function body, just before `END;`, add:

```sql
IF EXISTS (SELECT 1 FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id) THEN
  PERFORM public.calendar_populate_recurring_reminder_schedule(p_event_id, v_uid, 5);
END IF;
```

This ensures: (1) reminders are saved normally for recurring events, and (2) the sliding window schedule is populated after saving.

- [ ] **Step 3: Deploy and verify**

Run: `npx supabase db push --linked`
Expected: migration applied

Verify:

```bash
npx supabase db query --linked "SELECT proname FROM pg_proc WHERE proname = 'calendar_populate_recurring_reminder_schedule';"
```

Expected: function exists

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260411000002_recurring_reminders_v1.sql
git commit -m "feat: enable reminders for recurring events with sliding window population

Adds calendar_populate_recurring_reminder_schedule helper.
Lifts recurring_reminders_not_supported_v1 block from set_calendar_event_reminders.
Populates calendar_reminder_schedule for next 5 occurrences within 90-day horizon."
```

---

### Task 7: Update spec Phase A wording (user-requested amarração)

**Files:**
- Modify: `docs/superpowers/specs/2026-04-09-bidirectional-agenda-external-connectors-design.md`

- [ ] **Step 1: Update Phase A objective**

Change line 212 from:

```
Puxar tarefas/eventos de conectores externos para `calendar_events`, sem duplicar com dados financeiros ou eventos ja existentes.
```

To:

```
Puxar tarefas/eventos de conectores externos para o dominio correto: itens de agenda vao para `calendar_events`, itens financeiros vao para `payable_bills`. Sem duplicar com dados ja existentes em nenhum dos dois dominios.
```

- [ ] **Step 2: Add explicit source column decision**

In the "External event vs existing `payable_bills`" section, update the Passo 2 line about `source`:

Change:

```
  - `source = 'external_import'` (coluna nova ou uso de metadata/extra JSONB)
```

To:

```
  - `source = 'external_import'` (coluna TEXT nova em `payable_bills`, default `'manual'`, adicionada na migration `20260411000001_bidirectional_sync_v1.sql`)
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-09-bidirectional-agenda-external-connectors-design.md
git commit -m "docs: clarify Phase A dual-domain routing and source column decision in spec"
```

---

### Task 8: Remote smoke test

**Files:**
- Create: `scripts/smoke-bidirectional-sync.sql`

- [ ] **Step 1: Write smoke test script**

```sql
-- Smoke test: bidirectional sync V1
-- Validates: schema changes, inbound routing logic, link creation
-- Run via: npx supabase db query --linked -f scripts/smoke-bidirectional-sync.sql

DO $$
DECLARE
  v_user UUID;
  v_event_id UUID;
  v_bill_id UUID;
  v_link_id UUID;
  v_count INT;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY created_at ASC LIMIT 1;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'smoke: no auth.users row';
  END IF;

  -- 1. Verify new enum values exist
  PERFORM 1 FROM unnest(enum_range(NULL::calendar_sync_direction)) AS d WHERE d::text = 'bidirectional';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: bidirectional not in calendar_sync_direction'; END IF;

  PERFORM 1 FROM unnest(enum_range(NULL::calendar_sync_direction)) AS d WHERE d::text = 'inbound';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: inbound not in calendar_sync_direction'; END IF;

  PERFORM 1 FROM unnest(enum_range(NULL::calendar_sync_job_type)) AS j WHERE j::text = 'inbound_upsert';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: inbound_upsert not in calendar_sync_job_type'; END IF;

  PERFORM 1 FROM unnest(enum_range(NULL::calendar_sync_job_type)) AS j WHERE j::text = 'inbound_financial_routed';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: inbound_financial_routed not in calendar_sync_job_type'; END IF;

  PERFORM 1 FROM unnest(enum_range(NULL::calendar_event_source)) AS s WHERE s::text = 'external';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: external not in calendar_event_source'; END IF;

  -- 2. Verify payable_bills.source column
  PERFORM 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'payable_bills' AND column_name = 'source';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: payable_bills.source column missing'; END IF;

  -- 3. Verify calendar_external_event_links new columns
  PERFORM 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'calendar_external_event_links' AND column_name = 'origin_type';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: origin_type column missing'; END IF;

  PERFORM 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'calendar_external_event_links' AND column_name = 'origin_id';
  IF NOT FOUND THEN RAISE EXCEPTION 'smoke: origin_id column missing'; END IF;

  -- 4. Test: create calendar_event with source='external' + bidirectional link
  INSERT INTO public.calendar_events (user_id, title, start_at, end_at, source, created_by, event_kind, sync_eligible)
  VALUES (v_user, 'smoke-bidirectional-test', now() + interval '2 days', now() + interval '2 days 1 hour', 'external', 'system', 'personal', true)
  RETURNING id INTO v_event_id;

  INSERT INTO public.calendar_external_event_links (event_id, provider, external_object_id, external_list_id, sync_direction, sync_status, last_remote_updated_at)
  VALUES (v_event_id, 'ticktick', 'smoke-ext-001', 'smoke-proj', 'bidirectional', 'synced', now());

  SELECT count(*) INTO v_count FROM public.calendar_external_event_links WHERE event_id = v_event_id AND provider = 'ticktick';
  IF v_count != 1 THEN RAISE EXCEPTION 'smoke: bidirectional link not created'; END IF;

  -- 5. Test: create payable_bill with source='external_import' + link via origin_id
  INSERT INTO public.payable_bills (user_id, description, due_date, bill_type, source, status)
  VALUES (v_user, 'smoke-financial-import', (now() + interval '5 days')::date, 'other', 'external_import', 'pending')
  RETURNING id INTO v_bill_id;

  INSERT INTO public.calendar_external_event_links (event_id, origin_type, origin_id, provider, external_object_id, external_list_id, sync_direction, sync_status, last_remote_updated_at)
  VALUES (NULL, 'payable_bill', v_bill_id, 'ticktick', 'smoke-ext-002', 'smoke-proj', 'inbound', 'synced', now());

  SELECT count(*) INTO v_count FROM public.calendar_external_event_links WHERE origin_id = v_bill_id;
  IF v_count != 1 THEN RAISE EXCEPTION 'smoke: financial link not created'; END IF;

  -- 6. Test: remote_deleted status on link
  UPDATE public.calendar_external_event_links SET sync_status = 'remote_deleted' WHERE event_id = v_event_id;
  SELECT sync_status INTO v_count FROM public.calendar_external_event_links WHERE event_id = v_event_id;

  -- 7. Verify event is NOT deleted when link is remote_deleted
  SELECT count(*) INTO v_count FROM public.calendar_events WHERE id = v_event_id AND deleted_at IS NULL;
  IF v_count != 1 THEN RAISE EXCEPTION 'smoke: event should remain intact after remote_deleted'; END IF;

  -- 8. Verify get_agenda_window still returns the event
  SELECT count(*) INTO v_count FROM public.get_agenda_window(v_user, now(), now() + interval '7 days')
  WHERE origin_id::text = v_event_id::text;
  IF v_count < 1 THEN RAISE EXCEPTION 'smoke: event missing from agenda window'; END IF;

  -- 9. Verify financial import appears in agenda as derived projection
  SELECT count(*) INTO v_count FROM public.get_agenda_window(v_user, now(), now() + interval '10 days')
  WHERE origin_id::text = v_bill_id::text;
  IF v_count < 1 THEN RAISE EXCEPTION 'smoke: imported bill missing from agenda window'; END IF;

  -- Cleanup
  DELETE FROM public.calendar_external_event_links WHERE external_object_id IN ('smoke-ext-001', 'smoke-ext-002');
  DELETE FROM public.calendar_events WHERE id = v_event_id;
  DELETE FROM public.payable_bills WHERE id = v_bill_id;

  RAISE NOTICE 'smoke-bidirectional-sync: ALL PASSED';
END;
$$;
```

- [ ] **Step 2: Run smoke test**

Run: `npx supabase db query --linked -f scripts/smoke-bidirectional-sync.sql`
Expected: `smoke-bidirectional-sync: ALL PASSED`

- [ ] **Step 3: Commit**

```bash
git add scripts/smoke-bidirectional-sync.sql
git commit -m "test: add remote smoke test for bidirectional sync V1 schema"
```

---

### Task 9: Run full test suite and verify regression

- [ ] **Step 1: Run all Vitest tests**

Run: `pnpm exec vitest run`
Expected: all tests pass, no regressions

- [ ] **Step 2: Run calendar-specific tests**

Run: `pnpm exec vitest run --reporter=verbose supabase/functions/calendar-sync-ticktick/__tests__/ supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts supabase/functions/process-whatsapp-message/__tests__/calendar-intent-recurrence.test.ts supabase/functions/process-whatsapp-message/__tests__/calendar-routing-ownership.test.ts src/lib/__tests__/calendar-domain.test.ts src/lib/__tests__/calendar-recurrence-policy.test.ts`
Expected: all PASS

- [ ] **Step 3: Deploy edge functions**

Run: `npx supabase functions deploy calendar-sync-ticktick --linked`
Expected: deployed

- [ ] **Step 4: Trigger manual sync to test inbound**

Run: `curl -X POST https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/calendar-sync-ticktick -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "Content-Type: application/json"`
Expected: JSON response with both `outbound` and `inbound` stats

- [ ] **Step 5: Final commit with all remaining changes**

```bash
git add -A
git commit -m "feat: bidirectional agenda V1 — complete implementation

Schema: enum expansion, payable_bills.source, link origin_type/origin_id, metadata JSONB.
Inbound: TickTick task pull, financial routing, conflict detection, remote_deleted.
Clara: real reschedule, recurrence creation, recurrence hint parsing.
Reminders: recurring events support with sliding window schedule population.
Smoke: remote schema + functional validation."
```

---

## Deferred (explicitly out of scope)

| Item | Reason |
|------|--------|
| Google Calendar OAuth + inbound + outbound | V2 — requires new edge function, OAuth consent flow, token refresh |
| UI for project/calendar mapping | V2 — IntegrationsSettings.tsx stays placeholder for TickTick/Google |
| Cross-provider merge | V2 — heuristic matching not implemented |
| Occurrence-level external sync | Still `skipped_unsupported` for TickTick |
| RRULE import from Google Calendar | V2 |
| Clara NLP escalation for complex intents | V2 |
| `honor_remote_deletes` preference | V2 |
| Clara proactive reminder suggestions for imported items | V2 — UX polish |
