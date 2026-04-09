-- Criar tabela de contribuições/aportes em metas de investimento
CREATE TABLE investment_goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES investment_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Aporte
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_investment_contributions_goal ON investment_goal_contributions(goal_id);
CREATE INDEX idx_investment_contributions_user ON investment_goal_contributions(user_id);
CREATE INDEX idx_investment_contributions_date ON investment_goal_contributions(date DESC);

-- Comentários
COMMENT ON TABLE investment_goal_contributions IS 'Histórico de aportes/contribuições em metas de investimento';
COMMENT ON COLUMN investment_goal_contributions.amount IS 'Valor do aporte';
COMMENT ON COLUMN investment_goal_contributions.date IS 'Data em que o aporte foi realizado';
COMMENT ON COLUMN investment_goal_contributions.note IS 'Observação opcional sobre o aporte';

-- RLS Policies
ALTER TABLE investment_goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contributions_select_own ON investment_goal_contributions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY contributions_insert_own ON investment_goal_contributions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY contributions_delete_own ON investment_goal_contributions 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger: Atualizar current_amount da meta automaticamente
CREATE OR REPLACE FUNCTION update_investment_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Adicionar aporte ao current_amount
    UPDATE investment_goals
    SET current_amount = current_amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remover aporte do current_amount
    UPDATE investment_goals
    SET current_amount = current_amount - OLD.amount,
        updated_at = NOW()
    WHERE id = OLD.goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investment_contribution_update_goal
  AFTER INSERT OR DELETE ON investment_goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_investment_goal_amount();

-- Trigger para updated_at
CREATE TRIGGER investment_contributions_updated_at
  BEFORE UPDATE ON investment_goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
