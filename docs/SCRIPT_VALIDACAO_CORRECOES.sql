-- ============================================
-- SCRIPT DE VALIDAÇÃO DAS CORREÇÕES
-- Executar APÓS deploy da Edge Function corrigida
-- ============================================

-- 1. VERIFICAR DADOS EXISTENTES
-- ============================================

-- 1.1 Verificar usuário de teste
SELECT 
  id,
  full_name,
  phone,
  email
FROM users 
WHERE phone = '5521981278047';

-- Resultado esperado: 1 registro (Luciano Alf)


-- 1.2 Verificar metas de economia (financial_goals)
SELECT 
  id,
  name,
  goal_type,
  status,
  target_amount,
  current_amount,
  deadline,
  ROUND((current_amount / NULLIF(target_amount, 0)) * 100, 0) as progress_percent
FROM financial_goals 
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND goal_type = 'savings'
  AND status = 'active'
ORDER BY deadline ASC;

-- Resultado esperado: 1 registro (Viagem para Europa)


-- 1.3 Verificar cartões ativos (credit_cards)
SELECT 
  id,
  name,
  last_four_digits,
  brand,
  is_active,
  is_archived,
  credit_limit,
  due_day
FROM credit_cards 
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND is_active = true
  AND is_archived = false
ORDER BY name;

-- Resultado esperado: 2 registros (Nubank, Itau)


-- 2. VALIDAR ESTRUTURA DAS TABELAS
-- ============================================

-- 2.1 Confirmar colunas de financial_goals
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'financial_goals'
  AND column_name IN ('deadline', 'goal_type', 'target_amount')
ORDER BY column_name;

-- Resultado esperado: 3 registros (deadline, goal_type, target_amount)


-- 2.2 Confirmar colunas de credit_cards
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'credit_cards'
  AND column_name IN ('last_four_digits', 'is_archived')
ORDER BY column_name;

-- Resultado esperado: 2 registros (is_archived, last_four_digits)


-- 3. SIMULAR QUERIES DA EDGE FUNCTION
-- ============================================

-- 3.1 Simular comando "meta" (CORRIGIDO)
SELECT 
  name,
  target_amount,
  current_amount,
  deadline,
  status,
  goal_type,
  ROUND((current_amount / NULLIF(target_amount, 0)) * 100, 0) || '%' as progress
FROM financial_goals
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND status = 'active'
  AND goal_type = 'savings'
ORDER BY deadline ASC
LIMIT 5;

-- Resultado esperado: 
-- name: "Viagem para Europa"
-- target_amount: 30000.00
-- current_amount: 20600.00
-- progress: 69%


-- 3.2 Simular comando "cartões" (CORRIGIDO)
SELECT 
  c.id,
  c.name,
  c.last_four_digits,
  c.due_day,
  c.credit_limit,
  c.is_active,
  c.is_archived,
  COUNT(cct.id) as transacoes_mes
FROM credit_cards c
LEFT JOIN credit_card_transactions cct ON cct.credit_card_id = c.id
WHERE c.user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND c.is_active = true
  AND c.is_archived = false
GROUP BY c.id, c.name, c.last_four_digits, c.due_day, c.credit_limit, c.is_active, c.is_archived
ORDER BY c.name;

-- Resultado esperado: 2 cartões (Itau, Nubank)


-- 4. VERIFICAR MENSAGENS WHATSAPP
-- ============================================

-- 4.1 Últimas mensagens processadas
SELECT 
  id,
  content,
  intent,
  processing_status,
  direction,
  received_at,
  processed_at
FROM whatsapp_messages
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
ORDER BY received_at DESC
LIMIT 10;


-- 4.2 Estatísticas de comandos
SELECT 
  intent,
  COUNT(*) as total_executado,
  COUNT(*) FILTER (WHERE processing_status = 'completed') as sucesso,
  COUNT(*) FILTER (WHERE processing_status = 'failed') as falha
FROM whatsapp_messages
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND direction = 'inbound'
  AND intent IS NOT NULL
GROUP BY intent
ORDER BY total_executado DESC;


-- 5. COMPARAÇÃO ANTES/DEPOIS
-- ============================================

-- 5.1 Verificar se tabela "goals" NÃO existe (deve falhar)
-- Esta query DEVE dar erro se as correções estiverem OK
-- SELECT * FROM goals LIMIT 1;
-- Erro esperado: relation "goals" does not exist


-- 5.2 Verificar se coluna "last_four" NÃO existe (deve falhar)
-- Esta query DEVE dar erro se as correções estiverem OK
-- SELECT last_four FROM credit_cards LIMIT 1;
-- Erro esperado: column "last_four" does not exist


-- 5.3 Verificar se coluna "target_date" NÃO existe (deve falhar)
-- Esta query DEVE dar erro se as correções estiverem OK
-- SELECT target_date FROM financial_goals LIMIT 1;
-- Erro esperado: column "target_date" does not exist


-- 6. TESTE DE INTEGRIDADE
-- ============================================

-- 6.1 Contar registros duplicados/inválidos em financial_goals
SELECT 
  user_id,
  name,
  goal_type,
  COUNT(*) as duplicatas
FROM financial_goals
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND status = 'active'
GROUP BY user_id, name, goal_type
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 registros (sem duplicatas)


-- 6.2 Verificar cartões sem last_four_digits
SELECT 
  id,
  name,
  last_four_digits,
  is_active,
  is_archived
FROM credit_cards
WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36'
  AND last_four_digits IS NULL;

-- Resultado esperado: 0 registros (todos devem ter)


-- 7. VALIDAÇÃO FINAL - RESUMO
-- ============================================

SELECT 
  'financial_goals' as tabela,
  (SELECT COUNT(*) FROM financial_goals WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36') as total_registros,
  (SELECT COUNT(*) FROM financial_goals WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36' AND goal_type = 'savings' AND status = 'active') as metas_economia_ativas,
  'OK' as status_esperado

UNION ALL

SELECT 
  'credit_cards' as tabela,
  (SELECT COUNT(*) FROM credit_cards WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36') as total_registros,
  (SELECT COUNT(*) FROM credit_cards WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36' AND is_active = true AND is_archived = false) as cartoes_ativos,
  'OK' as status_esperado

UNION ALL

SELECT 
  'investments' as tabela,
  (SELECT COUNT(*) FROM investments WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36') as total_registros,
  (SELECT COUNT(*) FROM investments WHERE user_id = '68dc8ee5-a710-4116-8f18-af9ac3e8ed36' AND is_active = true) as investimentos_ativos,
  'OK (BASELINE)' as status_esperado;

-- Resultado esperado:
-- financial_goals: 4 total, 1 meta ativa
-- credit_cards: 4 total, 2 ativos
-- investments: funciona (baseline)


-- ============================================
-- FIM DO SCRIPT DE VALIDAÇÃO
-- 
-- INSTRUÇÕES DE USO:
-- 1. Executar ANTES do deploy para documentar estado atual
-- 2. Fazer deploy da Edge Function corrigida
-- 3. Executar DEPOIS do deploy para confirmar correções
-- 4. Comparar resultados antes/depois
-- 
-- CRITÉRIOS DE SUCESSO:
-- ✅ Todas as queries retornam dados esperados
-- ✅ Queries com tabelas/colunas antigas DEVEM falhar
-- ✅ Comando "meta" via WhatsApp retorna 1 meta
-- ✅ Comando "cartões" via WhatsApp retorna 2 cartões
-- ============================================
