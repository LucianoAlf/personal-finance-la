-- Adicionar coluna payment_method
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) 
CHECK (payment_method IN ('pix', 'credit', 'debit', 'cash', 'boleto', 'transfer', 'other'));

-- Comentário para documentação
COMMENT ON COLUMN transactions.payment_method IS 'Método de pagamento: pix, credit, debit, cash, boleto, transfer, other';;
