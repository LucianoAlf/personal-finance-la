# Investment Canonical Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one canonical backend context for investments so the overview UI, Ana Clara, opportunities, rebalancing, summaries, and WhatsApp/email all use the same deterministic facts and provenance metadata.

**Architecture:** Add a shared Supabase Edge Function module that composes an investment intelligence context from database state plus available market data, then refactor AI, radar, and notification functions to consume that contract instead of assembling their own payloads. Keep deterministic facts separate from AI narrative and expose provenance flags so UI and messages can explain what is market data, internal calculation, database state, or unavailable.

**Tech Stack:** Supabase Edge Functions, TypeScript, React hooks/components, Vitest, existing investment/pricing/allocation utilities

---

## File Structure

**Create:**
- `supabase/functions/_shared/investment-intelligence.ts` - canonical context builder and shared types
- `src/utils/investments/intelligence-contract.ts` - frontend contract types for canonical context
- `src/utils/investments/intelligence-contract.test.ts` - unit tests for canonical payload mapping/provenance

**Modify:**
- `supabase/functions/ana-investment-insights/index.ts` - consume canonical context and only generate narrative
- `supabase/functions/generate-opportunities/index.ts` - derive opportunities from canonical context
- `supabase/functions/send-opportunity-notification/index.ts` - render notifications from canonical context snapshot
- `supabase/functions/send-investment-summary/index.ts` - render summary from canonical context snapshot
- `supabase/functions/fetch-benchmarks/index.ts` - expose stable benchmark metadata for canonical builder
- `src/hooks/useAnaInsights.ts` - stop assembling ad-hoc portfolio payload
- `src/hooks/useMarketOpportunities.ts` - consume canonical opportunity payload shape
- `src/components/investments/AnaInvestmentInsights.tsx` - render provenance-aware sections
- `src/components/investments/OpportunityFeed.tsx` - render canonical facts + Ana narrative
- `src/components/investments/SmartRebalanceWidget.tsx` - read canonical rebalance facts where available
- `src/components/investments/BenchmarkComparison.tsx` - show provenance/completeness messaging from canonical context
- `src/pages/Investments.tsx` - wire overview to canonical-context consumers

**Test:**
- `src/utils/investments/intelligence-contract.test.ts`
- existing `vitest` suite

### Task 1: Define the canonical contract

**Files:**
- Create: `src/utils/investments/intelligence-contract.ts`
- Test: `src/utils/investments/intelligence-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { getSectionProvenanceLabel, isMarketSectionReliable } from '@/utils/investments/intelligence-contract';

describe('investment intelligence contract helpers', () => {
  it('treats external market sections as reliable only when complete', () => {
    expect(
      isMarketSectionReliable({
        source: 'external_market',
        completeness: 'complete',
      })
    ).toBe(true);

    expect(
      isMarketSectionReliable({
        source: 'external_market',
        completeness: 'partial',
      })
    ).toBe(false);
  });

  it('returns user-facing provenance labels', () => {
    expect(getSectionProvenanceLabel('database_state')).toBe('Dados do banco');
    expect(getSectionProvenanceLabel('ai_interpretation')).toBe('Interpretação da Ana Clara');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test "src/utils/investments/intelligence-contract.test.ts"`

Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
export type IntelligenceSource =
  | 'external_market'
  | 'internal_calculation'
  | 'database_state'
  | 'ai_interpretation'
  | 'unavailable';

export type IntelligenceCompleteness = 'complete' | 'partial' | 'unavailable';

export interface IntelligenceSectionQuality {
  source: IntelligenceSource;
  completeness: IntelligenceCompleteness;
}

export function isMarketSectionReliable(section: IntelligenceSectionQuality) {
  return section.source === 'external_market' && section.completeness === 'complete';
}

export function getSectionProvenanceLabel(source: IntelligenceSource) {
  const labels: Record<IntelligenceSource, string> = {
    external_market: 'Mercado externo',
    internal_calculation: 'Cálculo interno',
    database_state: 'Dados do banco',
    ai_interpretation: 'Interpretação da Ana Clara',
    unavailable: 'Indisponível',
  };

  return labels[source];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test "src/utils/investments/intelligence-contract.test.ts"`

Expected: PASS

### Task 2: Build the shared backend context composer

**Files:**
- Create: `supabase/functions/_shared/investment-intelligence.ts`
- Modify: `supabase/functions/fetch-benchmarks/index.ts`

- [ ] **Step 1: Write the failing test**

Add a contract-focused test that expects a canonical context fixture to expose:
- `portfolio`
- `market`
- `planning`
- `opportunities`
- `rebalance`
- `quality`

and expects each section to include `source` and `completeness`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test "src/utils/investments/intelligence-contract.test.ts"`

Expected: FAIL because the context builder shape is not implemented.

- [ ] **Step 3: Write minimal implementation**

Implement a shared module that exports:

```typescript
export async function buildInvestmentIntelligenceContext(params: {
  supabase: SupabaseClient;
  userId: string;
}) {
  return {
    portfolio: { /* totals + allocation */ },
    market: { /* benchmarks + quote availability */ },
    planning: { /* selected/default planning facts */ },
    opportunities: { /* deterministic rules */ },
    rebalance: { /* deterministic gap analysis */ },
    gamification: { /* badge/profile summaries */ },
    quality: {
      portfolio: { source: 'database_state', completeness: 'complete' },
      market: { source: 'external_market', completeness: 'partial' },
      planning: { source: 'internal_calculation', completeness: 'complete' },
    },
  };
}
```

Also extract any benchmark fetch metadata needed so the builder can distinguish `available` vs `unavailable` instead of silently fabricating values.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test "src/utils/investments/intelligence-contract.test.ts"`

Expected: PASS

### Task 3: Refactor Ana Clara to narrative-only over canonical context

**Files:**
- Modify: `supabase/functions/ana-investment-insights/index.ts`
- Modify: `src/hooks/useAnaInsights.ts`

- [ ] **Step 1: Write the failing test**

Add a test that expects the AI request payload to include canonical sections and quality flags, and that `risk` in the returned frontend model comes from canonical data rather than a placeholder constant.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL because `useAnaInsights` still sends an ad-hoc payload and still returns placeholder risk.

- [ ] **Step 3: Write minimal implementation**

Refactor the hook/function flow to:

```typescript
const { data } = await supabase.functions.invoke('ana-investment-insights', {
  body: { portfolioFingerprint, forceRefresh },
});
```

Inside the function:

```typescript
const context = await buildInvestmentIntelligenceContext({ supabase, userId });
const userPrompt = buildAnaPromptFromCanonicalContext(context);
```

Return:
- deterministic `healthScore` inputs from canonical facts
- narrative explanation from AI
- provenance for rendered sections

Remove the frontend `risk: 20` placeholder and replace it with canonical breakdown data.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`

Expected: PASS for the new contract expectation and no placeholder risk.

### Task 4: Refactor opportunities and rebalance to canonical rules

**Files:**
- Modify: `supabase/functions/generate-opportunities/index.ts`
- Modify: `src/hooks/useMarketOpportunities.ts`
- Modify: `src/components/investments/OpportunityFeed.tsx`
- Modify: `src/components/investments/SmartRebalanceWidget.tsx`

- [ ] **Step 1: Write the failing test**

Add a test fixture where a concentrated fixed-income-only portfolio produces:
- concentration warning
- no fake market signal wording
- rebalance gap values derived from allocation targets

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL because opportunities and rebalance are still computed in separate stacks with no shared context object.

- [ ] **Step 3: Write minimal implementation**

Use the shared builder:

```typescript
const context = await buildInvestmentIntelligenceContext({ supabase: supabaseClient, userId });
const opportunities = context.opportunities.items;
const rebalance = context.rebalance;
```

Update UI copy so:
- facts are deterministic
- Ana text is secondary
- provenance labels are visible when relevant

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`

Expected: PASS

### Task 5: Refactor WhatsApp/email summary and opportunity delivery

**Files:**
- Modify: `supabase/functions/send-opportunity-notification/index.ts`
- Modify: `supabase/functions/send-investment-summary/index.ts`

- [ ] **Step 1: Write the failing test**

Add renderer-level tests that expect:
- deterministic summary block first
- optional Ana narrative block second
- no notification body fields outside the canonical context

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL because both functions still assemble notification content independently.

- [ ] **Step 3: Write minimal implementation**

Refactor both functions to build and render from the same context snapshot:

```typescript
const context = await buildInvestmentIntelligenceContext({ supabase, userId });
const notification = renderInvestmentNotification({
  mode: 'summary' | 'opportunity',
  context,
  includeAnaNarrative: true,
});
```

Rules:
- deterministic block always present
- Ana block omitted if AI unavailable
- explicit unavailable copy for missing market sections
- WhatsApp and email share the same semantic sections

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`

Expected: PASS

### Task 6: Wire the overview UI to the canonical context

**Files:**
- Modify: `src/pages/Investments.tsx`
- Modify: `src/components/investments/AnaInvestmentInsights.tsx`
- Modify: `src/components/investments/BenchmarkComparison.tsx`
- Modify: `src/components/investments/OpportunityFeed.tsx`
- Modify: `src/components/investments/SmartRebalanceWidget.tsx`

- [ ] **Step 1: Write the failing test**

Add a view-model test expecting overview sections to expose provenance labels and to hide unsupported market claims when canonical completeness is partial.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL because overview widgets still read separate hooks/contracts.

- [ ] **Step 3: Write minimal implementation**

Introduce one overview-facing data path:

```typescript
const { context, loading } = useInvestmentIntelligence();
```

Render from `context` where possible and keep existing local hooks only as internal dependencies of the canonical builder or temporary fallback adapters.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`

Expected: PASS

### Task 7: Verification and real execution

**Files:**
- Modify: affected files from prior tasks only

- [ ] **Step 1: Run focused verification**

Run:
- `pnpm exec tsc -b --pretty false`
- `pnpm test`

Expected: both pass.

- [ ] **Step 2: Deploy affected Edge Functions**

Run:
- `supabase functions deploy ana-investment-insights --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy generate-opportunities --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy send-opportunity-notification --project-ref sbnpmhmvcspwcyjhftlw`
- `supabase functions deploy send-investment-summary --project-ref sbnpmhmvcspwcyjhftlw`
- deploy any new shared-function consumers changed in the implementation

Expected: successful deploy output.

- [ ] **Step 3: Perform real validation**

Validate in the app:
- `Visão Geral`
- `Ana Clara`
- `Radar`
- `Rebalanceamento`
- `Benchmarks`
- one real notification path

Expected:
- same facts across UI and notifications
- provenance visible where needed
- no unsupported claims

## Self-Review

- Spec coverage: this plan covers canonical context creation, shared consumer migration, deterministic notification rendering, AI guardrails, and verification.
- Placeholder scan: no `TODO`, `TBD`, or “implement later” instructions remain.
- Type consistency: all tasks refer to the same canonical context concept and provenance contract.
