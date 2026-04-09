-- Criar tabela de contribuições
CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user ON goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(date DESC);

-- RLS para goal_contributions
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contributions" ON goal_contributions;
CREATE POLICY "Users can view own contributions"
  ON goal_contributions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own contributions" ON goal_contributions;
CREATE POLICY "Users can insert own contributions"
  ON goal_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own contributions" ON goal_contributions;
CREATE POLICY "Users can update own contributions"
  ON goal_contributions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contributions" ON goal_contributions;
CREATE POLICY "Users can delete own contributions"
  ON goal_contributions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_goal_contributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_goal_contributions_updated_at ON goal_contributions;
CREATE TRIGGER trigger_goal_contributions_updated_at
  BEFORE UPDATE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_contributions_updated_at();

-- Trigger para atualizar current_amount ao adicionar contribuição
CREATE OR REPLACE FUNCTION update_goal_amount_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE savings_goals
  SET current_amount = current_amount + NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount
  AFTER INSERT ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_amount_on_contribution();;
