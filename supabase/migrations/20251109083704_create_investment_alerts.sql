-- =====================================================
-- SPRINT 3 DIA 2: Tabela de Alertas de Investimentos
-- =====================================================

-- Criar tabela investment_alerts
CREATE TABLE IF NOT EXISTS investment_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'percent_change')),
  target_value DECIMAL NOT NULL,
  current_value DECIMAL,
  is_active BOOLEAN DEFAULT true,
  last_checked TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_investment_alerts_user_active 
  ON investment_alerts(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_investment_alerts_ticker 
  ON investment_alerts(ticker) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_investment_alerts_active 
  ON investment_alerts(is_active, last_checked);

-- RLS Policies
ALTER TABLE investment_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own alerts
CREATE POLICY "Users can view own alerts"
  ON investment_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create own alerts
CREATE POLICY "Users can create own alerts"
  ON investment_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own alerts
CREATE POLICY "Users can update own alerts"
  ON investment_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete own alerts
CREATE POLICY "Users can delete own alerts"
  ON investment_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_investment_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_investment_alerts_timestamp
  BEFORE UPDATE ON investment_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_alerts_updated_at();

-- Comentários
COMMENT ON TABLE investment_alerts IS 'Alertas de preço para investimentos';
COMMENT ON COLUMN investment_alerts.alert_type IS 'Tipo: price_above, price_below, percent_change';
COMMENT ON COLUMN investment_alerts.target_value IS 'Valor alvo para disparar alerta';
COMMENT ON COLUMN investment_alerts.current_value IS 'Último valor verificado';
COMMENT ON COLUMN investment_alerts.is_active IS 'Se alerta está ativo';
COMMENT ON COLUMN investment_alerts.triggered_at IS 'Data/hora que alerta foi disparado';
;
