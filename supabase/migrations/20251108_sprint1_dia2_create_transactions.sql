-- =====================================================
-- SPRINT 1 - DIA 2: CREATE INVESTMENT_TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'interest', 'fee', 'split', 'bonus')),
  quantity NUMERIC(18,8),
  price NUMERIC(18,2),
  total_value NUMERIC(18,2) NOT NULL,
  fees NUMERIC(18,2) DEFAULT 0,
  tax NUMERIC(18,2) DEFAULT 0,
  transaction_date TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_investment ON investment_transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON investment_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON investment_transactions(transaction_type);

-- Comentários
COMMENT ON TABLE investment_transactions IS 'Histórico completo de transações';
COMMENT ON COLUMN investment_transactions.transaction_type IS 'buy, sell, dividend, interest, fee, split, bonus';

-- RLS
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON investment_transactions;
CREATE POLICY "Users can view own transactions"
ON investment_transactions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON investment_transactions;
CREATE POLICY "Users can insert own transactions"
ON investment_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON investment_transactions;
CREATE POLICY "Users can update own transactions"
ON investment_transactions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON investment_transactions;
CREATE POLICY "Users can delete own transactions"
ON investment_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Constraint: quantity obrigatório para buy/sell
ALTER TABLE investment_transactions
DROP CONSTRAINT IF EXISTS chk_quantity_required;

ALTER TABLE investment_transactions
ADD CONSTRAINT chk_quantity_required
CHECK (
  (transaction_type IN ('buy', 'sell') AND quantity IS NOT NULL) OR
  (transaction_type NOT IN ('buy', 'sell'))
);

-- =====================================================
-- TRIGGER: Atualizar investment após transação
-- =====================================================

CREATE OR REPLACE FUNCTION update_investment_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_investment RECORD;
BEGIN
  SELECT * INTO v_investment FROM investments WHERE id = NEW.investment_id;
  
  IF NEW.transaction_type = 'buy' THEN
    -- Compra: recalcular preço médio
    UPDATE investments
    SET 
      quantity = v_investment.quantity + NEW.quantity,
      purchase_price = (
        (v_investment.quantity * v_investment.purchase_price) + 
        (NEW.quantity * NEW.price)
      ) / (v_investment.quantity + NEW.quantity),
      total_invested = COALESCE(total_invested, 0) + NEW.total_value + NEW.fees,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
    
  ELSIF NEW.transaction_type = 'sell' THEN
    -- Venda
    UPDATE investments
    SET 
      quantity = v_investment.quantity - NEW.quantity,
      status = CASE 
        WHEN (v_investment.quantity - NEW.quantity) <= 0 THEN 'sold'::TEXT
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
    
  ELSIF NEW.transaction_type = 'split' THEN
    -- Desdobramento
    UPDATE investments
    SET 
      quantity = v_investment.quantity * NEW.quantity,
      purchase_price = v_investment.purchase_price / NEW.quantity,
      current_price = CASE 
        WHEN current_price IS NOT NULL THEN current_price / NEW.quantity
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_investment_after_transaction ON investment_transactions;

CREATE TRIGGER trigger_update_investment_after_transaction
  AFTER INSERT ON investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_after_transaction();
