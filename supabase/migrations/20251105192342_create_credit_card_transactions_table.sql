-- Tabela de Transações de Cartões de Crédito
CREATE TABLE IF NOT EXISTS credit_card_transactions (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES credit_card_invoices(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Informações da Compra
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  purchase_date DATE NOT NULL,
  
  -- Parcelamento
  is_installment BOOLEAN DEFAULT FALSE,
  installment_number INTEGER CHECK (installment_number > 0),
  total_installments INTEGER CHECK (total_installments > 0),
  installment_group_id UUID,
  
  -- Detalhes Adicionais
  establishment VARCHAR(255),
  notes TEXT,
  attachment_url TEXT,
  
  -- Origem do Lançamento
  source VARCHAR(20) DEFAULT 'manual' CHECK (
    source IN ('manual', 'whatsapp', 'import', 'open_finance')
  ),
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (
    (is_installment = FALSE) OR 
    (is_installment = TRUE AND installment_number IS NOT NULL AND total_installments IS NOT NULL)
  ),
  CHECK (installment_number <= total_installments)
);

-- Comentários
COMMENT ON TABLE credit_card_transactions IS 'Compras e lançamentos nos cartões de crédito';
COMMENT ON COLUMN credit_card_transactions.installment_group_id IS 'UUID que agrupa todas as parcelas de uma mesma compra';
COMMENT ON COLUMN credit_card_transactions.source IS 'Origem: manual, whatsapp, import, open_finance';

-- Índices
CREATE INDEX idx_cc_trans_card_id ON credit_card_transactions(credit_card_id);
CREATE INDEX idx_cc_trans_invoice_id ON credit_card_transactions(invoice_id);
CREATE INDEX idx_cc_trans_user_id ON credit_card_transactions(user_id);
CREATE INDEX idx_cc_trans_purchase_date ON credit_card_transactions(purchase_date);
CREATE INDEX idx_cc_trans_installment_group ON credit_card_transactions(installment_group_id) WHERE installment_group_id IS NOT NULL;;
