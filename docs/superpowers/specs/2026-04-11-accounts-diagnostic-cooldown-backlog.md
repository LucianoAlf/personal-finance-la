# Accounts Diagnostic Cooldown Backlog

**Status:** Open backlog
**Date:** 2026-04-11
**Parent:** `specs/2026-04-11-accounts-diagnostic-ux-spec.md`
**Reason:** Phase 1 intentionally shipped without memory/session cooldown infrastructure.

---

## Goal

Implement the anti-fatigue cooldown rules already defined in the accounts observation spec, without hiding that they are still pending work.

This backlog exists so the gap is explicit product debt, not an implicit TODO in code comments.

---

## Pending items

### 1. Cooldown per anomaly

Store an `acknowledged_anomaly` memory entry keyed by:

- `bill_id`
- `anomaly_type`
- `user_id`

Behavior:

- once surfaced and acknowledged, the same anomaly should not be re-surfaced for 7 days
- explicit full health-check ignores this cooldown

### 2. Cooldown per session

Track whether a diagnostic block was already shown in the current conversation window.

Behavior:

- after a passive diagnostic block is shown, subsequent passive listings in the same session should not append another diagnostic block
- explicit full health-check still shows the full picture

### 3. Clear acknowledgement semantics

Define exactly which user responses count as acknowledgement, for example:

- `ok`
- `entendi`
- `depois vejo`
- silent continuation into another topic

### 4. Regression coverage

Add integration coverage proving:

- passive listing respects anomaly cooldown
- passive listing respects session cooldown
- explicit health-check bypasses both cooldowns

---

## Non-goals

- No financial mutation
- No safe action flow
- No cross-domain rollout yet

---

## Shipping rule

Do not mark the anti-fatigue system as complete until both cooldowns are implemented and covered by regression tests.
