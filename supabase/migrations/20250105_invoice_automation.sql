-- =============================================================================
-- LEGACY NO-OP (schema baseline repair — 2026-04)
-- =============================================================================
-- Original automation referenced credit_card_invoices before that table existed
-- in filename order (20250105 < 20251105). Logic moved to:
--   20251105193000_invoice_automation.sql
-- Retained so environments that already applied the historical version keep
-- migration identity.
-- =============================================================================

SELECT 1;
