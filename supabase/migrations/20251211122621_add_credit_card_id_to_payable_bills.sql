
-- Adicionar coluna credit_card_id para vincular parcelamentos a cartões
ALTER TABLE payable_bills 
ADD COLUMN IF NOT EXISTS credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Criar índice para buscar parcelamentos por cartão
CREATE INDEX IF NOT EXISTS idx_payable_bills_credit_card 
ON payable_bills(credit_card_id) 
WHERE credit_card_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN payable_bills.credit_card_id IS 'ID do cartão de crédito (para parcelamentos no cartão)';
;
