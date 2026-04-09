-- =====================================================
-- FIX: Reabilitar trigger após correção de dados
-- =====================================================

-- Reabilitar trigger
ALTER TABLE investment_transactions ENABLE TRIGGER trigger_update_investment_after_transaction;

-- Comentário explicativo
COMMENT ON TRIGGER trigger_update_investment_after_transaction ON investment_transactions IS 
'Atualiza automaticamente investments após transações. 
IMPORTANTE: Ao criar investimentos manualmente, NÃO criar transação de compra inicial, 
pois os valores já estão na tabela investments.';;
