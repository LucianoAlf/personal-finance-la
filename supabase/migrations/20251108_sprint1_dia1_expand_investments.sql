-- =====================================================
-- SPRINT 1 - DIA 1: EXPANDIR INVESTMENTS
-- =====================================================

-- Adicionar novos campos
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS maturity_date DATE,
ADD COLUMN IF NOT EXISTS annual_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS account_id UUID;

-- Constraints
ALTER TABLE investments
DROP CONSTRAINT IF EXISTS chk_investments_status;

ALTER TABLE investments
ADD CONSTRAINT chk_investments_status CHECK (status IN ('active', 'sold', 'matured'));

ALTER TABLE investments
DROP CONSTRAINT IF EXISTS chk_investments_category;

ALTER TABLE investments
ADD CONSTRAINT chk_investments_category CHECK (category IN ('fixed_income', 'stock', 'reit', 'fund', 'crypto', 'international'));

-- Comentários
COMMENT ON COLUMN investments.category IS 'Categoria: fixed_income, stock, reit, fund, crypto, international';
COMMENT ON COLUMN investments.subcategory IS 'Subcategoria específica (ex: CDB, LCI, Tesouro IPCA)';
COMMENT ON COLUMN investments.dividend_yield IS 'Dividend Yield % anual';
COMMENT ON COLUMN investments.maturity_date IS 'Data de vencimento (Renda Fixa)';
COMMENT ON COLUMN investments.annual_rate IS 'Taxa anual % (Renda Fixa)';
COMMENT ON COLUMN investments.last_price_update IS 'Última atualização de cotação';
COMMENT ON COLUMN investments.status IS 'Status: active, sold, matured';
COMMENT ON COLUMN investments.account_id IS 'FK para investment_accounts';
