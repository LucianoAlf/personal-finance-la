-- =============================================================================
-- LEGACY NO-OP (schema baseline repair — 2026-04)
-- =============================================================================
-- This file attempted CREATE TABLE credit_card_payments before
-- credit_card_invoices existed in replay order. Canonical DDL is:
--   20251105192352_create_credit_card_payments_table.sql
-- =============================================================================

SELECT 1;
