-- Tabela de Faturas de Cartões de Crédito
CREATE TABLE IF NOT EXISTS credit_card_invoices (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Período da Fatura
  reference_month DATE NOT NULL,
  closing_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Valores
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  
  -- Status da Fatura
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'closed', 'paid', 'overdue', 'partial')
  ),
  
  -- Pagamento
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Metadados
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(credit_card_id, reference_month),
  CHECK (paid_amount <= total_amount),
  CHECK (closing_date < due_date)
);

-- Comentários
COMMENT ON TABLE credit_card_invoices IS 'Faturas mensais dos cartões de crédito';
COMMENT ON COLUMN credit_card_invoices.status IS 'open=aberta, closed=fechada, paid=paga, overdue=vencida, partial=parcialmente paga';
COMMENT ON COLUMN credit_card_invoices.reference_month IS 'Mês de referência da fatura (sempre dia 1)';

-- Índices
CREATE INDEX idx_invoices_card_id ON credit_card_invoices(credit_card_id);
CREATE INDEX idx_invoices_user_id ON credit_card_invoices(user_id);
CREATE INDEX idx_invoices_status ON credit_card_invoices(status);
CREATE INDEX idx_invoices_due_date ON credit_card_invoices(due_date);
CREATE INDEX idx_invoices_card_month ON credit_card_invoices(credit_card_id, reference_month);;
