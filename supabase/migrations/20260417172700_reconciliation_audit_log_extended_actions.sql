-- Onda 2: estender o CHECK do reconciliation_audit_log.action para incluir os novos verbos
-- emitidos pelo edge function reconciliation-action:
--   - marked_transfer     (mark_transfer)   : duas pernas da mesma transferencia interna
--   - ignored             (ignore)          : operador declarou "nao reconheco"
--   - linked_payable      (link_payable)    : vinculou a payable_bill existente + baixou como pago
--   - registered_expense  (register_expense): criou uma transacao de despesa a partir do bank_transaction
--
-- Sem esta migracao, o INSERT do audit log estoura o CHECK existente
-- (confirmed/rejected/deferred/classified/linked/unlinked/auto_closed) e
-- o backend reverte a decisao inteira. Ou seja: a Onda 2 parte 1 esta
-- latente-quebrada ate aqui.

ALTER TABLE public.reconciliation_audit_log
  DROP CONSTRAINT IF EXISTS reconciliation_audit_log_action_check;

ALTER TABLE public.reconciliation_audit_log
  ADD CONSTRAINT reconciliation_audit_log_action_check
  CHECK (action IN (
    -- Onda 1 (ledger seguro / auditoria basica)
    'confirmed',
    'rejected',
    'deferred',
    'classified',
    'linked',
    'unlinked',
    'auto_closed',
    -- Onda 2 parte 1 (sem mover dinheiro)
    'marked_transfer',
    'ignored',
    -- Onda 2 parte 2 (mutacao financeira explicita)
    'linked_payable',
    'registered_expense'
  ));

COMMENT ON CONSTRAINT reconciliation_audit_log_action_check ON public.reconciliation_audit_log IS
  'Verbos canonicos que o reconciliation-action edge function emite. Alterar SEMPRE em sincronia com mapAuditAction() em supabase/functions/reconciliation-action/index.ts.';
