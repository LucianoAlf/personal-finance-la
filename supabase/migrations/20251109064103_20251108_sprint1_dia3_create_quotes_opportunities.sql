-- =====================================================
-- SPRINT 1 - DIA 3: QUOTES HISTORY + MARKET OPPORTUNITIES
-- =====================================================

-- =====================================================
-- investment_quotes_history (Cache de Cotações)
-- =====================================================

CREATE TABLE IF NOT EXISTS investment_quotes_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  price NUMERIC(18,2) NOT NULL,
  variation NUMERIC(5,2),
  volume BIGINT,
  source TEXT NOT NULL CHECK (source IN ('brapi', 'coingecko', 'tesouro', 'bcb', 'manual')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(symbol, timestamp)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_quotes_symbol_timestamp ON investment_quotes_history(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_timestamp ON investment_quotes_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_source ON investment_quotes_history(source);

-- Comentários
COMMENT ON TABLE investment_quotes_history IS 'Cache de cotações históricas';
COMMENT ON COLUMN investment_quotes_history.source IS 'Fonte: brapi (B3), coingecko (crypto), tesouro, bcb (câmbio), manual';
COMMENT ON COLUMN investment_quotes_history.metadata IS 'Dados adicionais da API (bid, ask, high, low)';

-- RLS: Tabela pública para leitura
ALTER TABLE investment_quotes_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quotes" ON investment_quotes_history;
CREATE POLICY "Anyone can read quotes"
ON investment_quotes_history FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- market_opportunities (Ana Clara Insights)
-- =====================================================

CREATE TABLE IF NOT EXISTS market_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('buy_opportunity', 'sell_signal', 'dividend_alert', 'price_target', 'sector_rotation')),
  title TEXT NOT NULL,
  description TEXT,
  current_price NUMERIC(18,2),
  target_price NUMERIC(18,2),
  expected_return NUMERIC(5,2),
  ana_clara_insight TEXT,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_opportunities_user ON market_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON market_opportunities(user_id, is_active, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON market_opportunities(opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_ticker ON market_opportunities(ticker);
CREATE INDEX IF NOT EXISTS idx_opportunities_expires ON market_opportunities(expires_at);

-- Comentários
COMMENT ON TABLE market_opportunities IS 'Oportunidades de mercado identificadas pela Ana Clara';
COMMENT ON COLUMN market_opportunities.opportunity_type IS 'buy_opportunity, sell_signal, dividend_alert, price_target, sector_rotation';
COMMENT ON COLUMN market_opportunities.confidence_score IS 'Confiança Ana Clara (0-100)';

-- RLS
ALTER TABLE market_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own opportunities" ON market_opportunities;
CREATE POLICY "Users can view own opportunities"
ON market_opportunities FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own opportunities" ON market_opportunities;
CREATE POLICY "Users can update own opportunities"
ON market_opportunities FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Expirar oportunidades antigas
CREATE OR REPLACE FUNCTION expire_old_opportunities()
RETURNS void AS $$
BEGIN
  UPDATE market_opportunities
  SET is_active = FALSE
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_old_opportunities IS 'Expirar oportunidades passadas. Chamar via Cron diariamente.';

-- Function: Descartar oportunidade
CREATE OR REPLACE FUNCTION dismiss_opportunity(p_opportunity_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE market_opportunities
  SET 
    is_dismissed = TRUE,
    dismissed_at = NOW()
  WHERE id = p_opportunity_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION dismiss_opportunity IS 'Descartar oportunidade';;
