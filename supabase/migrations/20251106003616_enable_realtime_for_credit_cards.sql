-- Habilitar Realtime para as tabelas de cartão de crédito
-- Isso permite que o frontend receba atualizações em tempo real

-- Habilitar para credit_cards
ALTER PUBLICATION supabase_realtime ADD TABLE credit_cards;

-- Habilitar para credit_card_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE credit_card_transactions;

-- Habilitar para credit_card_invoices
ALTER PUBLICATION supabase_realtime ADD TABLE credit_card_invoices;

-- Comentário para documentação
COMMENT ON TABLE credit_cards IS 'Tabela de cartões de crédito com Realtime habilitado';
COMMENT ON TABLE credit_card_transactions IS 'Tabela de transações de cartão com Realtime habilitado';
COMMENT ON TABLE credit_card_invoices IS 'Tabela de faturas de cartão com Realtime habilitado';
;
