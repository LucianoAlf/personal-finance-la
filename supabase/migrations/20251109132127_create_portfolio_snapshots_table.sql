-- SPRINT 5.1: Tabela para snapshots diários do portfólio
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  snapshot_date date NOT NULL,
  
  -- Valores
  total_invested numeric NOT NULL,
  current_value numeric NOT NULL,
  return_amount numeric,
  return_percentage numeric,
  
  -- Breakdown
  allocation jsonb, -- { "renda_fixa": 30, "acoes": 50, ... }
  top_performers jsonb, -- [{ "ticker": "PETR4", "return": 15.2 }]
  
  -- Dividendos
  dividends_ytd numeric DEFAULT 0,
  dividend_yield numeric DEFAULT 0,
  
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Index para queries rápidas
CREATE INDEX idx_portfolio_snapshots_user_date 
ON portfolio_snapshots(user_id, snapshot_date DESC);

-- RLS
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert snapshots" ON portfolio_snapshots
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE portfolio_snapshots IS 'Snapshots diários do portfólio de investimentos para análise histórica';;
