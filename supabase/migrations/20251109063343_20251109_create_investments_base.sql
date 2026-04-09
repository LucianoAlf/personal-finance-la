-- =====================================================
-- BASE: CREATE TABLE investments (ausente no projeto atual)
-- =====================================================

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stock','fund','treasury','crypto','real_estate','other')),
  name TEXT NOT NULL,
  ticker TEXT,
  quantity NUMERIC(18,8) NOT NULL DEFAULT 0,
  purchase_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  current_price NUMERIC(18,2),
  total_invested NUMERIC(18,2),
  current_value NUMERIC(18,2),
  purchase_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_type ON investments(type);
CREATE INDEX IF NOT EXISTS idx_investments_ticker ON investments(ticker);
CREATE INDEX IF NOT EXISTS idx_investments_is_active ON investments(is_active);

-- Comentários
COMMENT ON TABLE investments IS 'Portfólio de investimentos dos usuários';
COMMENT ON COLUMN investments.type IS 'stock, fund, treasury, crypto, real_estate, other';

-- RLS
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own investments" ON investments;
CREATE POLICY "Users can view own investments"
ON investments FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own investments" ON investments;
CREATE POLICY "Users can insert own investments"
ON investments FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own investments" ON investments;
CREATE POLICY "Users can update own investments"
ON investments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own investments" ON investments;
CREATE POLICY "Users can delete own investments"
ON investments FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_investments_set_updated_at ON investments;
CREATE TRIGGER trg_investments_set_updated_at
BEFORE UPDATE ON investments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();;
