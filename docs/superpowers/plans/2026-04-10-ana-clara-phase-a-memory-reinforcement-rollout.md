# Ana Clara Phase A Memory Reinforcement Rollout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reinforcement-based long-term memory for Ana Clara without breaking the current WhatsApp, NLP, onboarding, agenda, or billing flows.

**Architecture:** Introduce a pure reinforcement helper layer, then add a database migration that evolves `agent_memory_entries` with reinforcement metadata and RPCs. Wire the new logic into `agent-memory.ts` with full fallback to the current deduplication/insert path, then roll out in two stages: Stage 1 for `preference` only, Stage 2 for `pattern` and `decision`.

**Tech Stack:** Supabase Postgres + RPC + pg_cron, Deno Edge Functions, TypeScript, Vitest.

---

## Safety Rules

1. Additive only. Do not remove or rewrite the existing NLP, onboarding, or prompt pipeline.
2. Migration first. If schema changes are needed, write and apply them early so runtime code never depends on missing columns/RPCs.
3. New memory logic must be non-blocking. Any RPC failure falls back to the current `saveMemory()` path.
4. Test the pure reinforcement rules before wiring them into Supabase-dependent code.
5. Roll out in two stages:
   - Stage 1: `preference`
   - Stage 2: `pattern`, `decision`

## Files

- Create: `docs/superpowers/plans/2026-04-10-ana-clara-phase-a-memory-reinforcement-rollout.md`
- Create: `supabase/functions/_shared/__tests__/agent-memory-reinforcement.test.ts`
- Create: `supabase/functions/_shared/agent-memory-reinforcement.ts`
- Create: `supabase/migrations/20260411153000_phase_a_memory_reinforcement.sql`
- Modify: `supabase/functions/_shared/agent-memory.ts`
- Modify: `supabase/functions/process-whatsapp-message/index.ts`

## Task 1: Write and Verify Reinforcement Rules

- [ ] Add a failing test file for rollout eligibility, confidence progression, and stale fact decay.
- [ ] Run the focused Vitest file and confirm it fails for the expected reason.
- [ ] Implement the pure helper functions in `agent-memory-reinforcement.ts`.
- [ ] Re-run the focused Vitest file and confirm it passes.

## Task 2: Add and Apply Database Migration

- [ ] Create a migration that alters `agent_memory_entries` with:
  - `reinforcement_count integer not null default 1`
  - `confidence numeric(4,3) not null default 0.6`
  - `last_reinforced_at timestamptz not null default now()`
- [ ] Create RPC `learn_or_reinforce_fact(...)`.
- [ ] Create RPC `decay_stale_facts()`.
- [ ] Apply the migration to the target Supabase project immediately after review.
- [ ] Run a verification query to confirm columns and RPCs exist.

## Task 3: Integrate Reinforcement With Fallback

- [ ] Update `agent-memory.ts` to route eligible memory types through reinforcement RPCs.
- [ ] Keep the current dedup/insert logic as fallback when reinforcement is disabled or fails.
- [ ] Add Stage 1 rollout constant so only `preference` uses reinforcement first.
- [ ] Re-run targeted tests.

## Task 4: Wire Stage 1 Entry Points

- [ ] Reinforce user communication preferences when tone adaptation detects a stable change.
- [ ] Reinforce onboarding-derived preferences when identity is created.
- [ ] Keep all calls fire-and-forget / non-blocking.
- [ ] Run targeted tests and a broader relevant test slice.

## Task 5: Stage 2 Expansion

- [ ] Expand rollout eligibility from `preference` to `preference`, `pattern`, and `decision`.
- [ ] Route the existing high-confidence NLP memory save for transaction-like intents through Stage 2.
- [ ] Re-run the focused tests and the affected relevant tests.

## Task 6: Verify and Deploy

- [ ] Run the focused Vitest file.
- [ ] Run the existing `_shared` test files touched by this work.
- [ ] Run lint checks for touched files if practical.
- [ ] Apply the migration to Supabase.
- [ ] Deploy `process-whatsapp-message` if code changed there.
- [ ] Report exact verification evidence and any remaining risk.
