-- =====================================================
-- TRIGGERS E FUNÇÕES: financial_goals
-- Descrição: Automação para atualizar metas de gastos
-- =====================================================

-- 1. Função: Atualizar progresso de metas de gastos automaticamente
CREATE OR REPLACE FUNCTION update_spending_goals()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar current_amount de todas as metas de gasto ativas da categoria
  UPDATE financial_goals fg
  SET 
    current_amount = (
      SELECT COALESCE(SUM(t.amount), 0)
      FROM credit_card_transactions t
      WHERE t.user_id = fg.user_id
        AND t.category_id = fg.category_id
        AND t.purchase_date >= fg.period_start
        AND t.purchase_date <= fg.period_end
    ),
    status = CASE
      WHEN (
        SELECT COALESCE(SUM(t.amount), 0)
        FROM credit_card_transactions t
        WHERE t.user_id = fg.user_id
          AND t.category_id = fg.category_id
          AND t.purchase_date >= fg.period_start
          AND t.purchase_date <= fg.period_end
      ) >= fg.target_amount THEN 'exceeded'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE fg.goal_type = 'spending_limit'
    AND fg.category_id = COALESCE(NEW.category_id, OLD.category_id)
    AND fg.status IN ('active', 'exceeded');
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger: Executar após INSERT/UPDATE/DELETE em transações
DROP TRIGGER IF EXISTS trg_update_spending_goals ON credit_card_transactions;
CREATE TRIGGER trg_update_spending_goals
AFTER INSERT OR UPDATE OR DELETE ON credit_card_transactions
FOR EACH ROW
EXECUTE FUNCTION update_spending_goals();

-- 3. Função: Calcular streak mensal de uma meta
CREATE OR REPLACE FUNCTION calculate_spending_streak(goal_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  current_month DATE;
  goal_record RECORD;
  month_spending DECIMAL(10,2);
BEGIN
  -- Buscar meta
  SELECT * INTO goal_record FROM financial_goals WHERE id = goal_id;
  
  -- Só calcula streak para metas de gasto
  IF goal_record.goal_type != 'spending_limit' THEN
    RETURN 0;
  END IF;
  
  current_month := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Contar meses consecutivos onde meta foi cumprida (gasto <= limite)
  WHILE current_month >= goal_record.period_start LOOP
    -- Calcular gasto do mês
    SELECT COALESCE(SUM(amount), 0) INTO month_spending
    FROM credit_card_transactions
    WHERE user_id = goal_record.user_id
      AND category_id = goal_record.category_id
      AND purchase_date >= current_month
      AND purchase_date < current_month + INTERVAL '1 month';
    
    -- Se cumpriu a meta (gastou menos ou igual ao limite)
    IF month_spending <= goal_record.target_amount THEN
      streak := streak + 1;
    ELSE
      -- Quebrou o streak
      EXIT;
    END IF;
    
    -- Voltar 1 mês
    current_month := current_month - INTERVAL '1 month';
  END LOOP;
  
  RETURN streak;
END;
$$ LANGUAGE plpgsql;

-- 4. Função: Atualizar best_streak se atual for maior
CREATE OR REPLACE FUNCTION update_best_streak(goal_id UUID)
RETURNS VOID AS $$
DECLARE
  current_streak INTEGER;
BEGIN
  -- Calcular streak atual
  current_streak := calculate_spending_streak(goal_id);
  
  -- Atualizar streak_count e best_streak se necessário
  UPDATE financial_goals
  SET 
    streak_count = current_streak,
    best_streak = GREATEST(best_streak, current_streak),
    updated_at = NOW()
  WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Função: Atualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger: Atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS trg_financial_goals_updated_at ON financial_goals;
CREATE TRIGGER trg_financial_goals_updated_at
BEFORE UPDATE ON financial_goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON FUNCTION update_spending_goals() IS 'Atualiza current_amount e status das metas de gasto quando transações mudam';
COMMENT ON FUNCTION calculate_spending_streak(UUID) IS 'Calcula meses consecutivos cumprindo a meta de gasto';
COMMENT ON FUNCTION update_best_streak(UUID) IS 'Atualiza streak_count e best_streak de uma meta';;
