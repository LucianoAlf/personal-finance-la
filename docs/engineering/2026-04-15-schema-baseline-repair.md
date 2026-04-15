# Schema baseline repair (2026-04)

## Diagnosis

Local `supabase start` / full migration replay failed while Phase 4 work was blocked on Task 2. Root cause was **not** the reconciliation migration itself: the **replayable migration history did not create core PFM tables** (`public.users`, `public.accounts`, `public.categories`, `public.transactions`) at all. Those objects exist in production and in `tmp/remote-public-schema.sql`, but incremental migrations jumped straight to features (tags, credit cards, etc.) that assumed `public.transactions` already existed.

A second ordering bug: `20241213_add_issuing_bank_column.sql` ran **before** `20251105192315_create_credit_cards_table.sql` in filename order, so a fresh database attempted `ALTER TABLE credit_cards` before the table was created.

Together, this is **structural baseline drift**: version list alignment does not imply a clean replay from zero.

## Adopted baseline (reference)

- **Authoritative shape** for the four core tables: `tmp/remote-public-schema.sql` (public schema dump, same Supabase project as `supabase/config.toml` `project_id`).
- **Replay mechanism**: one consolidated migration that sorts first — `supabase/migrations/20240101000000_baseline_core_pfm_tables.sql` — so every environment applies the same foundation before all historical incremental files.

## What was missing from replay

| Object | In remote / dump | In old migration replay |
|--------|-------------------|-------------------------|
| `public.users` | Yes | Never created |
| `public.accounts` | Yes | Never created |
| `public.categories` | Yes | Never created |
| `public.transactions` | Yes | Never created |

Downstream migrations referenced `transactions` (e.g. `20251105124917_create_tags_system.sql`) without any prior `CREATE TABLE`, so bootstrap was impossible.

## Cutover decisions

1. **Baseline migration** (`20240101000000_*`) introduces the four tables with PKs/FKs/checks aligned to the remote dump.
2. **`20241213_add_issuing_bank_column.sql`** is reduced to a **documented no-op** (`SELECT 1`) so the filename/version remains in history for already-deployed databases, while fresh replays do not run `ALTER` before `CREATE`.
3. **`issuing_bank`** column creation and heuristic backfill live in **`20251105192315_create_credit_cards_table.sql`** together with `CREATE TABLE credit_cards`, preserving behaviour for new replays.
4. **January 2025 vs November 2025 ordering bug**: `20250105_invoice_automation.sql` and `20250106_credit_card_payments.sql` sorted **before** `20251105*` credit-card DDL but depended on `credit_card_invoices` / `credit_card_payments`. Those two January files are now **documented no-ops**; invoice automation was moved to **`20251105193000_invoice_automation.sql`** (after `credit_card_invoices` and triggers). Canonical `credit_card_payments` DDL remains **`20251105192352_create_credit_card_payments_table.sql`**.
5. **Gamification consolidate ordering**: `20260405234934_consolidate_progress_gamification.sql` referenced `user_gamification` before **`20260411136000_gamification_complete.sql`** created it. The April 5 file is a **no-op**; the real body lives in **`20260411136500_consolidate_progress_gamification.sql`** (after `gamification_complete`).
6. **Storage migration**: `COMMENT ON COLUMN storage.buckets.*` failed under the migration role locally (not owner of `storage`); the comment was removed from **`20251111000002_create_storage_buckets.sql`** with a note — behaviour of bucket insert/policies unchanged.
7. **Calendar duplicate migrations**: `20260408180359_*` / `20260408183519_*` duplicated `20260409000005` / `20260409000006` but ran **before** `20260409000001_create_calendar_domain.sql`, so `calendar_event_status` was missing. The August-dated copies are **no-ops**; canonical calendar RPC migrations remain **`20260409000005`** and **`20260409000006`**.
8. **More April 8 calendar files before domain**: `20260408193141_calendar_cancel_ticktick_enqueue.sql` and `20260408194210_calendar_reminder_schedule_delivery_audit.sql` also sorted before `20260409000001` but depended on calendar types/tables. They are **no-ops**; canonical behaviour is in **`20260409000006`** / **`20260409000007`** (and related `2026040900000*` files).
9. **Bidirectional sync**: `20260408225941_bidirectional_sync_v1.sql` altered calendar enums before they existed. Body moved to **`20260409000009_bidirectional_sync_v1.sql`** (after core calendar DDL); the April 8 filename is a **no-op**.

## Why replay is trustworthy again

- Fresh databases apply a **single, explicit foundation** before any feature migration.
- The foundation matches the **documented remote snapshot** (`tmp/remote-public-schema.sql`), not ad hoc per-file guards.
- Ordering bug between Dec 2024 and Nov 2025 credit-card DDL is **removed** without relying on silent `IF EXISTS` chains across many files.

## Operational note (existing production)

If a linked project already applied the **previous** body of `20241213_add_issuing_bank_column.sql`, the migration row is satisfied; the new no-op does not re-apply DDL. Teams that rely on migration checksum verification against modified files should run `supabase migration list` / repair flows if the CLI reports drift after pulling this change — the intentional trade-off for fixing bootstrap.

## Next steps after this repair

1. `npx supabase db reset` (or full local start) completes all migrations.
2. Re-validate Phase 4 Task 2 migration against a clean local database.
3. Integrate Task 2 to the main branch only after that checkpoint is green.

## Task 2 integrated (same branch)

Phase 4 data core is now in the main tree:

- `supabase/migrations/20260414110000_create_reconciliation_core_tables.sql` — enums, `bank_transactions`, `reconciliation_cases`, `reconciliation_audit_log` (`case_id` nullable, `ON DELETE SET NULL`), `pluggy_connections` (unique `user_id` + `item_id`), RLS (audit **select-only** for clients), `auto_close_reconciliation_case` with `to_jsonb` snapshot and **execute granted only to `service_role`**.
- `src/types/database.types.ts` — matching TypeScript interfaces for the new tables.
