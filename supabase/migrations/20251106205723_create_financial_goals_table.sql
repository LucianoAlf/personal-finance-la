-- =====================================================
-- MIGRATION: financial_goals (Sistema Unificado de Metas)
-- Descrição: Tabela unificada para Metas de Economia e Metas de Gastos
-- Data: 2025-11-07
-- =====================================================

-- 1. Criar tabela financial_goals
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de meta
  goal_type TEXT NOT NULL CHECK (goal_type IN ('savings', 'spending_limit')),
  
  -- Campos comuns
  name TEXT NOT NULL,
  icon TEXT,
  target_amount DECIMAL(10,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Específico para Savings (Economia)
  deadline DATE,
  
  -- Específico para Spending Limit (Controle de Gastos)
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  period_type TEXT CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  period_start DATE,
  period_end DATE,
  
  -- Gamificação
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'exceeded', 'archived')),
  streak_count INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (
    (goal_type = 'savings' AND deadline IS NOT NULL AND category_id IS NULL) OR
    (goal_type = 'spending_limit' AND category_id IS NOT NULL AND period_type IS NOT NULL)
  ),
  
  -- Evitar duplicatas
  UNIQUE(user_id, category_id, period_type, period_start)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON financial_goals(goal_type);
CREATE INDEX IF NOT EXISTS idx_financial_goals_category ON financial_goals(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);

-- 3. Habilitar RLS
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
CREATE POLICY "Users can view own goals"
  ON financial_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON financial_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON financial_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON financial_goals FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Comentários para documentação
COMMENT ON TABLE financial_goals IS 'Tabela unificada para Metas de Economia e Metas de Gastos';
COMMENT ON COLUMN financial_goals.goal_type IS 'Tipo: savings (economia) ou spending_limit (controle gastos)';
COMMENT ON COLUMN financial_goals.streak_count IS 'Meses consecutivos cumprindo a meta';
COMMENT ON COLUMN financial_goals.best_streak IS 'Recorde pessoal de streak';;
