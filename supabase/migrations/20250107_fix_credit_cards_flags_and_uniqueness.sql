-- =====================================================
-- FIX DEFINITIVO: Normalizar flags e eliminar duplicatas de cartões
-- =====================================================
-- Problema: Cartões duplicados aparecem na UI
-- Causas:
--   1. is_archived pode estar NULL (escapa do índice parcial)
--   2. Duplicatas criadas antes do índice parcial
--   3. View pode retornar múltiplas linhas por JOINs
-- Solução:
--   1. Normalizar is_archived/is_active (NOT NULL, default)
--   2. Remover duplicatas ativas (manter mais recente)
--   3. Recriar índice único parcial corretamente
-- =====================================================

-- =====================================================
-- PARTE 1: NORMALIZAR FLAGS (is_archived, is_active)
-- =====================================================

-- 1.1. Atualizar NULLs para valores padrão
UPDATE credit_cards 
SET is_archived = false 
WHERE is_archived IS NULL;

UPDATE credit_cards 
SET is_active = true 
WHERE is_active IS NULL;

-- 1.2. Definir NOT NULL e DEFAULT
ALTER TABLE credit_cards 
ALTER COLUMN is_archived SET DEFAULT false,
ALTER COLUMN is_archived SET NOT NULL;

ALTER TABLE credit_cards 
ALTER COLUMN is_active SET DEFAULT true,
ALTER COLUMN is_active SET NOT NULL;

-- =====================================================
-- PARTE 2: REMOVER DUPLICATAS ATIVAS
-- =====================================================
-- Mantém apenas o registro mais recente de cada duplicata
-- (baseado em user_id + last_four_digits + is_archived = false)

DELETE FROM credit_cards
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, last_four_digits, is_archived
        ORDER BY created_at DESC, updated_at DESC NULLS LAST
      ) as rn
    FROM credit_cards
    WHERE is_archived = false
  ) t
  WHERE rn > 1
);

-- =====================================================
-- PARTE 3: RECRIAR ÍNDICE ÚNICO PARCIAL
-- =====================================================

-- 3.1. Remover índice antigo (se existir)
DROP INDEX IF EXISTS credit_cards_user_id_last_four_digits_active_key;

-- 3.2. Remover constraint antiga (se existir)
ALTER TABLE credit_cards 
DROP CONSTRAINT IF EXISTS credit_cards_user_id_last_four_digits_key;

-- 3.3. Criar índice único parcial (apenas cartões NÃO arquivados)
CREATE UNIQUE INDEX credit_cards_user_id_last_four_digits_active_key 
ON credit_cards (user_id, last_four_digits) 
WHERE is_archived = false;

-- =====================================================
-- PARTE 4: VERIFICAR VIEW v_credit_cards_summary
-- =====================================================
-- Se a view ainda retornar duplicatas, precisamos ajustá-la
-- Execute esta query para verificar:
/*
SELECT id, user_id, name, last_four_digits, COUNT(*) as total
FROM v_credit_cards_summary
WHERE is_archived = false
GROUP BY id, user_id, name, last_four_digits
HAVING COUNT(*) > 1;
*/

-- Se retornar linhas, a view precisa de DISTINCT ou GROUP BY
-- Nesse caso, execute o bloco abaixo (descomente):

/*
-- Recriar view com DISTINCT para evitar duplicatas por JOINs
CREATE OR REPLACE VIEW v_credit_cards_summary AS
SELECT DISTINCT ON (cc.id)
  cc.*,
  -- Fatura atual (aberta/fechada mais recente)
  current_inv.id as current_invoice_id,
  current_inv.total_amount as current_invoice_amount,
  current_inv.due_date as current_due_date,
  current_inv.status as current_invoice_status,
  -- Próxima fatura
  next_inv.id as next_invoice_id,
  next_inv.total_amount as next_invoice_amount,
  next_inv.due_date as next_due_date,
  -- Cálculos
  (cc.credit_limit - cc.available_limit) as used_limit,
  ROUND(((cc.credit_limit - cc.available_limit)::numeric / NULLIF(cc.credit_limit, 0)::numeric * 100), 2) as usage_percentage,
  COALESCE(trans_count.total, 0) as total_transactions,
  COALESCE(paid_count.total, 0) as paid_invoices_count
FROM credit_cards cc
LEFT JOIN LATERAL (
  SELECT id, total_amount, due_date, status
  FROM credit_card_invoices
  WHERE credit_card_id = cc.id
    AND status IN ('open', 'closed')
  ORDER BY reference_month DESC
  LIMIT 1
) current_inv ON true
LEFT JOIN LATERAL (
  SELECT id, total_amount, due_date
  FROM credit_card_invoices
  WHERE credit_card_id = cc.id
    AND status = 'open'
    AND reference_month > COALESCE(current_inv.due_date, CURRENT_DATE)
  ORDER BY reference_month ASC
  LIMIT 1
) next_inv ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total
  FROM credit_card_transactions
  WHERE credit_card_id = cc.id
) trans_count ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) as total
  FROM credit_card_invoices
  WHERE credit_card_id = cc.id
    AND status = 'paid'
) paid_count ON true
WHERE cc.is_archived = false
ORDER BY cc.id, cc.created_at DESC;
*/

-- =====================================================
-- PARTE 5: VERIFICAÇÃO FINAL
-- =====================================================

-- Execute estas queries para confirmar que tudo está OK:

-- 5.1. Verificar se ainda há duplicatas ativas
-- (Deve retornar 0 linhas)
/*
SELECT user_id, last_four_digits, COUNT(*) as total
FROM credit_cards
WHERE is_archived = false
GROUP BY user_id, last_four_digits
HAVING COUNT(*) > 1;
*/

-- 5.2. Verificar flags normalizadas
-- (Deve retornar 0 linhas)
/*
SELECT COUNT(*) 
FROM credit_cards 
WHERE is_archived IS NULL OR is_active IS NULL;
*/

-- 5.3. Verificar índice criado
-- (Deve retornar 1 linha)
/*
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'credit_cards'
  AND indexname = 'credit_cards_user_id_last_four_digits_active_key';
*/

-- =====================================================
-- COMO USAR:
-- 1. Copie TODO este SQL
-- 2. Abra Supabase Dashboard > SQL Editor
-- 3. Cole e execute (RUN ou F5)
-- 4. Aguarde "Success"
-- 5. Recarregue o app (F5)
-- 6. Teste criar cartão e lançar compra
-- 7. Se ainda houver duplicatas na view, descomente a PARTE 4
-- =====================================================
