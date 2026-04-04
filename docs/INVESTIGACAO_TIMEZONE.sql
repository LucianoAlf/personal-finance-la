-- =============================================
-- 🔍 INVESTIGAÇÃO: Problema de Timezone
-- =============================================

-- A transação "Despesa 1-2" (R$ 177,71) pode estar sendo
-- interpretada com timezone incorreto no frontend!

-- =============================================
-- QUERY 1: Ver EXATAMENTE a data da transação suspeita
-- =============================================

SELECT 
  id,
  description,
  amount,
  transaction_date,
  transaction_date AT TIME ZONE 'UTC' as transaction_date_utc,
  transaction_date AT TIME ZONE 'America/Sao_Paulo' as transaction_date_brt,
  EXTRACT(MONTH FROM transaction_date) as mes_db,
  EXTRACT(DAY FROM transaction_date) as dia_db,
  EXTRACT(HOUR FROM transaction_date) as hora_db,
  created_at
FROM transactions
WHERE id = '8638c064-53b7-450d-abf6-cc6d6195c526';

-- ⚠️ VERIFICAR:
-- - Se transaction_date tem hora 00:00:00 ou outro horário
-- - Se está em UTC ou BRT
-- - Se o mês é 11 (novembro) ou 10 (outubro)

-- =============================================
-- QUERY 2: Todas as despesas de NOVEMBRO com detalhes de data
-- =============================================

SELECT 
  id,
  description,
  amount,
  transaction_date,
  EXTRACT(MONTH FROM transaction_date) as mes,
  EXTRACT(DAY FROM transaction_date) as dia,
  to_char(transaction_date, 'YYYY-MM-DD HH24:MI:SS') as data_formatada
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
ORDER BY transaction_date ASC
LIMIT 10;

-- =============================================
-- QUERY 3: Verificar se há despesas em OUTUBRO próximas a R$ 177,71
-- =============================================

SELECT 
  id,
  description,
  amount,
  transaction_date,
  EXTRACT(MONTH FROM transaction_date) as mes
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 10
  AND amount BETWEEN 170 AND 180
ORDER BY transaction_date DESC;

-- Se esta query retornar "Despesa 1-2", CONFIRMADO problema de timezone!

-- =============================================
-- QUERY 4: Comparar soma de novembro vs outubro
-- =============================================

SELECT 
  EXTRACT(MONTH FROM transaction_date) as mes,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) IN (10, 11)
GROUP BY EXTRACT(MONTH FROM transaction_date)
ORDER BY mes;

-- =============================================
-- QUERY 5: Verificar tipo de dado da coluna transaction_date
-- =============================================

SELECT 
  column_name,
  data_type,
  datetime_precision
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name = 'transaction_date';

-- ESPERADO: date, timestamp, ou timestamptz?
