-- =====================================================
-- SPRINT 1 - DIA 1: CREATE INVESTMENT_ACCOUNTS
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution_name TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('brokerage', 'bank', 'crypto_exchange', 'other')),
  currency TEXT DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  account_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_investment_accounts_user ON investment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_active ON investment_accounts(user_id, is_active);

-- Comentários
COMMENT ON TABLE investment_accounts IS 'Contas de investimento (corretoras, bancos, exchanges)';
COMMENT ON COLUMN investment_accounts.account_type IS 'Tipo: brokerage, bank, crypto_exchange, other';

-- RLS
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts" ON investment_accounts;
CREATE POLICY "Users can view own accounts"
ON investment_accounts FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON investment_accounts;
CREATE POLICY "Users can insert own accounts"
ON investment_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON investment_accounts;
CREATE POLICY "Users can update own accounts"
ON investment_accounts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON investment_accounts;
CREATE POLICY "Users can delete own accounts"
ON investment_accounts FOR DELETE
USING (auth.uid() = user_id);

-- FK investments → accounts
ALTER TABLE investments
DROP CONSTRAINT IF EXISTS fk_investments_account;

ALTER TABLE investments
ADD CONSTRAINT fk_investments_account
FOREIGN KEY (account_id) REFERENCES investment_accounts(id) ON DELETE SET NULL;

-- Índice
CREATE INDEX IF NOT EXISTS idx_investments_account ON investments(account_id);;
