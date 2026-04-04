-- =====================================================
-- EXPANDIR get_bill_analytics() COM MÉTRICAS AVANÇADAS
-- =====================================================
-- Novas métricas:
-- 1. Comparação com período anterior (variação %)
-- 2. Contas que mais subiram
-- 3. Economia potencial (juros/multas evitáveis)
-- 4. Distribuição por categoria real
-- 5. Maior gasto do período
-- =====================================================

-- Dropar função existente para recriar com novas métricas
DROP FUNCTION IF EXISTS get_bill_analytics(UUID, DATE, DATE);

-- Criar função expandida
CREATE OR REPLACE FUNCTION get_bill_analytics(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  v_result JSONB;
  v_totals JSONB;
  v_previous_totals JSONB;
  v_performance JSONB;
  v_monthly_totals JSONB;
  v_forecast JSONB;
  v_top_providers JSONB;
  v_by_type JSONB;
  v_comparison JSONB;
  v_top_increases JSONB;
  v_potential_savings JSONB;
  v_biggest_expense JSONB;
  v_total_amount NUMERIC := 0;
  v_prev_total_amount NUMERIC := 0;
  v_paid_on_time INTEGER := 0;
  v_total_paid INTEGER := 0;
  v_total_delay_days INTEGER := 0;
  v_max_delay INTEGER := 0;
  v_overdue_count INTEGER := 0;
  v_estimated_interest NUMERIC := 0;
  v_estimated_fines NUMERIC := 0;
BEGIN
  -- Definir período padrão (últimos 12 meses)
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '12 months');
  
  -- Calcular período anterior para comparação
  v_prev_end_date := v_start_date - INTERVAL '1 day';
  v_prev_start_date := v_prev_end_date - (v_end_date - v_start_date);

  -- =====================================================
  -- TOTAIS DO PERÍODO ATUAL
  -- =====================================================
  SELECT COALESCE(jsonb_build_object(
    'total_bills', COUNT(*)::INTEGER,
    'paid_count', COUNT(*) FILTER (WHERE status = 'paid')::INTEGER,
    'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue')::INTEGER,
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending')::INTEGER,
    'total_amount', COALESCE(SUM(amount), 0)::NUMERIC,
    'paid_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC,
    'overdue_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0)::NUMERIC,
    'pending_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::NUMERIC,
    'avg_amount', COALESCE(AVG(amount), 0)::NUMERIC
  ), '{}'::JSONB)
  INTO v_totals
  FROM payable_bills
  WHERE user_id = p_user_id
    AND due_date BETWEEN v_start_date AND v_end_date
    AND is_recurring = FALSE;

  v_total_amount := COALESCE((v_totals->>'total_amount')::NUMERIC, 0);

  -- =====================================================
  -- TOTAIS DO PERÍODO ANTERIOR (para comparação)
  -- =====================================================
  SELECT COALESCE(jsonb_build_object(
    'total_bills', COUNT(*)::INTEGER,
    'total_amount', COALESCE(SUM(amount), 0)::NUMERIC,
    'paid_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC
  ), '{}'::JSONB)
  INTO v_previous_totals
  FROM payable_bills
  WHERE user_id = p_user_id
    AND due_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND is_recurring = FALSE;

  v_prev_total_amount := COALESCE((v_previous_totals->>'total_amount')::NUMERIC, 0);

  -- =====================================================
  -- COMPARAÇÃO COM PERÍODO ANTERIOR
  -- =====================================================
  v_comparison := jsonb_build_object(
    'previous_total', v_prev_total_amount,
    'current_total', v_total_amount,
    'difference', v_total_amount - v_prev_total_amount,
    'variation_percent', CASE 
      WHEN v_prev_total_amount > 0 THEN 
        ROUND(((v_total_amount - v_prev_total_amount) / v_prev_total_amount * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    'trend', CASE 
      WHEN v_total_amount > v_prev_total_amount THEN 'up'
      WHEN v_total_amount < v_prev_total_amount THEN 'down'
      ELSE 'stable'
    END
  );

  -- =====================================================
  -- PERFORMANCE (pontualidade e atrasos)
  -- =====================================================
  SELECT 
    COUNT(*) FILTER (WHERE status = 'paid' AND (paid_at IS NULL OR paid_at::DATE <= due_date)),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(
      CASE WHEN status = 'paid' AND paid_at IS NOT NULL AND paid_at::DATE > due_date 
      THEN (paid_at::DATE - due_date) 
      ELSE 0 END
    ), 0),
    COALESCE(MAX(
      CASE WHEN status = 'paid' AND paid_at IS NOT NULL AND paid_at::DATE > due_date 
      THEN (paid_at::DATE - due_date) 
      ELSE 0 END
    ), 0)
  INTO v_paid_on_time, v_total_paid, v_total_delay_days, v_max_delay
  FROM payable_bills
  WHERE user_id = p_user_id
    AND due_date BETWEEN v_start_date AND v_end_date
    AND is_recurring = FALSE;

  v_performance := jsonb_build_object(
    'on_time_payment_rate', CASE 
      WHEN v_total_paid > 0 THEN ROUND((v_paid_on_time::NUMERIC / v_total_paid * 100), 1)
      ELSE 100 
    END,
    'avg_delay_days', CASE 
      WHEN v_total_paid - v_paid_on_time > 0 THEN 
        ROUND((v_total_delay_days::NUMERIC / (v_total_paid - v_paid_on_time)), 1)
      ELSE 0 
    END,
    'max_delay_days', v_max_delay,
    'paid_on_time_count', v_paid_on_time,
    'paid_late_count', v_total_paid - v_paid_on_time
  );

  -- =====================================================
  -- ECONOMIA POTENCIAL (juros e multas evitáveis)
  -- =====================================================
  SELECT 
    COUNT(*),
    -- Estimativa: 2% de multa + 1% de juros por mês de atraso
    COALESCE(SUM(amount * 0.02), 0),  -- Multa estimada
    COALESCE(SUM(amount * 0.01 * GREATEST(1, (CURRENT_DATE - due_date) / 30)), 0)  -- Juros estimados
  INTO v_overdue_count, v_estimated_fines, v_estimated_interest
  FROM payable_bills
  WHERE user_id = p_user_id
    AND status = 'overdue'
    AND is_recurring = FALSE;

  v_potential_savings := jsonb_build_object(
    'overdue_bills_count', v_overdue_count,
    'estimated_fines', ROUND(v_estimated_fines, 2),
    'estimated_interest', ROUND(v_estimated_interest, 2),
    'total_potential_savings', ROUND(v_estimated_fines + v_estimated_interest, 2),
    'message', CASE 
      WHEN v_overdue_count > 0 THEN 
        'Pagando em dia você economizaria R$ ' || ROUND(v_estimated_fines + v_estimated_interest, 2)::TEXT || '/mês'
      ELSE 'Parabéns! Você está em dia com todas as contas!'
    END
  );

  -- =====================================================
  -- TOTAIS MENSAIS (últimos 12 meses)
  -- =====================================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(month_date, 'YYYY-MM'),
      'month_name', TO_CHAR(month_date, 'Mon/YY'),
      'total', total,
      'paid', paid,
      'pending', pending,
      'count', bill_count
    ) ORDER BY month_date
  ), '[]'::JSONB)
  INTO v_monthly_totals
  FROM (
    SELECT 
      DATE_TRUNC('month', due_date)::DATE as month_date,
      COALESCE(SUM(amount), 0) as total,
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'overdue')), 0) as pending,
      COUNT(*) as bill_count
    FROM payable_bills
    WHERE user_id = p_user_id
      AND due_date BETWEEN v_start_date AND v_end_date
      AND is_recurring = FALSE
    GROUP BY DATE_TRUNC('month', due_date)
  ) monthly;

  -- =====================================================
  -- PREVISÃO PRÓXIMO MÊS (média dos últimos 3 meses)
  -- =====================================================
  SELECT jsonb_build_object(
    'next_month_prediction', COALESCE(ROUND(AVG(total), 2), 0),
    'based_on_months', COUNT(*)::INTEGER
  )
  INTO v_forecast
  FROM (
    SELECT SUM(amount) as total
    FROM payable_bills
    WHERE user_id = p_user_id
      AND due_date >= (CURRENT_DATE - INTERVAL '3 months')
      AND due_date < CURRENT_DATE
      AND is_recurring = FALSE
    GROUP BY DATE_TRUNC('month', due_date)
    ORDER BY DATE_TRUNC('month', due_date) DESC
    LIMIT 3
  ) recent_months;

  -- =====================================================
  -- TOP 5 FORNECEDORES
  -- =====================================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'provider', provider_name,
      'count', bill_count,
      'total', total,
      'avg', avg_amount
    ) ORDER BY total DESC
  ), '[]'::JSONB)
  INTO v_top_providers
  FROM (
    SELECT 
      COALESCE(provider_name, 'Não informado') as provider_name,
      COUNT(*) as bill_count,
      SUM(amount) as total,
      ROUND(AVG(amount), 2) as avg_amount
    FROM payable_bills
    WHERE user_id = p_user_id
      AND due_date BETWEEN v_start_date AND v_end_date
      AND is_recurring = FALSE
    GROUP BY provider_name
    ORDER BY total DESC
    LIMIT 5
  ) providers;

  -- =====================================================
  -- DISTRIBUIÇÃO POR TIPO
  -- =====================================================
  SELECT COALESCE(jsonb_object_agg(
    bill_type,
    jsonb_build_object(
      'count', bill_count,
      'total', total,
      'percentage', ROUND((total / NULLIF(v_total_amount, 0) * 100)::NUMERIC, 1)
    )
  ), '{}'::JSONB)
  INTO v_by_type
  FROM (
    SELECT 
      bill_type,
      COUNT(*) as bill_count,
      SUM(amount) as total
    FROM payable_bills
    WHERE user_id = p_user_id
      AND due_date BETWEEN v_start_date AND v_end_date
      AND is_recurring = FALSE
    GROUP BY bill_type
  ) types;

  -- =====================================================
  -- CONTAS QUE MAIS SUBIRAM (comparação com período anterior)
  -- =====================================================
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', description,
      'provider', provider_name,
      'bill_type', bill_type,
      'current_amount', current_amount,
      'previous_amount', previous_amount,
      'difference', current_amount - previous_amount,
      'variation_percent', ROUND(((current_amount - previous_amount) / NULLIF(previous_amount, 0) * 100)::NUMERIC, 1)
    ) ORDER BY (current_amount - previous_amount) DESC
  ), '[]'::JSONB)
  INTO v_top_increases
  FROM (
    SELECT 
      curr.description,
      curr.provider_name,
      curr.bill_type,
      curr.amount as current_amount,
      prev.amount as previous_amount
    FROM payable_bills curr
    INNER JOIN payable_bills prev ON (
      curr.user_id = prev.user_id
      AND curr.description = prev.description
      AND curr.provider_name IS NOT DISTINCT FROM prev.provider_name
      AND prev.due_date BETWEEN v_prev_start_date AND v_prev_end_date
    )
    WHERE curr.user_id = p_user_id
      AND curr.due_date BETWEEN v_start_date AND v_end_date
      AND curr.is_recurring = FALSE
      AND curr.amount > prev.amount
    ORDER BY (curr.amount - prev.amount) DESC
    LIMIT 5
  ) increases;

  -- =====================================================
  -- MAIOR GASTO DO PERÍODO
  -- =====================================================
  SELECT jsonb_build_object(
    'description', description,
    'provider', provider_name,
    'amount', amount,
    'bill_type', bill_type,
    'percentage_of_total', ROUND((amount / NULLIF(v_total_amount, 0) * 100)::NUMERIC, 1)
  )
  INTO v_biggest_expense
  FROM payable_bills
  WHERE user_id = p_user_id
    AND due_date BETWEEN v_start_date AND v_end_date
    AND is_recurring = FALSE
  ORDER BY amount DESC
  LIMIT 1;

  -- =====================================================
  -- MONTAR RESULTADO FINAL
  -- =====================================================
  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', v_start_date,
      'end_date', v_end_date,
      'previous_start_date', v_prev_start_date,
      'previous_end_date', v_prev_end_date
    ),
    'totals', v_totals,
    'comparison', v_comparison,
    'performance', v_performance,
    'potential_savings', v_potential_savings,
    'monthly_totals', v_monthly_totals,
    'forecast', v_forecast,
    'top_providers', v_top_providers,
    'by_type', v_by_type,
    'top_increases', v_top_increases,
    'biggest_expense', COALESCE(v_biggest_expense, '{}'::JSONB)
  );

  RETURN v_result;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION get_bill_analytics(UUID, DATE, DATE) IS 
'Retorna analytics completo de contas a pagar com comparação temporal, alertas de comportamento e economia potencial';
