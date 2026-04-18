-- Onda 2: sem-match pode ser resolvido sem tocar no ledger.
-- Adicionamos suporte a:
--   a) pareamento de transferencias internas entre duas bank_transactions.
--   b) estado "ignored" (nao reconhecido) auditavel, distinto de 'rejected'.
-- Ambos fecham o caso sem mover dinheiro no sistema; a auditoria continua integra.

-- Pareia duas pontas da mesma transferencia. Cada perna guarda o mesmo pair id.
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS transfer_pair_id uuid;

COMMENT ON COLUMN public.bank_transactions.transfer_pair_id IS
  'When two bank_transactions are confirmed to be the two legs of the same internal transfer, they share this id. UI/KPI hide paired legs from the unmatched inbox automatically.';

CREATE INDEX IF NOT EXISTS bank_transactions_transfer_pair_idx
  ON public.bank_transactions (user_id, transfer_pair_id)
  WHERE transfer_pair_id IS NOT NULL;

-- Acrescenta o status "ignored" e "transfer_matched" ao CHECK atual.
-- Supabase exige recriar o CHECK quando o conjunto de valores muda.
ALTER TABLE public.bank_transactions
  DROP CONSTRAINT IF EXISTS bank_transactions_reconciliation_status_check;

ALTER TABLE public.bank_transactions
  ADD CONSTRAINT bank_transactions_reconciliation_status_check
  CHECK (reconciliation_status IN (
    'pending',
    'matched',
    'reconciled',
    'rejected',
    'deferred',
    'ignored',
    'transfer_matched'
  ));

-- O motivo do ignorar/transferencia vai em reconciliation_cases.auto_close_reason (ja existe),
-- mas tambem queremos guardar a contraparte especifica quando e uma transferencia.
-- Evitamos criar nova tabela: o pair id ja linka as duas pontas; o audit log guarda o contexto.

COMMENT ON CONSTRAINT bank_transactions_reconciliation_status_check ON public.bank_transactions IS
  'Allowed lifecycle states. "ignored" marks operator-declared unrecognized rows; "transfer_matched" marks both legs of a paired internal transfer.';
