-- Corrigir function get_bill_analytics removendo agregação aninhada
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
  v_result JSONB;
  v_total_amount NUMERIC;
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '12 months');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  -- Calcular total_amount separadamente
  SELECT COALESCE(SUM(amount), 0) INTO v_total_amount
  FROM payable_bills
  WHERE user_id = p_user_id 
    AND due_date BETWEEN v_start_date AND v_end_date;
  
  WITH 
  -- Métricas gerais
  totals AS (
    SELECT
      COUNT(*) as total_bills,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COALESCE(SUM(amount), 0) as total_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0) as overdue_amount,
      COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
      COALESCE(AVG(amount), 0) as avg_amount
    FROM payable_bills
    WHERE user_id = p_user_id 
      AND due_date BETWEEN v_start_date AND v_end_date
  ),
  
  -- Performance
  performance AS (
    SELECT
      COALESCE(ROUND(
        (COUNT(*) FILTER (WHERE status = 'paid' AND paid_at <= due_date)::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE status = 'paid'), 0)) * 100, 2
      ), 0) as on_time_payment_rate,
      COALESCE(ROUND(
        AVG(EXTRACT(DAY FROM (paid_at - due_date))) FILTER (WHERE status = 'paid' AND paid_at > due_date), 1
      ), 0) as avg_delay_days,
      COALESCE(MAX(EXTRACT(DAY FROM (paid_at - due_date))) FILTER (WHERE status = 'paid' AND paid_at > due_date), 0) as max_delay_days
    FROM payable_bills
    WHERE user_id = p_user_id 
      AND due_date BETWEEN v_start_date AND v_end_date
  ),
  
  -- Totais mensais
  monthly_totals AS (
    SELECT COALESCE(JSONB_AGG(month_data ORDER BY month_date), '[]'::JSONB) as data
    FROM (
      SELECT 
        DATE_TRUNC('month', due_date) as month_date,
        JSONB_BUILD_OBJECT(
          'month', TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM'),
          'month_name', TO_CHAR(DATE_TRUNC('month', due_date), 'Mon/YY'),
          'total', COALESCE(SUM(amount), 0),
          'paid', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
          'pending', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'overdue')), 0),
          'count', COUNT(*)
        ) as month_data
      FROM payable_bills
      WHERE user_id = p_user_id
        AND due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
        AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      GROUP BY DATE_TRUNC('month', due_date)
    ) monthly
  ),
  
  -- Previsão
  forecast AS (
    SELECT
      COALESCE(ROUND(AVG(monthly_total), 2), 0) as predicted_amount,
      COUNT(*) as months_analyzed
    FROM (
      SELECT SUM(amount) as monthly_total
      FROM payable_bills
      WHERE user_id = p_user_id
        AND due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
        AND due_date < DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', due_date)
    ) last_months
  ),
  
  -- Top providers
  top_providers AS (
    SELECT COALESCE(JSONB_AGG(provider_data), '[]'::JSONB) as data
    FROM (
      SELECT JSONB_BUILD_OBJECT(
        'provider', COALESCE(provider_name, 'Sem fornecedor'),
        'count', COUNT(*),
        'total', ROUND(SUM(amount), 2),
        'avg', ROUND(AVG(amount), 2)
      ) as provider_data
      FROM payable_bills
      WHERE user_id = p_user_id 
        AND due_date BETWEEN v_start_date AND v_end_date
      GROUP BY provider_name
      ORDER BY SUM(amount) DESC
      LIMIT 5
    ) top5
  ),
  
  -- Distribuição por tipo (corrigido)
  by_type AS (
    SELECT COALESCE(JSONB_OBJECT_AGG(
      bill_type,
      JSONB_BUILD_OBJECT(
        'count', bill_count, 
        'total', total_amount,
        'percentage', CASE 
          WHEN v_total_amount > 0 
          THEN ROUND((total_amount / v_total_amount) * 100, 2)
          ELSE 0
        END
      )
    ), '{}'::JSONB) as data
    FROM (
      SELECT 
        bill_type,
        COUNT(*) as bill_count,
        ROUND(SUM(amount), 2) as total_amount
      FROM payable_bills
      WHERE user_id = p_user_id 
        AND due_date BETWEEN v_start_date AND v_end_date
        AND bill_type IS NOT NULL
      GROUP BY bill_type
    ) types
  )
  
  SELECT JSONB_BUILD_OBJECT(
    'period', JSONB_BUILD_OBJECT(
      'start_date', v_start_date, 
      'end_date', v_end_date
    ),
    'totals', JSONB_BUILD_OBJECT(
      'total_bills', t.total_bills,
      'paid_count', t.paid_count,
      'overdue_count', t.overdue_count,
      'pending_count', t.pending_count,
      'total_amount', ROUND(t.total_amount, 2),
      'paid_amount', ROUND(t.paid_amount, 2),
      'overdue_amount', ROUND(t.overdue_amount, 2),
      'pending_amount', ROUND(t.pending_amount, 2),
      'avg_amount', ROUND(t.avg_amount, 2)
    ),
    'performance', JSONB_BUILD_OBJECT(
      'on_time_payment_rate', p.on_time_payment_rate,
      'avg_delay_days', p.avg_delay_days,
      'max_delay_days', p.max_delay_days
    ),
    'monthly_totals', mt.data,
    'forecast', JSONB_BUILD_OBJECT(
      'next_month_prediction', f.predicted_amount,
      'based_on_months', f.months_analyzed
    ),
    'top_providers', tp.data,
    'by_type', bt.data
  ) INTO v_result
  FROM totals t
  CROSS JOIN performance p
  CROSS JOIN monthly_totals mt
  CROSS JOIN forecast f
  CROSS JOIN top_providers tp
  CROSS JOIN by_type bt;
  
  RETURN v_result;
END;
$$;;
