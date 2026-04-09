-- Habilitar REPLICA IDENTITY FULL para Realtime funcionar com RLS
ALTER TABLE credit_card_invoices REPLICA IDENTITY FULL;

-- Também habilitar para credit_cards (caso não esteja)
ALTER TABLE credit_cards REPLICA IDENTITY FULL;;
