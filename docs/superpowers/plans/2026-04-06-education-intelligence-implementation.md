# Education Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/educacao` placeholder with a real education hub that personalizes financial learning from the user's actual behavior, investor profile, and progress, while also powering proactive Ana Clara guidance inside the app and on WhatsApp.

**Architecture:** Build one shared backend `education intelligence context` that combines deterministic financial behavior signals, learning progress, gamification state, and investor suitability into a canonical education snapshot. The `/educacao` page, investor-profile guidance, daily tips, personalized learning trails, and Ana Clara proactive messages must all consume that same snapshot, with Ana adding narrative and mentorship on top of deterministic facts instead of inventing pedagogical state.

**Tech Stack:** React, TypeScript, Supabase Postgres, Supabase Edge Functions, TanStack Query, Vitest, pg_cron, WhatsApp/UAZAPI, existing Ana Clara infrastructure

---

## Recommendation

Use **Option C: canonical education hub with deterministic personalization plus Ana narrative on top**.

Why this is the right choice:
- Static lessons alone would be fast, but they would become another decorative page with no behavioral relevance.
- Pure AI mentorship without a canonical domain would sound smart but stay unreliable and hard to test.
- A canonical education context lets the system start with general guidance, then progressively personalize modules, tips, risk guidance, and WhatsApp nudges from real user behavior.

This plan intentionally treats `Educação` as the nervous center of financial mentoring, not as a content shelf.

---

## Audit Summary

**What exists today:**
- `src/pages/Education.tsx` is fully static UI with hardcoded modules, achievements, and one static tip.
- `useGamification()` and `useBadges()` already expose real XP, streak, and badge data.
- `notification_preferences` already contains `ana_tips_enabled`, frequency, and schedule fields.
- `supabase/functions/send-ana-tips/index.ts` exists and sends generic or loosely personalized tips by WhatsApp.
- `process-whatsapp-message` and the rest of Ana Clara already have operational infrastructure.

**What does not exist today:**
- No education tables for tracks, modules, lessons, glossary, quizzes, or user progress.
- No investor suitability or risk-profile model.
- No canonical education context builder.
- No personalized learning trail.
- No educational memory/state for Ana Clara.
- No evidence that the current education tip flow is the source of truth for in-app education.

**Main product gap:**
- The app currently knows financial facts and some gamification facts, but it does not convert them into a structured educational journey for each user.

---

## File Structure

**Create:**
- `src/utils/education/intelligence-contract.ts` - canonical education context types, quality metadata, helper guards
- `src/utils/education/intelligence-contract.test.ts` - contract-level regression tests
- `src/utils/education/view-model.ts` - pure mapping helpers for the education page
- `src/utils/education/view-model.test.ts` - tests for rendering and recommendation rules
- `src/hooks/useEducationIntelligence.ts` - frontend hook for the canonical education snapshot
- `src/hooks/useInvestorProfile.ts` - frontend hook for investor profile fetch/update
- `src/components/education/EducationHero.tsx` - top mentor block with stateful summary
- `src/components/education/EducationJourneySection.tsx` - personalized trail/modules list
- `src/components/education/EducationProgressSection.tsx` - lesson/module progress and next steps
- `src/components/education/EducationInvestorProfileCard.tsx` - suitability summary and CTA
- `src/components/education/EducationAchievementsSection.tsx` - real gamification integration
- `src/components/education/EducationDailyTipCard.tsx` - canonical daily tip block
- `src/components/education/EducationGlossarySection.tsx` - glossary/definitions and search
- `src/components/education/EducationEmptyState.tsx` - first-run state for new users
- `src/components/education/InvestorProfileQuestionnaire.tsx` - suitability questionnaire flow
- `supabase/functions/_shared/education-intelligence.ts` - shared deterministic education builder
- `supabase/functions/_shared/education-renderers.ts` - deterministic tip and mentorship renderers
- `supabase/functions/_shared/education-profile.ts` - suitability scoring and investor profile helpers
- `supabase/functions/education-intelligence/index.ts` - edge function returning canonical education context
- `supabase/functions/ana-education-insights/index.ts` - edge function for Ana narrative on top of the canonical context
- `supabase/functions/send-education-tip/index.ts` - replacement for the legacy generic tips flow
- `supabase/migrations/20260406_create_education_domain.sql` - tables for education content, progress, tips, and investor profile

**Modify:**
- `src/pages/Education.tsx` - replace static placeholder with real page composition
- `src/App.tsx` - keep route, optionally prefetch education context
- `src/components/layout/Sidebar.tsx` - keep nav item, optionally add badge/progress indicator later
- `src/components/settings/NotificationsSettings.tsx` - rename/explain `ana_tips` as educational mentoring notifications
- `src/types/settings.types.ts` - align naming and add education notification contract if needed
- `src/hooks/useGamification.ts` - reuse canonical progress and avoid duplicated achievement assumptions
- `src/hooks/useBadges.ts` - reuse if still needed, otherwise narrow ownership
- `src/config/achievements.ts` - align achievement catalog with education/behavior goals where necessary
- `supabase/functions/send-ana-tips/index.ts` - migrate or deprecate in favor of canonical education tip flow
- `supabase/functions/process-whatsapp-message/context-manager.ts` - inject education and suitability context into Ana Clara
- `supabase/functions/process-whatsapp-message/index.ts` - allow education-oriented commands and guidance
- `supabase/functions/send-proactive-notifications/index.ts` - include education tip orchestration when appropriate

**Reuse without changing ownership:**
- `transactions`, `credit_card_transactions`, `payable_bills`, `financial_goals`, `investment_goals`, `investments`, `portfolio_snapshots`, `user_settings`, `notification_preferences`
- `supabase/functions/_shared/report-intelligence.ts`
- `supabase/functions/_shared/investment-intelligence.ts`
- `supabase/functions/ana-dashboard-insights/index.ts`

---

## Canonical Data Model

The education domain should be introduced with explicit, testable ownership:

- `education_tracks`
  - Defines major learning tracks such as `organizacao_basica`, `controle_de_gastos`, `reserva_de_emergencia`, `quitacao_de_dividas`, `comecando_a_investir`, `aposentadoria`, `comportamento_financeiro`.
- `education_modules`
  - Ordered modules within each track.
- `education_lessons`
  - Individual lessons, content type, estimated time, prerequisites, difficulty, learning objective, and optional CTA.
- `education_glossary_terms`
  - Financial terms with simple explanation, extended explanation, examples, and tags.
- `education_user_progress`
  - User-level lesson/module completion, started state, last viewed, completion timestamp, confidence/self-rating.
- `education_user_profile`
  - Canonical education profile: current stage, key learning gaps, preferred tone, profile completeness, first-run state.
- `investor_profile_assessments`
  - Suitability questionnaire answers, resulting profile, confidence, effective date, and explanation.
- `education_daily_tips`
  - Canonical generated tip history, channel, deterministic reason, narrative text, delivered_at, and dedupe key.
- `education_behavior_snapshots`
  - Optional persisted behavioral rollups for auditability and longitudinal education analytics.

Do **not** store only free-text advice. Persist the deterministic reason that caused each educational recommendation.

---

## Personalization Rules

The first real version should be deterministic-first, not LLM-first.

Core signals that must feed the education context:
- Spending concentration by category and month-over-month deterioration
- Late bills, overdue counts, revolving card pressure, and invoice/payment behavior
- Savings rate and reserve progress
- Goal creation, contribution frequency, and abandonment patterns
- Investment presence, allocation shape, and beginner-vs-advanced readiness
- Gamification consistency signals such as streak and lesson completion
- Questionnaire-based investor suitability

Examples of deterministic mappings:
- High recurring discretionary spending + low savings rate -> prioritize `Organização Básica` and `Controle de Gastos`
- Overdue bills or repeated invoice pressure -> prioritize `Eliminando Dívidas`
- No emergency reserve + volatility-seeking profile -> block aggressive investment encouragement and route to `Reserva de Emergência`
- First contribution into investments with conservative suitability -> start with `Renda Fixa`, risk concepts, and horizon education
- Young user with retirement goal absent -> suggest `Aposentadoria de Longo Prazo` education path

Ana Clara can interpret these, but cannot bypass them.

---

## Phased Plan

### Task 1 (Phase 1): Create the canonical education contract and database domain

**Files:**
- Create: `src/utils/education/intelligence-contract.ts`
- Create: `src/utils/education/intelligence-contract.test.ts`
- Create: `supabase/migrations/20260406_create_education_domain.sql`

- [ ] **Step 1: Write the failing contract tests**
  - Add tests for:
    - `createEmptyEducationContext()`
    - `hasRenderableEducationData()`
    - `getEducationQualityLabel()`
    - required sections: `journey`, `progress`, `dailyTip`, `investorProfile`, `glossary`, `ana`, `quality`
  - Run: `pnpm test -- src/utils/education/intelligence-contract.test.ts`
  - Expected: FAIL because the module does not exist yet.

- [ ] **Step 2: Write the migration for the education domain**
  - Create the following tables with RLS-aware ownership:
    - `education_tracks`
    - `education_modules`
    - `education_lessons`
    - `education_glossary_terms`
    - `education_user_progress`
    - `education_user_profile`
    - `investor_profile_assessments`
    - `education_daily_tips`
  - Seed at least the first 3 real tracks:
    - `Organização Básica`
    - `Eliminando Dívidas`
    - `Começando a Investir`
  - Seed at least 5 lessons per track and 20 glossary terms.

- [ ] **Step 3: Implement the contract module**
  - Define `EducationIntelligenceContext`
  - Define section-level `source` and `completeness`
  - Add empty-state factory and render guards
  - Keep the contract deterministic and serializable for edge functions and the frontend

- [ ] **Step 4: Validate migration and tests**
  - Run: `pnpm test -- src/utils/education/intelligence-contract.test.ts`
  - Run: `supabase db diff` or equivalent migration verification flow used in this repo
  - Expected: contract tests pass and migration is syntactically valid.

- [ ] **Step 5: Commit**
  - Commit message: `feat(education): define canonical education domain`

---

### Task 2 (Phase 2): Build the deterministic education intelligence context

**Files:**
- Create: `supabase/functions/_shared/education-intelligence.ts`
- Create: `supabase/functions/education-intelligence/index.ts`
- Modify: `src/utils/education/intelligence-contract.ts`
- Test: `src/utils/education/intelligence-contract.test.ts`

- [ ] **Step 1: Write failing builder tests**
  - Cover:
    - first-run user with no financial data
    - indebted user routed to debt track
    - user without emergency reserve routed away from risky investing
    - user with incomplete suitability gets questionnaire CTA
    - glossary and daily tip are omitted cleanly when unavailable
  - Run: `pnpm test -- src/utils/education/intelligence-contract.test.ts`
  - Expected: FAIL because no builder exists.

- [ ] **Step 2: Implement deterministic signal extraction**
  - Pull from:
    - `transactions`
    - `credit_card_transactions`
    - `credit_card_invoices`
    - `payable_bills`
    - `financial_goals`
    - `investment_goals`
    - `investments`
    - `portfolio_snapshots`
    - `user_gamification`
    - `badge_progress`
    - `education_user_progress`
    - `investor_profile_assessments`
  - Build:
    - `behaviorSnapshot`
    - `recommendedTrack`
    - `recommendedModules`
    - `learningBlockers`
    - `nextActions`
    - `dailyTipReason`

- [ ] **Step 3: Expose the edge function**
  - `education-intelligence` should:
    - authenticate the user
    - accept optional date/period arguments only if useful
    - return one canonical context object
    - never embed UI-only strings that the frontend should own

- [ ] **Step 4: Validate**
  - Run: `pnpm test -- src/utils/education/intelligence-contract.test.ts`
  - Run: `pnpm exec tsc -b --pretty false`
  - Expected: deterministic context builds and type-checks.

- [ ] **Step 5: Commit**
  - Commit message: `feat(education): build canonical education intelligence context`

---

### Task 3 (Phase 3): Implement investor suitability and guardrails

**Files:**
- Create: `src/hooks/useInvestorProfile.ts`
- Create: `src/components/education/InvestorProfileQuestionnaire.tsx`
- Create: `supabase/functions/_shared/education-profile.ts`
- Modify: `src/pages/Education.tsx`
- Modify: `supabase/functions/process-whatsapp-message/context-manager.ts`
- Modify: `supabase/functions/_shared/investment-intelligence.ts`
- Test: `src/utils/education/view-model.test.ts`

- [ ] **Step 1: Write failing suitability tests**
  - Cover scoring for:
    - conservative
    - moderate
    - aggressive
    - incomplete questionnaire
  - Cover rule:
    - conservative users do not receive aggressive-equity-first educational prompts
  - Run: `pnpm test -- src/utils/education/view-model.test.ts`
  - Expected: FAIL because suitability logic is missing.

- [ ] **Step 2: Implement questionnaire and scoring**
  - Store raw answers plus normalized profile
  - Keep scoring deterministic and explainable
  - Persist `effective_at` and `version`
  - Support reassessment later without losing history

- [ ] **Step 3: Wire suitability into advice guardrails**
  - Education recommendations must consider suitability
  - Investment mentorship must respect suitability
  - WhatsApp context must expose:
    - current profile
    - confidence
    - last assessed date
    - blocked recommendation classes

- [ ] **Step 4: Validate**
  - Run: `pnpm test -- src/utils/education/view-model.test.ts`
  - Run: `pnpm exec tsc -b --pretty false`
  - Expected: questionnaire score and downstream guardrails behave deterministically.

- [ ] **Step 5: Commit**
  - Commit message: `feat(education): add investor suitability and advice guardrails`

---

### Task 4 (Phase 4): Replace the static Education page with a real personalized hub

**Files:**
- Modify: `src/pages/Education.tsx`
- Create: `src/hooks/useEducationIntelligence.ts`
- Create: `src/components/education/EducationHero.tsx`
- Create: `src/components/education/EducationJourneySection.tsx`
- Create: `src/components/education/EducationProgressSection.tsx`
- Create: `src/components/education/EducationInvestorProfileCard.tsx`
- Create: `src/components/education/EducationAchievementsSection.tsx`
- Create: `src/components/education/EducationDailyTipCard.tsx`
- Create: `src/components/education/EducationGlossarySection.tsx`
- Create: `src/components/education/EducationEmptyState.tsx`
- Create: `src/utils/education/view-model.ts`
- Create: `src/utils/education/view-model.test.ts`

- [ ] **Step 1: Write failing rendering tests**
  - Cover:
    - first-run empty state
    - existing user with recommended track
    - real achievements integration
    - daily tip display with deterministic reason
    - glossary search behavior
  - Run: `pnpm test -- src/utils/education/view-model.test.ts`
  - Expected: FAIL because view-model helpers do not exist yet.

- [ ] **Step 2: Implement the page composition**
  - Replace all hardcoded modules and tips
  - Render real sections from the canonical context
  - Use loading skeletons rather than false placeholders
  - Show explicit messaging when a recommendation is generic because user data is still insufficient

- [ ] **Step 3: Integrate real gamification**
  - Use `useGamification()` and the canonical education context together
  - Stop hardcoding achievements on the page
  - Ensure only canonical achievement IDs are displayed

- [ ] **Step 4: Add lesson/progress interactions**
  - Users should be able to:
    - start a lesson
    - mark lesson complete
    - continue module
    - review finished modules
  - Progress writes must update both UI and education context refetch behavior

- [ ] **Step 5: Validate**
  - Run: `pnpm test -- src/utils/education/view-model.test.ts`
  - Run: `pnpm exec tsc -b --pretty false`
  - Run targeted browser validation of `/educacao`
  - Expected: no hardcoded content remains except seeded educational content.

- [ ] **Step 6: Commit**
  - Commit message: `feat(education): replace static page with personalized learning hub`

---

### Task 5 (Phase 5): Add Ana Clara educational mentoring and memory

**Files:**
- Create: `supabase/functions/ana-education-insights/index.ts`
- Create: `supabase/functions/_shared/education-renderers.ts`
- Modify: `src/pages/Education.tsx`
- Modify: `supabase/functions/process-whatsapp-message/context-manager.ts`
- Modify: `supabase/functions/process-whatsapp-message/index.ts`
- Modify: `supabase/functions/ana-dashboard-insights/index.ts`
- Test: `src/utils/education/intelligence-contract.test.ts`

- [ ] **Step 1: Write failing tests for Ana educational output**
  - Cover:
    - deterministic fallback exists when AI is unavailable
    - Ana does not recommend actions blocked by suitability
    - first-run users receive onboarding mentorship, not fabricated personalization
    - behavior-triggered trail switch is reflected in narrative
  - Run: `pnpm test -- src/utils/education/intelligence-contract.test.ts`
  - Expected: FAIL because Ana education narrative does not exist.

- [ ] **Step 2: Implement Ana narrative on top of deterministic context**
  - Deterministic facts must own:
    - recommended track
    - recommended next lesson
    - suitability guardrails
    - daily tip reason
    - behavioral warnings
  - AI may add:
    - tone
    - explanation
    - encouragement
    - practical rewording

- [ ] **Step 3: Add memory and longitudinal mentoring hooks**
  - Persist enough data for Ana to know:
    - what the user already learned
    - which module is stalled
    - what advice was already sent
    - when a trail was switched and why
  - Memory should support auditability, not hidden prompt magic.

- [ ] **Step 4: Validate**
  - Run: `pnpm test -- src/utils/education/intelligence-contract.test.ts`
  - Run targeted manual checks for:
    - no unsuitable investment prompt for conservative user
    - trail changes after behavior deterioration
    - deterministic fallback when AI provider fails

- [ ] **Step 5: Commit**
  - Commit message: `feat(education): add canonical Ana mentoring for education`

---

### Task 6 (Phase 6): Replace generic WhatsApp tips with canonical education messaging

**Files:**
- Create: `supabase/functions/send-education-tip/index.ts`
- Modify: `supabase/functions/send-ana-tips/index.ts`
- Modify: `supabase/functions/send-proactive-notifications/index.ts`
- Modify: `src/components/settings/NotificationsSettings.tsx`
- Modify: `src/types/settings.types.ts`
- Test: `supabase/functions/_shared/education-renderers.ts`

- [ ] **Step 1: Write failing tests for tip rendering and dedupe**
  - Cover:
    - no duplicate tip for the same user/reason/day/channel
    - schedule respects `whatsapp_enabled`, DND, and education tip preferences
    - deterministic reason is stored with the outbound message
  - Run the relevant edge-function unit tests available in the repo
  - Expected: FAIL because the new flow does not exist.

- [ ] **Step 2: Implement canonical send flow**
  - `send-education-tip` should:
    - fetch `education-intelligence`
    - build one deterministic tip reason
    - optionally call Ana for narrative polish
    - persist delivery in `education_daily_tips`
    - send to WhatsApp only if allowed

- [ ] **Step 3: Decide legacy flow handling**
  - Either:
    - deprecate `send-ana-tips` and reroute it internally to `send-education-tip`
    - or keep the slug but replace its internals fully
  - Do not keep two competing education-tip sources.

- [ ] **Step 4: Validate**
  - Check Supabase logs for the education tip function
  - Validate one real send path with WhatsApp disabled and enabled states
  - Confirm DND and schedule behavior

- [ ] **Step 5: Commit**
  - Commit message: `feat(education): canonicalize proactive education tips for WhatsApp`

---

### Task 7 (Phase 7): Observability, hardening, browser E2E, and rollout

**Files:**
- Modify: docs or operational notes only if existing docs are already authoritative
- Reuse: browser testing, Supabase logs, existing CI/test commands

- [ ] **Step 1: Verify full test surface**
  - Run:
    - `pnpm test -- src/utils/education/intelligence-contract.test.ts src/utils/education/view-model.test.ts`
    - `pnpm exec tsc -b --pretty false`
    - any edge-function-specific test commands created during implementation
  - Expected: PASS

- [ ] **Step 2: Deploy and verify**
  - Deploy:
    - `education-intelligence`
    - `ana-education-insights`
    - `send-education-tip` or updated `send-ana-tips`
  - Verify:
    - function logs
    - no 401/500 regressions
    - notification preference compatibility

- [ ] **Step 3: Browser E2E**
  - Validate:
    - first-run user state
    - user with progress and achievements
    - investor profile questionnaire flow
    - dynamic track and lesson progression
    - in-app daily tip
    - final Ana mentor block

- [ ] **Step 4: Real-data QA checklist**
  - Confirm the page answers these questions from real data:
    - why this trail was recommended
    - what the user should learn next
    - what financial behavior triggered the recommendation
    - whether suitability blocks aggressive advice
    - what Ana already sent recently
  - If any answer is opaque, the feature is not production-ready.

- [ ] **Step 5: Commit**
  - Commit message: `feat(education): ship personalized education intelligence`

---

## Rollout Order

The safest execution order is:

1. Canonical schema and context
2. Suitability
3. Real Education page
4. Ana educational narrative
5. WhatsApp proactive education
6. Full E2E and launch validation

Do **not** start with WhatsApp. That would amplify a weak source of truth.

---

## Success Criteria

This initiative is only complete when all of the following are true:

- `/educacao` no longer contains hardcoded modules, achievements, or tips
- Each user sees a trail chosen from real financial behavior plus learning state
- Ana Clara can explain why a trail changed
- Investor suitability exists and constrains investment education
- Daily tip logic is canonical, logged, and deduplicated
- WhatsApp educational nudges come from the same source of truth as the app
- The page is serious enough to guide real users, not just look finished

---

## Risks To Watch

- Over-personalization too early: first-run users still need a clean default journey
- Hidden AI state: educational reasons must be stored deterministically
- Advice drift: suitability must block unsafe investment mentorship everywhere
- Domain duplication: do not leave both `send-ana-tips` and a new education sender active with different logic
- Content debt: shipping the platform without real seeded lessons will produce another empty shell

---

## Self-Review

**Spec coverage:** The plan covers data model, deterministic context, suitability, frontend replacement, Ana mentoring, WhatsApp delivery, and final validation.

**Placeholder scan:** No `TBD`/`TODO` placeholders remain. Each phase names concrete files, concrete objectives, and concrete validation steps.

**Type consistency:** The plan consistently uses `EducationIntelligenceContext`, `investor_profile_assessments`, and `education_daily_tips` as canonical building blocks.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-06-education-intelligence-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
