-- Phase 4: reconciliation data core (source-agnostic bank truth vs system cases).
-- See docs/superpowers/specs/2026-04-14-bank-reconciliation-phase4-design.md

CREATE TYPE public.reconciliation_divergence_type AS ENUM (
  'unmatched_bank_transaction',
  'pending_bill_paid_in_bank',
  'amount_mismatch',
  'date_mismatch',
  'balance_mismatch',
  'possible_duplicate',
  'stale_connection',
  'unclassified_transaction'
);

CREATE TYPE public.reconciliation_case_status AS ENUM (
  'open',
  'awaiting_user',
  'confirmed',
  'rejected',
  'deferred',
  'auto_closed'
);

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('manual_paste', 'csv_upload', 'manual_entry', 'pluggy')),
  source_item_id text,
  external_id text,
  account_name text NOT NULL,
  external_account_id text,
  internal_account_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL,
  amount numeric(14, 2) NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  raw_description text,
  category_suggestion text,
  currency_code text NOT NULL DEFAULT 'BRL',
  imported_at timestamptz NOT NULL DEFAULT now(),
  reconciliation_status text NOT NULL DEFAULT 'pending' CHECK (
    reconciliation_status IN ('pending', 'matched', 'reconciled', 'rejected', 'deferred')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bank_transactions_user_source_external_id_key
  ON public.bank_transactions (user_id, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX bank_transactions_user_id_date_idx
  ON public.bank_transactions (user_id, date DESC);

CREATE INDEX bank_transactions_user_reconciliation_status_idx
  ON public.bank_transactions (user_id, reconciliation_status);

CREATE TABLE public.reconciliation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  bank_transaction_id uuid NOT NULL REFERENCES public.bank_transactions (id) ON DELETE CASCADE,
  divergence_type public.reconciliation_divergence_type NOT NULL,
  matched_record_type text CHECK (matched_record_type IN ('payable_bill', 'transaction', 'account')),
  matched_record_id uuid,
  confidence numeric(5, 4) NOT NULL DEFAULT 0,
  confidence_reasoning jsonb NOT NULL DEFAULT '{}'::jsonb,
  hypotheses jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.reconciliation_case_status NOT NULL DEFAULT 'open',
  priority text NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'infra')),
  auto_close_reason text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reconciliation_cases_user_priority_status_idx
  ON public.reconciliation_cases (user_id, priority, status, updated_at DESC);

CREATE INDEX reconciliation_cases_bank_transaction_id_idx
  ON public.reconciliation_cases (bank_transaction_id);

CREATE TABLE public.reconciliation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.reconciliation_cases (id) ON DELETE SET NULL,
  action text NOT NULL CHECK (
    action IN ('confirmed', 'rejected', 'deferred', 'classified', 'linked', 'unlinked', 'auto_closed')
  ),
  confidence_at_decision numeric(5, 4) NOT NULL,
  bank_transaction_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  system_record_snapshot jsonb,
  actor text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reconciliation_audit_log_user_created_idx
  ON public.reconciliation_audit_log (user_id, created_at DESC);

CREATE INDEX reconciliation_audit_log_case_id_idx
  ON public.reconciliation_audit_log (case_id)
  WHERE case_id IS NOT NULL;

CREATE TABLE public.pluggy_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  institution_name text NOT NULL,
  status text NOT NULL,
  last_synced_at timestamptz,
  staleness_threshold_hours integer NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pluggy_connections_user_id_item_id_key UNIQUE (user_id, item_id)
);

CREATE INDEX pluggy_connections_user_id_idx
  ON public.pluggy_connections (user_id);

COMMENT ON TABLE public.bank_transactions IS 'External bank truth normalized from paste, CSV, manual entry, or Pluggy.';
COMMENT ON TABLE public.reconciliation_cases IS 'One inbox item per surfaced divergence for a bank transaction.';
COMMENT ON TABLE public.reconciliation_audit_log IS 'Immutable audit of reconciliation decisions; clients read-only.';
COMMENT ON TABLE public.pluggy_connections IS 'Pluggy item health per user for stale-connection confidence caps.';

-- Row level security
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pluggy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_transactions_select_own ON public.bank_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bank_transactions_insert_own ON public.bank_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bank_transactions_update_own ON public.bank_transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY bank_transactions_delete_own ON public.bank_transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY reconciliation_cases_select_own ON public.reconciliation_cases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY reconciliation_cases_insert_own ON public.reconciliation_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY reconciliation_cases_update_own ON public.reconciliation_cases
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY reconciliation_cases_delete_own ON public.reconciliation_cases
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY reconciliation_audit_log_select_own ON public.reconciliation_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY pluggy_connections_select_own ON public.pluggy_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY pluggy_connections_insert_own ON public.pluggy_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY pluggy_connections_update_own ON public.pluggy_connections
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY pluggy_connections_delete_own ON public.pluggy_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-close: only via SECURITY DEFINER + audit row with bank snapshot (service_role / backend).
CREATE OR REPLACE FUNCTION public.auto_close_reconciliation_case(
  p_case_id uuid,
  p_user_id uuid,
  p_reason text,
  p_actor text DEFAULT 'system'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.reconciliation_cases%ROWTYPE;
  v_updated integer;
  v_snapshot jsonb;
BEGIN
  SELECT c.*
  INTO v_case
  FROM public.reconciliation_cases c
  WHERE c.id = p_case_id
    AND c.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_case.status IN ('confirmed', 'rejected', 'deferred', 'auto_closed') THEN
    RETURN;
  END IF;

  SELECT to_jsonb(bt.*)
  INTO v_snapshot
  FROM public.bank_transactions bt
  WHERE bt.id = v_case.bank_transaction_id;

  IF v_snapshot IS NULL THEN
    v_snapshot := '{}'::jsonb;
  END IF;

  UPDATE public.reconciliation_cases c
  SET
    status = 'auto_closed',
    auto_close_reason = p_reason,
    resolved_at = now(),
    resolved_by = p_actor,
    updated_at = now()
  WHERE c.id = p_case_id
    AND c.user_id = p_user_id
    AND c.status NOT IN ('confirmed', 'rejected', 'deferred', 'auto_closed');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.reconciliation_audit_log (
    user_id,
    case_id,
    action,
    confidence_at_decision,
    bank_transaction_snapshot,
    system_record_snapshot,
    actor,
    notes
  )
  VALUES (
    p_user_id,
    p_case_id,
    'auto_closed',
    v_case.confidence,
    v_snapshot,
    NULL,
    p_actor,
    p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auto_close_reconciliation_case(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_close_reconciliation_case(uuid, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.auto_close_reconciliation_case(uuid, uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_reconciliation_case(uuid, uuid, text, text) TO service_role;
