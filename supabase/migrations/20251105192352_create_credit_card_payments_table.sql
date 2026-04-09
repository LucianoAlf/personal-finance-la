-- Tabela de Pagamentos de Faturas
CREATE TABLE IF NOT EXISTS credit_card_payments (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Pagamento
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  payment_type VARCHAR(20) DEFAULT 'full' CHECK (
    payment_type IN ('full', 'minimum', 'partial', 'other')
  ),
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE credit_card_payments IS 'Histórico de pagamentos de faturas';
COMMENT ON COLUMN credit_card_payments.payment_type IS 'full=total, minimum=mínimo, partial=parcial, other=outro';

-- Índices
CREATE INDEX idx_cc_payments_invoice_id ON credit_card_payments(invoice_id);
CREATE INDEX idx_cc_payments_user_id ON credit_card_payments(user_id);
CREATE INDEX idx_cc_payments_date ON credit_card_payments(payment_date);;
