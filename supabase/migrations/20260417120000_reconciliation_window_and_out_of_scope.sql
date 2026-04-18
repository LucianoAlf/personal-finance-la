-- Wave 1 of operational-quality sprint: introduce an honest reconciliation
-- window so the inbox/KPIs stop being contaminated by months of historical
-- Pluggy noise. We add:
--   * bank_transactions.out_of_scope boolean flag (default false)
--   * user_settings.reconciliation_window_start date (default 2026-04-01)
--   * a backfill routine that flips out_of_scope=true for any pre-window row
--     AND auto-closes the reconciliation_cases those rows spawned, so the
--     operator stops drowning in 2.5k urgent historical cases.
--
-- This migration is intentionally destructive-free: no rows are deleted; the
-- historical audit trail remains intact, just hidden from the operational UI.

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS out_of_scope boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bank_transactions.out_of_scope IS
  'True when the transaction predates the active reconciliation window. Such rows stay in the DB for audit/history but are hidden from KPIs and inbox by default.';

CREATE INDEX IF NOT EXISTS bank_transactions_user_scope_date_idx
  ON public.bank_transactions (user_id, out_of_scope, date DESC);

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS reconciliation_window_start date NOT NULL DEFAULT DATE '2026-04-01';

COMMENT ON COLUMN public.user_settings.reconciliation_window_start IS
  'Cutoff date for reconciliation UI. Transactions before this date are marked out_of_scope and hidden from the default inbox/KPIs. Configurable per user; global default is 2026-04-01.';

-- Backfill #1: flag historical bank transactions as out_of_scope so the UI
-- stops pretending they are current work. Matches per-user cutoff when the
-- user already has a setting row; otherwise falls back to the global default
-- of 2026-04-01.
WITH user_cutoff AS (
  SELECT
    bt.user_id,
    COALESCE(us.reconciliation_window_start, DATE '2026-04-01') AS window_start
  FROM public.bank_transactions bt
  LEFT JOIN public.user_settings us ON us.user_id = bt.user_id
  GROUP BY bt.user_id, us.reconciliation_window_start
)
UPDATE public.bank_transactions bt
SET
  out_of_scope = true,
  updated_at = now()
FROM user_cutoff uc
WHERE bt.user_id = uc.user_id
  AND bt.date < uc.window_start
  AND bt.out_of_scope = false;

-- Backfill #2: auto-close any reconciliation cases whose bank row is now
-- out_of_scope, so the inbox reflects the new operational truth. We reuse the
-- existing auto_close helper so the audit trail records the reason per-case.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT rc.id AS case_id, rc.user_id
    FROM public.reconciliation_cases rc
    JOIN public.bank_transactions bt ON bt.id = rc.bank_transaction_id
    WHERE bt.out_of_scope = true
      AND rc.status NOT IN ('confirmed', 'rejected', 'deferred', 'auto_closed')
  LOOP
    PERFORM public.auto_close_reconciliation_case(
      r.case_id,
      r.user_id,
      'out_of_scope_archive: transacao anterior a janela operacional, arquivada sem impacto no saldo.',
      'system_backfill'
    );
  END LOOP;
END
$$;
