-- =============================================================================
-- LEGACY NO-OP (schema baseline repair — 2026-04)
-- =============================================================================
-- Historically this file ALTERed credit_cards before that table existed in the
-- replay order, breaking fresh bootstrap. Column issuing_bank and backfill logic
-- were merged into 20251105192315_create_credit_cards_table.sql.
--
-- Deployments that already applied the previous body keep migration lineage;
-- new replays rely on the consolidated credit_cards migration.
-- =============================================================================

SELECT 1;
