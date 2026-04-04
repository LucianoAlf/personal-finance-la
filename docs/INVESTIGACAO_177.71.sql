-- =============================================
-- 🔍 INVESTIGAÇÃO: Diferença de R$ 177,71
-- =============================================

-- TRANSAÇÃO SUSPEITA:
-- ID: 8638c064-53b7-450d-abf6-cc6d6195c526
-- Descrição: "Despesa 1-2"
-- Valor: R$ 177,71
-- Data: 2025-11-01

-- =============================================
-- QUERY 1: Ver TODOS os detalhes desta transação
-- =============================================

SELECT 
  id,
  description,
  amount,
  type,
  transaction_date,
  is_paid,
  is_recurring,
  category_id,
  account_id,
  created_at,
  updated_at
FROM transactions
WHERE id = '8638c064-53b7-450d-abf6-cc6d6195c526';

-- ⚠️ VERIFICAR: is_paid = false ou null?

-- =============================================
-- QUERY 2: Todas as despesas do mês com is_paid
-- =============================================

SELECT 
  id,
  description,
  amount,
  transaction_date,
  is_paid,
  created_at
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
ORDER BY transaction_date DESC;

-- =============================================
-- QUERY 3: Soma com is_paid = true (Página Transações)
-- =============================================

SELECT 
  SUM(amount) as total_despesas_pagas
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND is_paid = true;

-- HIPÓTESE: Deve retornar R$ 9.905,30 (valor do Dashboard)

-- =============================================
-- QUERY 4: Soma SEM filtro is_paid (Dashboard)
-- =============================================

SELECT 
  SUM(amount) as total_despesas_todas
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11;

-- HIPÓTESE: Deve retornar R$ 10.083,01 (valor real)

-- =============================================
-- QUERY 5: Diferença entre pagas e não pagas
-- =============================================

SELECT 
  SUM(CASE WHEN is_paid = true THEN amount ELSE 0 END) as total_pagas,
  SUM(CASE WHEN is_paid = false OR is_paid IS NULL THEN amount ELSE 0 END) as total_nao_pagas,
  SUM(amount) as total_geral
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11;

-- ESPERADO:
-- total_pagas: R$ 9.905,30
-- total_nao_pagas: R$ 177,71
-- total_geral: R$ 10.083,01

-- =============================================
-- QUERY 6: Listar transações NÃO PAGAS
-- =============================================

SELECT 
  id,
  description,
  amount,
  transaction_date,
  is_paid,
  created_at
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND (is_paid = false OR is_paid IS NULL)
ORDER BY amount DESC;

-- ESPERADO: Deve aparecer "Despesa 1-2" com R$ 177,71
