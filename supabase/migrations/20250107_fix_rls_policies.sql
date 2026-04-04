-- =====================================================
-- FIX: Políticas RLS para Credit Card Transactions
-- =====================================================
-- Problema 1: Erro 403 ao criar compra (RLS bloqueando INSERT)
-- Problema 2: Cartões duplicados (constraint não aplicada)
-- =====================================================

-- =====================================================
-- PARTE 1: CORRIGIR CONSTRAINT DE CARTÕES DUPLICADOS
-- =====================================================

-- 1. Remover constraint antiga
ALTER TABLE credit_cards 
DROP CONSTRAINT IF EXISTS credit_cards_user_id_last_four_digits_key;

-- 2. Criar índice único parcial (apenas cartões não arquivados)
CREATE UNIQUE INDEX IF NOT EXISTS credit_cards_user_id_last_four_digits_active_key 
ON credit_cards (user_id, last_four_digits) 
WHERE is_archived = false;

-- =====================================================
-- PARTE 2: HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 3: POLÍTICAS RLS PARA CREDIT_CARDS
-- =====================================================

-- SELECT: Usuário pode ver apenas seus cartões
DROP POLICY IF EXISTS credit_cards_select_policy ON credit_cards;
CREATE POLICY credit_cards_select_policy ON credit_cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Usuário pode criar seus próprios cartões
DROP POLICY IF EXISTS credit_cards_insert_policy ON credit_cards;
CREATE POLICY credit_cards_insert_policy ON credit_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuário pode atualizar seus próprios cartões
DROP POLICY IF EXISTS credit_cards_update_policy ON credit_cards;
CREATE POLICY credit_cards_update_policy ON credit_cards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Usuário pode deletar seus próprios cartões
DROP POLICY IF EXISTS credit_cards_delete_policy ON credit_cards;
CREATE POLICY credit_cards_delete_policy ON credit_cards
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PARTE 4: POLÍTICAS RLS PARA CREDIT_CARD_TRANSACTIONS
-- =====================================================

-- SELECT: Usuário pode ver transações de seus cartões
DROP POLICY IF EXISTS credit_card_transactions_select_policy ON credit_card_transactions;
CREATE POLICY credit_card_transactions_select_policy ON credit_card_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_transactions.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- INSERT: Usuário pode criar transações em seus cartões
DROP POLICY IF EXISTS credit_card_transactions_insert_policy ON credit_card_transactions;
CREATE POLICY credit_card_transactions_insert_policy ON credit_card_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_transactions.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- UPDATE: Usuário pode atualizar transações de seus cartões
DROP POLICY IF EXISTS credit_card_transactions_update_policy ON credit_card_transactions;
CREATE POLICY credit_card_transactions_update_policy ON credit_card_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_transactions.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_transactions.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- DELETE: Usuário pode deletar transações de seus cartões
DROP POLICY IF EXISTS credit_card_transactions_delete_policy ON credit_card_transactions;
CREATE POLICY credit_card_transactions_delete_policy ON credit_card_transactions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_transactions.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- =====================================================
-- PARTE 5: POLÍTICAS RLS PARA CREDIT_CARD_INVOICES
-- =====================================================

-- SELECT: Usuário pode ver faturas de seus cartões
DROP POLICY IF EXISTS credit_card_invoices_select_policy ON credit_card_invoices;
CREATE POLICY credit_card_invoices_select_policy ON credit_card_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_invoices.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- INSERT: Usuário pode criar faturas em seus cartões
DROP POLICY IF EXISTS credit_card_invoices_insert_policy ON credit_card_invoices;
CREATE POLICY credit_card_invoices_insert_policy ON credit_card_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_invoices.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- UPDATE: Usuário pode atualizar faturas de seus cartões
DROP POLICY IF EXISTS credit_card_invoices_update_policy ON credit_card_invoices;
CREATE POLICY credit_card_invoices_update_policy ON credit_card_invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_invoices.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_invoices.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- DELETE: Usuário pode deletar faturas de seus cartões
DROP POLICY IF EXISTS credit_card_invoices_delete_policy ON credit_card_invoices;
CREATE POLICY credit_card_invoices_delete_policy ON credit_card_invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM credit_cards
      WHERE credit_cards.id = credit_card_invoices.credit_card_id
      AND credit_cards.user_id = auth.uid()
    )
  );

-- =====================================================
-- PARTE 6: LIMPAR CARTÕES DUPLICADOS (OPCIONAL)
-- =====================================================
-- ATENÇÃO: Execute apenas se quiser remover duplicatas
-- Mantém apenas o cartão mais recente de cada duplicata

-- Descomente para executar a limpeza:
/*
DELETE FROM credit_cards
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, last_four_digits, is_archived
        ORDER BY created_at DESC
      ) as rn
    FROM credit_cards
    WHERE is_archived = false
  ) t
  WHERE rn > 1
);
*/

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute para confirmar que as políticas foram criadas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('credit_cards', 'credit_card_transactions', 'credit_card_invoices')
-- ORDER BY tablename, policyname;

-- =====================================================
-- COMO USAR:
-- 1. Copie este SQL completo
-- 2. Abra Supabase Dashboard > SQL Editor
-- 3. Cole e execute tudo de uma vez
-- 4. Recarregue o app e teste criar compra
-- 5. Se ainda houver duplicatas, descomente a PARTE 6
-- =====================================================
