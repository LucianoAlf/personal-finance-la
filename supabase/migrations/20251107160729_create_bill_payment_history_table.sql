-- ============================================
-- TABELA: bill_payment_history (Histórico de Pagamentos)
-- ============================================

CREATE TABLE bill_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES payable_bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pagamento
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount_paid DECIMAL(12, 2) NOT NULL CHECK (amount_paid > 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
    'pix', 'bank_transfer', 'debit_card', 'credit_card', 
    'cash', 'automatic_debit', 'bank_slip', 'other'
  )),
  
  -- Origem
  account_from_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Comprovantes
  confirmation_number VARCHAR(100),
  payment_proof_url TEXT,
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_bill_payment_history_bill 
  ON bill_payment_history(bill_id, payment_date DESC);

CREATE INDEX idx_bill_payment_history_user_date 
  ON bill_payment_history(user_id, payment_date DESC);

CREATE INDEX idx_bill_payment_history_account 
  ON bill_payment_history(account_from_id) 
  WHERE account_from_id IS NOT NULL;

COMMENT ON TABLE bill_payment_history IS 'Histórico de pagamentos (permite pagamentos parciais)';;
