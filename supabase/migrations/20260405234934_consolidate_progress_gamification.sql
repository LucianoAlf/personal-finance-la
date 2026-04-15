-- =============================================================================
-- LEGACY NO-OP (schema baseline repair — 2026-04)
-- =============================================================================
-- Original body required public.user_gamification before that table was created
-- in replay order (see 20260411136000_gamification_complete.sql). Consolidated
-- RPCs moved to: 20260411136500_consolidate_progress_gamification.sql
-- =============================================================================

SELECT 1;
