-- Adicionar campos em savings_goals
ALTER TABLE savings_goals
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS notify_milestones BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notify_contribution BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contribution_frequency TEXT CHECK (contribution_frequency IN ('weekly', 'biweekly', 'monthly')),
ADD COLUMN IF NOT EXISTS contribution_day INTEGER CHECK (contribution_day BETWEEN 1 AND 28),
ADD COLUMN IF NOT EXISTS notify_delay BOOLEAN DEFAULT FALSE;

-- Adicionar campos em financial_cycles
ALTER TABLE financial_cycles
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS notify_start BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notify_days_before INTEGER CHECK (notify_days_before BETWEEN 1 AND 7),
ADD COLUMN IF NOT EXISTS linked_goals TEXT[],
ADD COLUMN IF NOT EXISTS auto_actions JSONB;

-- Adicionar budget_allocation em user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS budget_allocation JSONB DEFAULT '{"essentials": 50, "investments": 20, "leisure": 20, "others": 10}'::jsonb,
ADD COLUMN IF NOT EXISTS budget_alert_threshold INTEGER DEFAULT 80 CHECK (budget_alert_threshold BETWEEN 50 AND 100);;
