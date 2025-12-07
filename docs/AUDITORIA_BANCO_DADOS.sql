-- =============================================
-- 🔍 AUDITORIA COMPLETA DO BANCO DE DADOS
-- =============================================
-- Data: 15/11/2025
-- Objetivo: Identificar divergências entre páginas do sistema

-- =============================================
-- 1. CARTÕES DE CRÉDITO - AUDITORIA COMPLETA
-- =============================================

-- ⚠️ IMPORTANTE: Primeiro, verificar se a coluna available_limit existe
-- Se não existir, execute esta migration:
-- ALTER TABLE credit_cards ADD COLUMN available_limit DECIMAL(10,2) DEFAULT 0;
-- UPDATE credit_cards SET available_limit = credit_limit WHERE available_limit IS NULL;

-- 1.1) Ver TODOS os cartões ativos
SELECT 
  id,
  name,
  brand,
  last_four_digits,
  credit_limit,
  COALESCE(available_limit, credit_limit) as available_limit,
  (credit_limit - COALESCE(available_limit, 0)) as used_limit_calculado,
  is_active,
  is_archived,
  created_at
FROM credit_cards
WHERE is_active = true
  AND is_archived = false
ORDER BY name;

-- Resposta esperada:
-- - Itaú: credit_limit = 1000, available_limit = 305, used = 695
-- - Nubank (cartão 1): credit_limit = 25000, available_limit = 25000, used = 0
-- - Nubank (cartão 2): credit_limit = 25000, available_limit = 24600, used = 400
-- - Outro cartão?: verificar se existe um 4º cartão

-- 1.2) SOMA TOTAL dos cartões
SELECT 
  COUNT(*) as total_cartoes,
  SUM(credit_limit) as limite_total,
  SUM(COALESCE(available_limit, credit_limit)) as disponivel_total,
  SUM(credit_limit - COALESCE(available_limit, 0)) as usado_total
FROM credit_cards
WHERE is_active = true
  AND is_archived = false;

-- Resposta esperada (PÁGINA CARTÕES):
-- - total_cartoes: 2
-- - limite_total: 26000
-- - usado_total: 1095
-- - disponivel_total: 24905

-- Resposta esperada (WIDGET DASHBOARD - ERRADO):
-- - total_cartoes: 4
-- - limite_total: 76000
-- - usado_total: 1645
-- - disponivel_total: 74355

-- =============================================
-- 2. CONTAS - AUDITORIA COMPLETA
-- =============================================

-- 2.1) Ver TODAS as contas ativas
SELECT 
  id,
  name,
  bank_name,
  type,
  current_balance,
  is_active,
  created_at
FROM accounts
WHERE is_active = true
ORDER BY name;

-- Resposta esperada:
-- - Itaú (Conta Corrente): 19140.42
-- - Nubank (Conta Corrente): -6491.60
-- - TOTAL: 12648.82 ✅

-- 2.2) SOMA TOTAL das contas
SELECT 
  COUNT(*) as total_contas,
  SUM(current_balance) as saldo_total,
  SUM(CASE WHEN type = 'checking' THEN current_balance ELSE 0 END) as contas_bancarias,
  SUM(CASE WHEN type = 'cash' THEN current_balance ELSE 0 END) as carteira_dinheiro
FROM accounts
WHERE is_active = true;

-- Resposta esperada:
-- - saldo_total: 12648.82 ✅
-- - contas_bancarias: 12648.82 ✅
-- - carteira_dinheiro: 0.00 ✅

-- =============================================
-- 3. TRANSAÇÕES - AUDITORIA COMPLETA
-- =============================================

-- 3.1) Transações do mês ATUAL (novembro 2025)
SELECT 
  type,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
GROUP BY type
ORDER BY type;

-- Resposta esperada:
-- - income: R$ 17699.80 (IGUAL em Dashboard e Transações ✅)
-- - expense: ??? (Dashboard: 9905.30, Transações: 10083.01 ❌)

-- 3.2) Detalhes das DESPESAS do mês (novembro 2025)
SELECT 
  id,
  description,
  amount,
  transaction_date,
  account_id,
  category_id,
  created_at
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
ORDER BY transaction_date DESC, created_at DESC;

-- Análise: Identificar qual transação está causando a diferença de R$ 177.71

-- 3.3) SOMA EXATA das despesas (verificação)
SELECT 
  SUM(amount) as total_despesas_novembro_2025
FROM transactions
WHERE type = 'expense'
  AND EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11;

-- Deve retornar: R$ 10083.01 OU R$ 9905.30?

-- 3.4) Verificar se há transações DELETADAS (soft delete)
SELECT 
  type,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND deleted_at IS NOT NULL
GROUP BY type;

-- Se houver transações deletadas, pode ser a causa da divergência!

-- =============================================
-- 4. ANÁLISE CRUZADA - DASHBOARD vs PÁGINAS
-- =============================================

-- 4.1) Verificar se há MÚLTIPLOS cartões com mesmo nome
SELECT 
  name,
  COUNT(*) as quantidade,
  STRING_AGG(CAST(id AS TEXT), ', ') as ids
FROM credit_cards
WHERE is_active = true
GROUP BY name
HAVING COUNT(*) > 1;

-- Se retornar resultados, pode estar duplicando!

-- 4.2) Verificar se há cartões INATIVOS que deveriam estar ativos
SELECT 
  id,
  name,
  brand,
  last_four_digits,
  credit_limit,
  COALESCE(available_limit, credit_limit) as available_limit,
  is_active,
  is_archived,
  created_at
FROM credit_cards
WHERE is_active = false OR is_archived = true
ORDER BY created_at DESC;

-- Pode haver cartões marcados como inativos por engano?

-- 4.3) Verificar se há contas de tipo CREDIT_CARD (confusion!)
SELECT 
  id,
  name,
  type,
  current_balance
FROM accounts
WHERE type = 'credit_card'
  AND is_active = true;

-- ⚠️ IMPORTANTE: Cartões de crédito devem estar em credit_cards, NÃO em accounts!
-- Se houver resultados, pode estar somando em dobro!

-- =============================================
-- 5. QUERIES ESPECÍFICAS PARA DEBUGGING
-- =============================================

-- 5.1) Encontrar a diferença de R$ 177.71 nas despesas
WITH despesas_dashboard AS (
  SELECT SUM(amount) as total
  FROM transactions
  WHERE type = 'expense'
    AND EXTRACT(YEAR FROM transaction_date) = 2025
    AND EXTRACT(MONTH FROM transaction_date) = 11
)
SELECT 
  total as total_real,
  9905.30 as total_dashboard,
  (total - 9905.30) as diferenca
FROM despesas_dashboard;

-- Identificar qual transação está causando a diferença

-- 5.2) Listar transações com valores suspeitos
SELECT 
  id,
  description,
  amount,
  type,
  transaction_date,
  created_at,
  updated_at,
  deleted_at
FROM transactions
WHERE EXTRACT(YEAR FROM transaction_date) = 2025
  AND EXTRACT(MONTH FROM transaction_date) = 11
  AND (
    amount > 1000 -- Valores grandes
    OR amount = 177.71 -- Exatamente a diferença
    OR deleted_at IS NOT NULL -- Deletadas
  )
ORDER BY amount DESC;

-- 5.3) Verificar se há transações em OUTRAS moedas (improvável, mas...)
SELECT DISTINCT 
  currency
FROM transactions
WHERE currency IS NOT NULL;

-- =============================================
-- 6. RELATÓRIO RESUMIDO
-- =============================================

-- 6.1) Resumo completo para comparação
SELECT 
  'Dashboard' as origem,
  12648.82 as saldo_total,
  17699.80 as receitas_mes,
  9905.30 as despesas_mes,
  1645.00 as cartoes_uso

UNION ALL

SELECT 
  'Transações' as origem,
  NULL as saldo_total,
  17699.80 as receitas_mes,
  10083.01 as despesas_mes,
  NULL as cartoes_uso

UNION ALL

SELECT 
  'Contas' as origem,
  12648.82 as saldo_total,
  NULL as receitas_mes,
  NULL as despesas_mes,
  NULL as cartoes_uso

UNION ALL

SELECT 
  'Cartões' as origem,
  NULL as saldo_total,
  NULL as receitas_mes,
  NULL as despesas_mes,
  1095.00 as cartoes_uso;

-- =============================================
-- 7. QUERIES DE CORREÇÃO (SE NECESSÁRIO)
-- =============================================

-- 7.1) Se houver cartões duplicados, desativar duplicatas
-- UPDATE credit_cards SET is_active = false WHERE id = 'ID_DUPLICADO';

-- 7.2) Se houver transações com data errada, corrigir
-- UPDATE transactions SET transaction_date = '2025-11-15' WHERE id = 'ID_ERRADO';

-- 7.3) Se houver contas do tipo credit_card, converter para checking
-- UPDATE accounts SET type = 'checking' WHERE type = 'credit_card';

-- =============================================
-- 8. ANÁLISE DE FATURAS (INVOICES)
-- =============================================

-- 8.1) Ver todas as faturas abertas ou fechadas
SELECT 
  id,
  credit_card_id,
  due_date,
  total_amount,
  status,
  created_at
FROM invoices
WHERE status IN ('open', 'closed')
ORDER BY due_date DESC;

-- 8.2) Soma das faturas por cartão
SELECT 
  cc.name as cartao,
  COUNT(i.id) as quantidade_faturas,
  SUM(i.total_amount) as total_faturas
FROM invoices i
JOIN credit_cards cc ON i.credit_card_id = cc.id
WHERE i.status IN ('open', 'closed')
GROUP BY cc.name;

-- =============================================
-- INSTRUÇÕES DE USO
-- =============================================

-- 1) Copie todo este arquivo
-- 2) Cole no Supabase SQL Editor (https://supabase.com/dashboard/project/sbnpmhmvcspwcyjhftlw/sql/new)
-- 3) Execute TODAS as queries, uma por vez
-- 4) Anote os resultados em docs/RESULTADO_AUDITORIA.md
-- 5) Compare com os valores das telas
-- 6) Identifique as divergências

-- =============================================
-- RESULTADO ESPERADO
-- =============================================

-- ✅ CORRETO:
-- - Saldo Total: R$ 12.648,82 (igual em todas as páginas)
-- - Receitas do Mês: R$ 17.699,80 (igual em Dashboard e Transações)

-- ❌ DIVERGÊNCIAS IDENTIFICADAS:
-- - Despesas do Mês: R$ 9.905,30 (Dashboard) vs R$ 10.083,01 (Transações) = DIFERENÇA: R$ 177,71
-- - Cartões Limite Total: R$ 76.000,00 (Widget) vs R$ 26.000,00 (Página) = DIFERENÇA: R$ 50.000,00
-- - Cartões Uso Total: R$ 1.645,00 (Widget) vs R$ 1.095,00 (Página) = DIFERENÇA: R$ 550,00
-- - Quantidade de Cartões: 4 (Widget) vs 2 (Página) = DIFERENÇA: 2 cartões

-- =============================================
-- HIPÓTESES
-- =============================================

-- HIPÓTESE 1: Há 2 cartões inativos que o widget está somando
-- SOLUÇÃO: Verificar query 4.2 e desativar cartões duplicados

-- HIPÓTESE 2: Há transações deletadas que o Dashboard não está filtrando
-- SOLUÇÃO: Verificar query 3.4 e adicionar filtro deleted_at IS NULL

-- HIPÓTESE 3: Há múltiplos cartões com mesmo nome
-- SOLUÇÃO: Verificar query 4.1 e consolidar duplicatas

-- HIPÓTESE 4: O widget do Dashboard está usando cache antigo
-- SOLUÇÃO: Limpar cache do React Query (invalidate queries)

-- =============================================
-- FIM DA AUDITORIA
-- =============================================
