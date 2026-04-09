
-- ============================================
-- MIGRAÇÃO: Consolidar metas em financial_goals
-- financial_goals vira a fonte de verdade única
-- ============================================

-- 1. Adicionar colunas que existem em savings_goals mas faltam em financial_goals
ALTER TABLE financial_goals 
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS target_percent numeric,
  ADD COLUMN IF NOT EXISTS contribution_frequency text CHECK (contribution_frequency IN ('weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS contribution_day integer CHECK (contribution_day >= 1 AND contribution_day <= 28),
  ADD COLUMN IF NOT EXISTS notify_milestones boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_contribution boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_delay boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;

-- 2. Migrar dados existentes de savings_goals para financial_goals
INSERT INTO financial_goals (
  user_id, goal_type, name, icon, target_amount, current_amount, 
  deadline, status, priority, start_date, target_date, target_percent,
  contribution_frequency, contribution_day, notify_milestones, 
  notify_contribution, notify_delay, is_completed, created_at, updated_at
)
SELECT 
  user_id, 'savings', name, icon, 
  COALESCE(target_amount, 0), COALESCE(current_amount, 0),
  COALESCE(target_date, deadline), COALESCE(status, 'active'),
  COALESCE(priority, 'medium'), COALESCE(start_date, CURRENT_DATE),
  target_date, target_percent,
  contribution_frequency, contribution_day, 
  COALESCE(notify_milestones, true), COALESCE(notify_contribution, false),
  COALESCE(notify_delay, false), COALESCE(is_completed, false),
  created_at, updated_at
FROM savings_goals
WHERE NOT EXISTS (
  SELECT 1 FROM financial_goals fg 
  WHERE fg.user_id = savings_goals.user_id 
    AND fg.name = savings_goals.name 
    AND fg.goal_type = 'savings'
);

-- 3. Migrar contribuições de goal_contributions para financial_goal_contributions
INSERT INTO financial_goal_contributions (user_id, goal_id, amount, note, created_at)
SELECT 
  gc.user_id, 
  fg.id,
  gc.amount,
  gc.note,
  gc.created_at
FROM goal_contributions gc
JOIN savings_goals sg ON gc.goal_id = sg.id
JOIN financial_goals fg ON fg.user_id = sg.user_id 
  AND fg.name = sg.name 
  AND fg.goal_type = 'savings'
WHERE NOT EXISTS (
  SELECT 1 FROM financial_goal_contributions fgc
  WHERE fgc.goal_id = fg.id 
    AND fgc.amount = gc.amount 
    AND fgc.created_at = gc.created_at
);

-- 4. Adicionar comentários explicativos
COMMENT ON TABLE financial_goals IS 'Fonte de verdade ÚNICA para metas financeiras (economia e controle de gastos). savings_goals é legado.';
COMMENT ON TABLE savings_goals IS 'LEGADO - NÃO USAR. Migrado para financial_goals. Manter temporariamente para compatibilidade.';
;
