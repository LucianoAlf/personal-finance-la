-- =====================================================
-- FIX: Permitir criar cartão com mesmos dígitos se o anterior estiver arquivado
-- =====================================================
-- Problema: Constraint única impede criar cartão novo mesmo após arquivar
-- Solução: Constraint única apenas para cartões ativos (is_archived = false)
-- =====================================================

-- 1. Remover constraint antiga
ALTER TABLE credit_cards 
DROP CONSTRAINT IF EXISTS credit_cards_user_id_last_four_digits_key;

-- 2. Criar índice único parcial (apenas cartões não arquivados)
CREATE UNIQUE INDEX IF NOT EXISTS credit_cards_user_id_last_four_digits_active_key 
ON credit_cards (user_id, last_four_digits) 
WHERE is_archived = false;

-- =====================================================
-- COMO USAR:
-- 1. Copie este SQL
-- 2. Abra Supabase Dashboard > SQL Editor
-- 3. Cole e execute
-- 4. Teste criar cartão com dígitos repetidos (deve funcionar agora!)
-- =====================================================
