-- Criar tabela de metas de investimento
CREATE TABLE investment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Básico
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'retirement',        -- Aposentadoria
    'financial_freedom', -- Independência Financeira
    'education',         -- Educação
    'real_estate',       -- Imóvel
    'general'            -- Geral
  )),
  
  -- Valores e Prazos
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC DEFAULT 0 CHECK (current_amount >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  
  -- Rentabilidade e Aportes
  expected_return_rate NUMERIC NOT NULL CHECK (expected_return_rate >= 0 AND expected_return_rate <= 100),
  monthly_contribution NUMERIC DEFAULT 0 CHECK (monthly_contribution >= 0),
  contribution_day INTEGER CHECK (contribution_day >= 1 AND contribution_day <= 28),
  
  -- Vinculação com Investimentos
  linked_investments UUID[] DEFAULT '{}',
  auto_invest BOOLEAN DEFAULT false,
  
  -- Status e Prioridade
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  -- Notificações
  notify_milestones BOOLEAN DEFAULT true,
  notify_contribution BOOLEAN DEFAULT false,
  notify_rebalancing BOOLEAN DEFAULT false,
  
  -- UI
  icon TEXT,
  color TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_investment_goals_user ON investment_goals(user_id);
CREATE INDEX idx_investment_goals_status ON investment_goals(status) WHERE status = 'active';
CREATE INDEX idx_investment_goals_target_date ON investment_goals(target_date);
CREATE INDEX idx_investment_goals_linked_investments ON investment_goals USING GIN(linked_investments);

-- Comentários
COMMENT ON TABLE investment_goals IS 'Metas de investimento com juros compostos e projeções';
COMMENT ON COLUMN investment_goals.expected_return_rate IS 'Taxa de retorno anual esperada (%)';
COMMENT ON COLUMN investment_goals.monthly_contribution IS 'Aporte mensal fixo';
COMMENT ON COLUMN investment_goals.linked_investments IS 'Array de IDs de investments vinculados';
COMMENT ON COLUMN investment_goals.auto_invest IS 'Se true, cria aportes automáticos nos investimentos vinculados';

-- RLS Policies
ALTER TABLE investment_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY investment_goals_select_own ON investment_goals 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY investment_goals_insert_own ON investment_goals 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY investment_goals_update_own ON investment_goals 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY investment_goals_delete_own ON investment_goals 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER investment_goals_updated_at
  BEFORE UPDATE ON investment_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();;
