-- Create table, RLS e trigger (função já criada)
CREATE TABLE IF NOT EXISTS investment_allocation_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_class TEXT NOT NULL,
  target_percentage NUMERIC(5,2) NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, asset_class)
);

CREATE INDEX IF NOT EXISTS idx_allocation_targets_user ON investment_allocation_targets(user_id);

COMMENT ON TABLE investment_allocation_targets IS 'Metas de alocação por classe de ativo';
COMMENT ON COLUMN investment_allocation_targets.asset_class IS 'Classe: fixed_income, stock, reit, fund, crypto, international';
COMMENT ON COLUMN investment_allocation_targets.target_percentage IS 'Percentual alvo (0-100)';

ALTER TABLE investment_allocation_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own targets" ON investment_allocation_targets;
CREATE POLICY "Users can manage own targets"
ON investment_allocation_targets FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger usando a função já corrigida
DROP TRIGGER IF EXISTS trigger_check_allocation_total ON investment_allocation_targets;
CREATE TRIGGER trigger_check_allocation_total
  BEFORE INSERT OR UPDATE ON investment_allocation_targets
  FOR EACH ROW
  EXECUTE FUNCTION check_allocation_total();;
