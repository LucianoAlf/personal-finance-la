-- Function para calcular projeção de investimento com juros compostos
CREATE OR REPLACE FUNCTION calculate_investment_projection(
  p_current_amount NUMERIC,
  p_monthly_contribution NUMERIC,
  p_annual_rate NUMERIC,
  p_months INTEGER
)
RETURNS TABLE (
  month INTEGER,
  contribution NUMERIC,
  interest NUMERIC,
  balance NUMERIC
) AS $$
DECLARE
  v_monthly_rate NUMERIC;
  v_balance NUMERIC;
  v_month INTEGER;
  v_interest NUMERIC;
BEGIN
  -- Converter taxa anual para mensal
  v_monthly_rate := p_annual_rate / 12 / 100;
  v_balance := p_current_amount;
  
  -- Calcular mês a mês
  FOR v_month IN 1..p_months LOOP
    -- Juros do mês
    v_interest := v_balance * v_monthly_rate;
    
    -- Novo saldo = saldo anterior + juros + aporte
    v_balance := v_balance + v_interest + p_monthly_contribution;
    
    RETURN QUERY SELECT 
      v_month,
      p_monthly_contribution,
      ROUND(v_interest, 2),
      ROUND(v_balance, 2);
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_investment_projection IS 'Calcula projeção mensal de investimento com juros compostos';

-- Function para calcular métricas de uma meta de investimento
CREATE OR REPLACE FUNCTION get_investment_goal_metrics(p_goal_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_goal investment_goals%ROWTYPE;
  v_months_total INTEGER;
  v_months_elapsed INTEGER;
  v_months_remaining INTEGER;
  v_expected_amount NUMERIC;
  v_percentage NUMERIC;
  v_is_on_track BOOLEAN;
  v_final_projection NUMERIC;
  v_total_contributions NUMERIC;
  v_total_interest NUMERIC;
BEGIN
  -- Buscar meta
  SELECT * INTO v_goal FROM investment_goals WHERE id = p_goal_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calcular meses
  v_months_total := EXTRACT(YEAR FROM AGE(v_goal.target_date, v_goal.start_date)) * 12 
                  + EXTRACT(MONTH FROM AGE(v_goal.target_date, v_goal.start_date));
  v_months_elapsed := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_goal.start_date)) * 12 
                    + EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_goal.start_date));
  v_months_remaining := GREATEST(0, v_months_total - v_months_elapsed);
  
  -- Percentual alcançado
  v_percentage := CASE 
    WHEN v_goal.target_amount > 0 THEN (v_goal.current_amount / v_goal.target_amount) * 100 
    ELSE 0 
  END;
  
  -- Projeção final
  SELECT balance INTO v_final_projection
  FROM calculate_investment_projection(
    v_goal.current_amount,
    v_goal.monthly_contribution,
    v_goal.expected_return_rate,
    v_months_remaining
  )
  ORDER BY month DESC
  LIMIT 1;
  
  -- Total de contribuições futuras
  v_total_contributions := v_goal.monthly_contribution * v_months_remaining;
  
  -- Total de juros futuros
  v_total_interest := v_final_projection - v_goal.current_amount - v_total_contributions;
  
  -- Está no caminho certo?
  v_is_on_track := v_final_projection >= v_goal.target_amount;
  
  RETURN jsonb_build_object(
    'goal_id', v_goal.id,
    'current_amount', v_goal.current_amount,
    'target_amount', v_goal.target_amount,
    'percentage', ROUND(v_percentage, 2),
    'months_total', v_months_total,
    'months_elapsed', v_months_elapsed,
    'months_remaining', v_months_remaining,
    'final_projection', ROUND(v_final_projection, 2),
    'total_contributions', ROUND(v_total_contributions, 2),
    'total_interest', ROUND(v_total_interest, 2),
    'is_on_track', v_is_on_track,
    'shortfall', CASE 
      WHEN v_final_projection < v_goal.target_amount 
      THEN ROUND(v_goal.target_amount - v_final_projection, 2)
      ELSE 0 
    END
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_investment_goal_metrics IS 'Retorna métricas calculadas de uma meta de investimento';;
