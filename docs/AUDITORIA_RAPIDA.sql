-- =============================================
-- 🚀 AUDITORIA RÁPIDA (5 QUERIES ESSENCIAIS)
-- =============================================
-- Execute estas 5 queries para identificar o problema AGORA!

-- =============================================
-- QUERY 1: Verificar se coluna available_limit existe
-- =============================================

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_cards' 
  AND column_name IN ('available_limit', 'bank_name', 'brand', 'last_four_digits')
ORDER BY column_name;

-- ⚠️ SE available_limit NÃO APARECER, execute antes de continuar:
-- ALTER TABLE credit_cards ADD COLUMN available_limit DECIMAL(10,2);
-- UPDATE credit_cards SET available_limit = credit_limit WHERE available_limit IS NULL;

-- =============================================
-- QUERY 2: Cartões ATIVOS (deve retornar 2)
-- =============================================

SELECT 
  id,
  name,
  brand,
  credit_limit,
  COALESCE(available_limit, credit_limit) as available_limit,
  (credit_limit - COALESCE(available_limit, 0)) as usado,
  is_active,
  is_archived
FROM credit_cards
WHERE is_active = true
  AND (is_archived = false OR is_archived IS NULL)
ORDER BY name;

-- ESPERADO: 2 cartões (Itaú, Nubank)
-- SE RETORNAR 4: Há cartões duplicados!

-- =============================================
-- QUERY 3: Cartões INATIVOS ou ARQUIVADOS (hipótese: 2 cartões)
-- =============================================

SELECT 
  id,
  name,
  brand,
  credit_limit,
  COALESCE(available_limit, credit_limit) as available_limit,
  is_active,
  is_archived,
  created_at
FROM credit_cards
WHERE is_active = false OR is_archived = true
ORDER BY created_at DESC;

-- HIPÓTESE: Há 2 cartões inativos/arquivados com R$ 50.000 total
-- SE CONFIRMAR: Widget está somando cartões inativos!

-- =============================================
-- QUERY 4: SOMA TOTAL (CORRETO - apenas ativos)
-- =============================================

SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(COALESCE(available_limit, credit_limit)) as disponivel_total,
  SUM(credit_limit - COALESCE(available_limit, 0)) as usado_total
FROM credit_cards
WHERE is_active = true
  AND (is_archived = false OR is_archived IS NULL);

-- ESPERADO (Página Cartões):
-- total_cartoes: 2
-- limite_total: 26000
-- usado_total: 1095
-- disponivel_total: 24905

-- =============================================
-- QUERY 5: SOMA TOTAL (ERRADO - todos os cartões)
-- =============================================

SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(COALESCE(available_limit, credit_limit)) as disponivel_total,
  SUM(credit_limit - COALESCE(available_limit, 0)) as usado_total
FROM credit_cards;
-- NÃO filtra is_active nem is_archived!

-- ESPERADO (Widget Dashboard - ERRADO):
-- total_cartoes: 4
-- limite_total: 76000
-- usado_total: 1645
-- disponivel_total: 74355

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

-- Se QUERY 4 = Página Cartões (correto)
-- E QUERY 5 = Widget Dashboard (errado)
-- ENTÃO: Widget está somando TODOS os cartões (ativos + inativos)!

-- SOLUÇÃO: Adicionar filtro no hook useCreditCardsQuery.ts

-- =============================================
-- INSTRUÇÕES
-- =============================================

-- 1. Execute QUERY 1 primeiro
-- 2. Se available_limit não existir, execute o ALTER TABLE
-- 3. Execute QUERY 2, 3, 4 e 5 em sequência
-- 4. Compare os resultados
-- 5. Anote em docs/RESULTADO_AUDITORIA.md
-- 6. Me avise com os resultados!
