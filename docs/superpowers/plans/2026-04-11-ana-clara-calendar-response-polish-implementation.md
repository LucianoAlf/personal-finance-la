# Ana Clara Calendar Response Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **For human readers:** the note above applies only when this plan is executed with subagents. The implementation scope and task breakdown below still stand in a normal single-agent workflow.

**Goal:** Make Ana Clara's agenda responses semantically correct and visually closer to Mike's, including dynamic self-name resolution for participant-like fields and Mike-style hierarchy across create, confirm, reschedule, cancel, and agenda list flows.

**Architecture:** Keep calendar orchestration in `calendar-handler.ts`, move final presentation normalization into `calendar-response-templates.ts`, and drive the work from regression tests first. Use one shared presentation contract, then refine message families in controlled phases so behavior stays additive and low-risk.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Vitest, existing Ana Clara identity helpers in `_shared/ana-clara-soul.ts`, WhatsApp agenda flow in `process-whatsapp-message`.

**Spec:** `docs/superpowers/specs/2026-04-11-ana-clara-calendar-response-polish-design.md`

---

## Execution Model

### Sequential phases

- Phase 0: lock the shared contract with failing tests
- Phase 1: add the shared presentation inputs and name-resolution plumbing
- Phase 2: parallelize the isolated rendering families in separate worktrees
- Phase 3: integrate the chosen improvements into one coherent template layer
- Phase 4: run focused verification and production deploy

### Parallel-safe phase

Phase 2 is intentionally split for multiple agents in isolated worktrees:

- Agent A: participant normalization + create/create-success rendering
- Agent B: reschedule/cancel confirmation + success rendering
- Agent C: agenda list hierarchy and secondary-line layout

These agents may touch overlapping files, so they must not work in the same worktree. Use isolated worktrees or isolated runner branches, then integrate the winning changes sequentially in Phase 3.

### Safety rules

1. Do not change RPC contracts or persistence behavior unless a test proves the presentation work requires it.
2. Do not do global first-person replacement in raw event titles.
3. First-person substitution is presentation-only and limited to participant-like fields unless a title-specific cleanup rule is narrow and test-covered.
4. Keep the existing pending-confirmation flow intact.
5. No migrations are expected for this plan.

---

## Phase 0: Lock The Contract With Tests

### Task 1: Add failing template regressions for the new presentation contract

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`
- Reference: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Reference: `supabase/functions/_shared/ana-clara-soul.ts`

- [ ] **Step 1: Add a failing test for participant self-name normalization**

Add a focused test near the existing template tests:

```typescript
it('renders participant-like first person as the active user name', () => {
  const msg = templateCalendarCreateConfirmation(
    'Reunião do time de marketing',
    'Segunda, 14 abr às 14:00',
    {
      actorDisplayName: 'Alf',
      participants: 'eu, Yuri, John e Matheus',
    },
  );

  expect(msg).toContain('👥 Alf, Yuri, John e Matheus');
  expect(msg).not.toContain('👥 eu');
});
```

- [ ] **Step 2: Add a failing test for duplicate self-name deduplication**

```typescript
it('deduplicates the active user when self-reference and explicit name both appear', () => {
  const msg = templateCalendarCreateConfirmation(
    'Reunião do time de marketing',
    'Segunda, 14 abr às 14:00',
    {
      actorDisplayName: 'Ani',
      participants: 'Ani, eu e Jeremias',
    },
  );

  expect(msg).toContain('👥 Ani, Jeremias');
  expect(msg).not.toContain('Ani, Ani');
});
```

- [ ] **Step 3: Add a failing test for Mike-style line ordering**

```typescript
it('renders optional secondary lines in fixed order', () => {
  const msg = templateCalendarCreateConfirmation(
    'Reunião do time de marketing',
    'Segunda, 14 abr às 14:00',
    {
      actorDisplayName: 'Alf',
      location: 'Casa do Luciano Alf',
      participants: 'Alf, Yuri, John',
      durationText: '3h',
      reminders: '1 dia antes e 1 hora antes',
      recurrence: 'Toda semana',
    },
  );

  const locationIndex = msg.indexOf('📍 Casa do Luciano Alf');
  const participantsIndex = msg.indexOf('👥 Alf, Yuri, John');
  const durationIndex = msg.indexOf('⏱️ 3h');
  const remindersIndex = msg.indexOf('🔔 1 dia antes e 1 hora antes');
  const recurrenceIndex = msg.indexOf('🔄 Toda semana');

  expect(locationIndex).toBeGreaterThan(-1);
  expect(participantsIndex).toBeGreaterThan(locationIndex);
  expect(durationIndex).toBeGreaterThan(participantsIndex);
  expect(remindersIndex).toBeGreaterThan(durationIndex);
  expect(recurrenceIndex).toBeGreaterThan(remindersIndex);
});
```

- [ ] **Step 4: Add a failing test for reschedule confirmation hierarchy**

```typescript
it('renders reschedule confirmation with current event block and changes block', () => {
  const msg = templateEventRescheduleConfirmation(
    {
      title: 'Reunião do time de marketing',
      whenLine: 'Seg, 14 abr às 14:00',
    },
    [
      '📅 Nova data: terça-feira',
      '🕐 Novo horário: 14:00',
    ],
  );

  expect(msg).toContain('Achei o evento:');
  expect(msg).toContain('Alterações:');
  expect(msg).toContain('Confirma? (sim/não)');
});
```

- [ ] **Step 5: Run the focused template suite and verify RED**

Run:

```bash
pnpm vitest "supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts"
```

Expected: FAIL with missing fields/functions or incorrect rendered output.

---

## Phase 1: Shared Contract And Plumbing

### Task 2: Add shared presentation inputs without changing business behavior

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Modify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Reference: `supabase/functions/_shared/ana-clara-soul.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

- [ ] **Step 1: Add a small presentation options contract to the templates file**

Introduce or expand a single shared options shape:

```typescript
interface CalendarPresentationOptions {
  actorDisplayName?: string;
  location?: string;
  participants?: string;
  durationText?: string;
  reminders?: string;
  recurrence?: string;
}
```

- [ ] **Step 2: Add a helper to resolve the agenda actor display name in the handler**

Reuse the existing identity fallback logic instead of inventing a second naming system:

```typescript
import { resolvePreferredFirstName } from '../_shared/ana-clara-soul.ts';

async function getCalendarActorDisplayName(userId: string, fallbackName?: string): Promise<string | undefined> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('agent_identity')
    .select('user_context')
    .eq('user_id', userId)
    .maybeSingle();

  const userCtx = (data?.user_context as Record<string, unknown> | null) ?? {};
  const typedCtx = userCtx as { first_name?: string; display_name?: string };
  return (
    typedCtx.display_name ||
    typedCtx.first_name ||
    fallbackName ||
    resolvePreferredFirstName(typedCtx, fallbackName)
  );
}
```

- [ ] **Step 3: Pass `actorDisplayName` into the create confirmation path**

Update the call site so the handler passes the preferred name:

```typescript
const actorDisplayName = await getCalendarActorDisplayName(userId, user.full_name);

const msg = templateCalendarCreateConfirmation(displayTitle, whenLine, {
  actorDisplayName,
  reminders: reminders ?? undefined,
  recurrence: recurrence ?? undefined,
});
```

- [ ] **Step 4: Pass `actorDisplayName` into the create success, cancel, reschedule, and agenda-list paths**

Use the same `actorDisplayName` source consistently. Do not recompute different naming logic per call site.

- [ ] **Step 5: Run the focused template suite and keep existing tests green**

Run:

```bash
pnpm vitest "supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts" "supabase/functions/process-whatsapp-message/__tests__/calendar-routing-ownership.test.ts" "supabase/functions/process-whatsapp-message/__tests__/calendar-create-confirm.test.ts"
```

Expected: some new presentation tests may still fail, but routing/confirmation ownership tests must remain green.

---

## Phase 2: Parallel Worktree Tasks For Multiple Agents

> Run each task in an isolated worktree or isolated branch. Do not let multiple implementation agents edit the same worktree.

### Task 2A: Agent A — participant normalization + create flows

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

- [ ] **Step 1: Implement participant-like normalization helpers**

Target helpers:

```typescript
function normalizeParticipantLikeText(raw: string, actorDisplayName?: string): string
function dedupeParticipantTokens(tokens: string[]): string[]
```

Behavior:

- replace self-references only in participant-like strings
- preserve qualifiers when possible
- dedupe the actor name after substitution

- [ ] **Step 2: Update create confirmation rendering**

Render with fixed optional line order:

```typescript
let msg = `📅 *Criar compromisso?*\n\n`;
msg += `📌 ${displayTitle}\n`;
msg += `🕐 ${whenLine}\n`;
if (locationLine) msg += `📍 ${locationLine}\n`;
if (participantsLine) msg += `👥 ${participantsLine}\n`;
if (durationLine) msg += `⏱️ ${durationLine}\n`;
if (remindersLine) msg += `🔔 ${remindersLine}\n`;
if (recurrenceLine) msg += `🔄 ${recurrenceLine}\n`;
msg += `\nConfirma? (sim/não)`;
```

- [ ] **Step 3: Update create success rendering**

Keep it compact but structurally aligned:

```typescript
let msg = `Pronto, agendei!\n\n`;
msg += `📌 ${cleanTitle}\n`;
msg += `🕐 ${dateFormatted}\n`;
if (locationLine) msg += `\n📍 ${locationLine}`;
if (participantsLine) msg += `\n👥 ${participantsLine}`;
if (reminderText) msg += `\n🔔 ${reminderText}`;
```

- [ ] **Step 4: Run only the create-related tests**

Run:

```bash
pnpm vitest "supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts" -t "create|participant|deduplicate|fixed order"
```

Expected: PASS for the new create/participant cases.

### Task 2B: Agent B — reschedule/cancel hierarchy

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Modify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

- [ ] **Step 1: Add explicit confirmation templates for reschedule and cancel**

Create dedicated helpers rather than overloading the success helpers. Use these exact names in the implementation so the plan and code do not drift:

```typescript
export function templateEventRescheduleConfirmation(
  event: { title: string; whenLine: string; location?: string; participants?: string },
  changeLines: string[],
): string

export function templateEventCancelConfirmation(
  event: { title: string; whenLine: string; location?: string; participants?: string },
): string
```

- [ ] **Step 2: Implement Mike-style framing**

Required structure:

```typescript
let msg = `Achei o evento:\n`;
msg += `📌 ${event.title}\n`;
msg += `🕐 ${event.whenLine}\n`;
if (event.location) msg += `📍 ${event.location}\n`;
if (event.participants) msg += `👥 ${event.participants}\n`;
msg += `\nAlterações:\n`;
msg += `${changeLines.join('\n')}\n\n`;
msg += `Confirma? (sim/não)`;
```

Cancel confirmation:

```typescript
let msg = `Achei o evento:\n`;
msg += `📌 ${event.title}\n`;
msg += `🕐 ${event.whenLine}\n`;
if (event.location) msg += `📍 ${event.location}\n`;
if (event.participants) msg += `👥 ${event.participants}\n`;
msg += `\nCancelo? (sim/não)`;
```

- [ ] **Step 3: Update the handler to call the new confirmation templates**

Do not change reschedule/cancel business logic. Only replace the message assembly step.

- [ ] **Step 4: Run only the reschedule/cancel tests**

Run:

```bash
pnpm vitest "supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts" -t "reschedule|cancel|Achei o evento|Alterações"
```

Expected: PASS for new reschedule/cancel hierarchy tests.

### Task 2C: Agent C — agenda list compaction and secondary lines

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

- [ ] **Step 1: Tighten agenda list item rendering**

Keep each card compact:

```typescript
msg += `${typeEmoji} *${displayTitle}*\n`;
msg += `🕐 ${formatMikeStyleWhenLine(item.display_start_at, tz)}\n`;
if (secondaryLine) msg += `${secondaryLine}\n`;
msg += `\n`;
```

- [ ] **Step 2: Define a single secondary-line builder**

Use one helper that decides whether to show:

- subtitle
- location
- participant-like fragment
- read-only annotation

Do not stack multiple weak lines if one compact line is enough.

- [ ] **Step 3: Preserve derived financial differentiation**

Keep the existing `origin_type`/status emoji mapping and read-only signal behavior.

- [ ] **Step 4: Run only agenda-list tests**

Run:

```bash
pnpm vitest "supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts" -t "agenda list"
```

Expected: PASS for list-format tests without changing ownership/routing behavior.

- [ ] **Step 5: Add explicit agenda-list regression coverage for compactness and secondary-line usefulness**

Add or extend tests that prove:

- compact item rendering does not emit unnecessary extra lines
- a secondary line appears only when it adds value
- when secondary data exists, it stays semantically ordered and readable

---

## Phase 3: Sequential Integration

### Task 3: Integrate the best Phase 2 changes into one coherent template layer

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Modify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Test: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

- [ ] **Step 1: Merge the chosen create/participant, reschedule/cancel, and agenda-list changes**

Keep one coherent helper set:

- one participant normalization helper family
- one optional-line ordering rule
- one summary-block convention for event confirmations

- [ ] **Step 2: Remove duplicated rendering branches introduced during parallel work**

The final file should not contain multiple competing helpers for the same job.

- [ ] **Step 3: Ensure title safety**

Keep title cleanup narrow. Reject any broad code that does this:

```typescript
title.replace(/\beu\b/g, actorDisplayName)
```

Allowed pattern:

```typescript
const normalizedParticipants = normalizeParticipantLikeText(rawParticipants, actorDisplayName)
```

- [ ] **Step 4: Run the full focused calendar suite**

Run:

```bash
pnpm vitest "supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts" "supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts" "supabase/functions/process-whatsapp-message/__tests__/calendar-create-confirm.test.ts" "supabase/functions/process-whatsapp-message/__tests__/calendar-routing-ownership.test.ts"
```

Expected: PASS with zero failures.

---

## Phase 4: Verification, Lint Check, And Deploy

### Task 4: Verify production readiness and deploy the edge function

**Files:**
- Verify: `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- Verify: `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- Verify: `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

- [ ] **Step 1: Run lints/diagnostics for touched files**

Run Cursor diagnostics or equivalent lints for:

- `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`

Expected: no new lint errors introduced by this work.

- [ ] **Step 2: Do two DM smoke tests and one agenda-list smoke test**

Manual scenarios:

1. DM create:
   - message: `Aninha, agenda um compromisso com o pessoal do marketing na próxima terça de 14h às 17h. Participantes: Eu, Yuri, John e Matheus`
   - confirm with `sim`
   - expected: participant line shows real user name, not `eu`

2. DM dedup:
   - message: `Aninha, agenda um compromisso com o pessoal do marketing na próxima terça de 14h às 17h. Participantes: eu, Alf, Yuri`
   - confirm with `sim`
   - expected: participant line deduplicates self-reference and renders `Alf, Yuri`

3. Agenda lookup:
   - message: `que dia eu tenho compromisso com os meus coordenadores essa semana?`
   - expected: compact Mike-style agenda list with stable visual hierarchy

- [ ] **Step 3: Deploy the function**

Before deploying, verify the intended linked project:

```bash
npx supabase status
npx supabase functions list
```

Expected: the CLI is authenticated and pointing to the intended target project before deploy.

Run:

```bash
npx supabase functions deploy process-whatsapp-message --yes
```

Expected: successful deploy to the linked project.

- [ ] **Step 4: Post-deploy verification**

Re-run the three manual WhatsApp scenarios above against production.

---

## Final Review Checklist

- [ ] First-person participant references resolve to the active user's preferred name
- [ ] No global first-person replacement exists in arbitrary titles
- [ ] Optional lines always render in this order: location -> participants -> duration/interval -> reminders -> recurrence
- [ ] Reschedule confirmation uses `Achei o evento:` + `Alterações:`
- [ ] Cancel confirmation uses `Achei o evento:` + `Cancelo?`
- [ ] Agenda list remains readable and compact
- [ ] Existing calendar routing and confirmation tests still pass
- [ ] Edge function deploy succeeds

---

## Recommended Multi-Agent Dispatch Order

1. Controller executes Phase 0 and Phase 1 sequentially.
2. Controller dispatches three isolated implementation agents for Tasks `2A`, `2B`, and `2C` in parallel worktrees.
3. Controller reviews outputs and integrates chosen changes in Task `3`.
4. Controller runs Task `4` sequentially, including deploy and production smoke checks.

This gives parallel speed where the work is presentation-heavy, but keeps the contract-definition and production verification phases under one coordinator.
