-- =====================================================
-- LIMPAR POLÍTICAS RLS DUPLICADAS
-- =====================================================
-- Problema: Existem políticas antigas E novas (duplicadas)
-- Solução: Remover políticas antigas, manter apenas as novas
-- =====================================================

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS - CREDIT_CARDS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete own credit cards" ON credit_cards;

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS - CREDIT_CARD_TRANSACTIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own cc transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can insert own cc transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can update own cc transactions" ON credit_card_transactions;
DROP POLICY IF EXISTS "Users can delete own cc transactions" ON credit_card_transactions;

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS - CREDIT_CARD_INVOICES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON credit_card_invoices;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Execute para confirmar (deve ter apenas 4 políticas por tabela):
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('credit_cards', 'credit_card_transactions', 'credit_card_invoices')
-- ORDER BY tablename, policyname;

-- =====================================================
-- COMO USAR:
-- 1. Copie este SQL
-- 2. Abra Supabase Dashboard > SQL Editor
-- 3. Cole e execute
-- 4. Recarregue o app e teste criar compra novamente
-- =====================================================
