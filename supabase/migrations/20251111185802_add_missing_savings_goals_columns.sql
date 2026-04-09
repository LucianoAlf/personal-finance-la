-- Adicionar colunas faltantes na tabela savings_goals
ALTER TABLE savings_goals
ADD COLUMN IF NOT EXISTS start_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS target_date date,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled'));

-- Atualizar dados existentes para usar deadline como target_date se target_date for nulo
UPDATE savings_goals
SET target_date = deadline
WHERE target_date IS NULL AND deadline IS NOT NULL;

-- Comentários nas colunas
COMMENT ON COLUMN savings_goals.start_date IS 'Data de início da meta';
COMMENT ON COLUMN savings_goals.target_date IS 'Data alvo para conclusão da meta';
COMMENT ON COLUMN savings_goals.priority IS 'Prioridade da meta: low, medium, high, critical';
COMMENT ON COLUMN savings_goals.status IS 'Status da meta: active, completed, paused, cancelled';;
