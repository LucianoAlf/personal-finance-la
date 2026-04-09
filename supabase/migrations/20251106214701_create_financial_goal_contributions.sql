-- Tabela de contribuições para metas de economia
CREATE TABLE IF NOT EXISTS financial_goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contrib_goal ON financial_goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_user ON financial_goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contrib_created ON financial_goal_contributions(created_at);

-- RLS
ALTER TABLE financial_goal_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contributions" ON financial_goal_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contributions" ON financial_goal_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contributions" ON financial_goal_contributions FOR DELETE USING (auth.uid() = user_id);

-- Trigger: atualizar current_amount da meta ao inserir contribuição
CREATE OR REPLACE FUNCTION apply_savings_contribution()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE financial_goals
  SET current_amount = current_amount + NEW.amount,
      status = CASE WHEN current_amount + NEW.amount >= target_amount THEN 'completed' ELSE status END,
      updated_at = NOW()
  WHERE id = NEW.goal_id AND goal_type = 'savings';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_savings_contribution ON financial_goal_contributions;
CREATE TRIGGER trg_apply_savings_contribution
AFTER INSERT ON financial_goal_contributions
FOR EACH ROW
EXECUTE FUNCTION apply_savings_contribution();;
