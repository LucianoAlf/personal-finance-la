-- =============================================================================
-- DUPLICATE / WRONG ORDER (schema baseline repair — 2026-04)
-- =============================================================================
-- Ran before calendar domain (20260409000001). TickTick cancel + 3-arg
-- set_calendar_event_status are in later migrations (see 20260409000006+).
-- =============================================================================

SELECT 1;
