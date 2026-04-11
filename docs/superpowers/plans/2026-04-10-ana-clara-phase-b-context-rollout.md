# Ana Clara Phase B Context Rollout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit episodic memory and a unified agent context RPC so Ana Clara can load relevant facts plus recent meaningful interactions without breaking the current WhatsApp flow.

**Architecture:** Add a new `agent_memory_episodes` table and three RPCs: `save_memory_episode`, `get_agent_memory_context`, and `cleanup_old_episodes`. Keep `conversation_context` unchanged. Introduce a new shared module to format the unified context for prompt enrichment and integrate it behind the current `searchMemories() + buildDayContext()` path with full fallback.

**Tech Stack:** Supabase Postgres + RPC + pg_cron, Deno Edge Functions, TypeScript, Vitest.

---

## Safety Rules

1. Additive only. Do not replace `conversation_context`, `agent_memory_entries`, or the current prompt pipeline.
2. Migration first. New tables/RPCs must exist in the database before runtime starts calling them.
3. `get_agent_memory_context` is an optimization and enrichment layer, not a hard dependency. If it fails, Ana Clara keeps using the current path.
4. Keep the first rollout focused on individual WhatsApp context. Group context stays out of scope for this phase.
5. Save episodes only for meaningful events to avoid noisy memory.

## Files

- Create: `docs/superpowers/plans/2026-04-10-ana-clara-phase-b-context-rollout.md`
- Create: `supabase/functions/_shared/__tests__/agent-memory-context.test.ts`
- Create: `supabase/functions/_shared/agent-memory-context.ts`
- Create: `supabase/migrations/20260411170000_phase_b_agent_memory_context.sql`
- Modify: `supabase/functions/_shared/agent-memory.ts`
- Modify: `supabase/functions/process-whatsapp-message/index.ts`
- Modify: `supabase/functions/process-whatsapp-message/nlp-classifier.ts`

## Task 1: Define and Test Context Formatting

- [ ] Add a failing test file for unified context formatting.
- [ ] Verify the test fails for the expected missing-module reason.
- [ ] Implement pure helpers to format facts + episodes into a prompt-safe block.
- [ ] Re-run the focused test and confirm it passes.

## Task 2: Add and Apply Database Migration

- [ ] Create table `agent_memory_episodes`.
- [ ] Create RPC `save_memory_episode(...)`.
- [ ] Create RPC `get_agent_memory_context(...)`.
- [ ] Create RPC `cleanup_old_episodes()`.
- [ ] Add a weekly cleanup cron for old episodes.
- [ ] Apply the migration to Supabase immediately.
- [ ] Verify table, RPCs, and cron exist.

## Task 3: Add Shared Context Loader

- [ ] Create `agent-memory-context.ts` with:
  - DB result types
  - `loadUnifiedAgentContext(...)`
  - formatting helpers for facts + episodes
- [ ] Keep all failures non-blocking and return `null` on RPC issues.
- [ ] Re-run focused tests.

## Task 4: Integrate Prompt Enrichment

- [ ] Extend `AgentEnrichment` to accept episodic context text.
- [ ] Load unified context in `process-whatsapp-message/index.ts` alongside `buildDayContext`.
- [ ] Prefer unified context block when available; otherwise keep current `searchMemories()` path.
- [ ] Re-run relevant tests.

## Task 5: Save Meaningful Episodes

- [ ] Save episodes for:
  - onboarding completion
  - answered agenda/day-summary style queries
  - successful high-confidence financial actions already being logged
- [ ] Keep episode writes fire-and-forget.
- [ ] Use conservative importance defaults (`0.2` to `0.6`).
- [ ] Re-run relevant tests.

## Task 6: Verify and Deploy

- [ ] Run the new focused Vitest file.
- [ ] Run the existing `_shared` tests touched by this phase.
- [ ] Run lint checks for touched files if practical.
- [ ] Apply migration to Supabase.
- [ ] Deploy `process-whatsapp-message`.
- [ ] Validate one controlled DB episode insert + context fetch.
- [ ] Report exact verification evidence and residual risks.
