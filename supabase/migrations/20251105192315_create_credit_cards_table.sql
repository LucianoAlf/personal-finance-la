-- Tabela de Cartões de Crédito
CREATE TABLE IF NOT EXISTS credit_cards (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- Informações do Cartão
  name VARCHAR(100) NOT NULL,
  brand VARCHAR(50) NOT NULL CHECK (brand IN ('visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners')),
  last_four_digits VARCHAR(4),
  
  -- Limites
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  available_limit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (available_limit >= 0),
  
  -- Ciclo de Faturamento
  closing_day INTEGER NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  
  -- Personalização
  color VARCHAR(7) DEFAULT '#8B10AE',
  icon VARCHAR(50) DEFAULT 'CreditCard',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  notes TEXT,
  issuing_bank TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, last_four_digits),
  CHECK (available_limit <= credit_limit)
);

-- Comentários
COMMENT ON TABLE credit_cards IS 'Cartões de crédito dos usuários';
COMMENT ON COLUMN credit_cards.closing_day IS 'Dia do mês em que a fatura fecha (1-31)';
COMMENT ON COLUMN credit_cards.due_day IS 'Dia do mês em que a fatura vence (1-31)';
COMMENT ON COLUMN credit_cards.available_limit IS 'Limite disponível = credit_limit - soma das faturas abertas';

-- Índices
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_active ON credit_cards(user_id, is_active) WHERE is_active = TRUE;

-- Backfill issuing_bank (formerly 20241213_add_issuing_bank_column.sql)
UPDATE credit_cards SET issuing_bank = 'nubank'
WHERE LOWER(name) LIKE '%nubank%' OR LOWER(name) LIKE '%nu %' OR LOWER(name) LIKE '%roxinho%';

UPDATE credit_cards SET issuing_bank = 'itau'
WHERE LOWER(name) LIKE '%itau%' OR LOWER(name) LIKE '%itaú%';

UPDATE credit_cards SET issuing_bank = 'bradesco'
WHERE LOWER(name) LIKE '%bradesco%';

UPDATE credit_cards SET issuing_bank = 'santander'
WHERE LOWER(name) LIKE '%santander%';

UPDATE credit_cards SET issuing_bank = 'bb'
WHERE LOWER(name) LIKE '%banco do brasil%' OR LOWER(name) LIKE '% bb %' OR name LIKE 'BB %';

UPDATE credit_cards SET issuing_bank = 'caixa'
WHERE LOWER(name) LIKE '%caixa%';

UPDATE credit_cards SET issuing_bank = 'inter'
WHERE LOWER(name) LIKE '%inter%' AND LOWER(name) NOT LIKE '%internacional%';

UPDATE credit_cards SET issuing_bank = 'c6'
WHERE LOWER(name) LIKE '%c6%';

UPDATE credit_cards SET issuing_bank = 'btg'
WHERE LOWER(name) LIKE '%btg%';

UPDATE credit_cards SET issuing_bank = 'xp'
WHERE LOWER(name) LIKE '%xp %' OR LOWER(name) LIKE '%xp%';

UPDATE credit_cards SET issuing_bank = 'picpay'
WHERE LOWER(name) LIKE '%picpay%';

UPDATE credit_cards SET issuing_bank = 'mercadopago'
WHERE LOWER(name) LIKE '%mercado pago%' OR LOWER(name) LIKE '%mercadopago%';

COMMENT ON COLUMN credit_cards.issuing_bank IS 'Código do banco emissor do cartão (nubank, itau, bradesco, etc.)';
