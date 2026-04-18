-- Onda 2 parte 2: register_expense gera um lancamento em public.transactions a partir de um
-- bank_transaction. Queremos que o "carimbo de origem" fique explicitamente distinto de
-- 'manual' / 'whatsapp' / 'import' / 'open_finance', senao perdemos linhagem analitica:
-- nao da pra separar "o usuario registrou na mao" de "a reconciliacao gerou como despesa
-- a partir do extrato do banco".
--
-- Adiciona 'bank_reconciliation' como source valida. Tudo que ja existia continua valendo.

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_source_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (
    (source)::text = ANY (
      (ARRAY['manual', 'whatsapp', 'import', 'open_finance', 'bank_reconciliation'])::character varying[]
    )
  );

COMMENT ON CONSTRAINT transactions_source_check ON public.transactions IS
  'Fontes possiveis de um lancamento. bank_reconciliation marca transacoes criadas pelo edge function reconciliation-action (action=register_expense) a partir de um bank_transactions row.';
