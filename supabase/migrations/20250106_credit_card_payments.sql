-- Tabela de pagamentos de faturas de cartão de crédito
CREATE TABLE credit_card_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES credit_card_invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('total', 'minimum', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_cc_payments_invoice ON credit_card_payments(invoice_id);
CREATE INDEX idx_cc_payments_user ON credit_card_payments(user_id);
CREATE INDEX idx_cc_payments_account ON credit_card_payments(account_id);
CREATE INDEX idx_cc_payments_date ON credit_card_payments(payment_date);

-- Habilitar RLS
ALTER TABLE credit_card_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios pagamentos
CREATE POLICY "Users can view their own payments"
  ON credit_card_payments FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Usuários podem criar pagamentos para suas faturas
CREATE POLICY "Users can create payments for their invoices"
  ON credit_card_payments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM credit_card_invoices
      WHERE id = invoice_id AND user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_cc_payments_updated_at
  BEFORE UPDATE ON credit_card_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
