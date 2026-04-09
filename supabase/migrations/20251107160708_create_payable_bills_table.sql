-- ============================================
-- TABELA: payable_bills (Contas a Pagar)
-- ============================================

CREATE TABLE payable_bills (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados Básicos
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  
  -- Classificação
  bill_type VARCHAR(50) NOT NULL CHECK (bill_type IN (
    'service', 'telecom', 'subscription', 'housing', 'education',
    'healthcare', 'insurance', 'loan', 'credit_card', 'tax', 'other'
  )),
  provider_name VARCHAR(255),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Status Granular
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'overdue', 'paid', 'partial', 'cancelled', 'scheduled'
  )),
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(12, 2),
  
  -- Pagamento
  payment_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN (
    'pix', 'bank_transfer', 'debit_card', 'credit_card',
    'cash', 'automatic_debit', 'bank_slip', 'other'
  )),
  
  -- Documentação
  barcode VARCHAR(48),
  qr_code_pix TEXT,
  reference_number VARCHAR(100),
  bill_document_url TEXT,
  payment_proof_url TEXT,
  
  -- Recorrência
  is_recurring BOOLEAN DEFAULT false,
  recurrence_config JSONB,
  parent_bill_id UUID REFERENCES payable_bills(id) ON DELETE SET NULL,
  next_occurrence_date DATE,
  
  -- Parcelamento
  is_installment BOOLEAN DEFAULT false,
  installment_number INTEGER CHECK (installment_number >= 1),
  installment_total INTEGER CHECK (installment_total >= 1),
  installment_group_id UUID,
  original_purchase_amount DECIMAL(12, 2),
  
  -- Lembretes
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3 CHECK (reminder_days_before >= 0 AND reminder_days_before <= 30),
  reminder_channels TEXT[] DEFAULT ARRAY['app'],
  last_reminder_sent_at TIMESTAMPTZ,
  
  -- Prioridade
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Tags e Notas
  tags TEXT[],
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_due_date CHECK (due_date >= '2020-01-01'),
  CONSTRAINT valid_installment CHECK (
    (NOT is_installment) OR 
    (is_installment AND installment_number > 0 AND installment_total > 0 
     AND installment_number <= installment_total AND installment_group_id IS NOT NULL)
  ),
  CONSTRAINT valid_recurrence CHECK (
    (NOT is_recurring) OR 
    (is_recurring AND recurrence_config IS NOT NULL)
  ),
  CONSTRAINT valid_payment CHECK (
    (status NOT IN ('paid', 'partial')) OR 
    (status IN ('paid', 'partial') AND paid_amount IS NOT NULL AND paid_amount > 0)
  ),
  CONSTRAINT valid_paid_status CHECK (
    (status != 'paid') OR 
    (status = 'paid' AND paid_at IS NOT NULL AND paid_amount >= amount)
  )
);

-- Comentários
COMMENT ON TABLE payable_bills IS 'Contas a pagar com recorrência, parcelamento e lembretes';
COMMENT ON COLUMN payable_bills.due_date IS 'Data de vencimento (diferente de transaction_date)';
COMMENT ON COLUMN payable_bills.recurrence_config IS 'Config JSON: {frequency, day, end_date}';
COMMENT ON COLUMN payable_bills.barcode IS 'Código de barras boleto (48 dígitos)';
COMMENT ON COLUMN payable_bills.qr_code_pix IS 'Chave PIX copia-e-cola';;
