-- Melhorar function get_bill_analytics com métricas avançadas
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
BEGIN
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '12 months');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  WITH 
  -- Métricas gerais
  totals AS (
    SELECT
      COUNT(*) as total_bills,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      SUM(amount) as total_amount,
      SUM(amount) FILTER (WHERE status = 'paid') as paid_amount,
      SUM(amount) FILTER (WHERE status = 'overdue') as overdue_amount,
      SUM(amount) FILTER (WHERE status = 'pending') as pending_amount,
      AVG(amount) as avg_amount
    FROM payable_bills
    WHERE user_id = p_user_id 
      AND due_date BETWEEN v_start_date AND v_end_date
  ),
  
  -- Performance (pontualidade e atrasos)
  performance AS (
    SELECT
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'paid' AND paid_at <= due_date)::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE status = 'paid'), 0)) * 100,
        2
      ) as on_time_payment_rate,
      ROUND(
        AVG(EXTRACT(DAY FROM (paid_at - due_date)))
        FILTER (WHERE status = 'paid' AND paid_at > due_date),
        1
      ) as avg_delay_days,
      MAX(EXTRACT(DAY FROM (paid_at - due_date)))
        FILTER (WHERE status = 'paid' AND paid_at > due_date) as max_delay_days
    FROM payable_bills
    WHERE user_id = p_user_id 
      AND due_date BETWEEN v_start_date AND v_end_date
  ),
  
  -- Totais mensais (últimos 12 meses)
  monthly_totals AS (
    SELECT 
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'month', TO_CHAR(month_date, 'YYYY-MM'),
          'month_name', TO_CHAR(month_date, 'Mon/YY'),
          'total', COALESCE(SUM(amount), 0),
          'paid', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
          'pending', COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'overdue')), 0),
          'count', COALESCE(COUNT(*), 0)
        )
        ORDER BY month_date
      ) as data
    FROM (
      SELECT 
        DATE_TRUNC('month', due_date) as month_date,
        amount,
        status
      FROM payable_bills
      WHERE user_id = p_user_id
        AND due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
        AND due_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    ) monthly
    GROUP BY month_date
  ),
  
  -- Previsão próximo mês (média últimos 3 meses)
  forecast AS (
    SELECT
      ROUND(AVG(monthly_total), 2) as predicted_amount,
      COUNT(*) as months_analyzed
    FROM (
      SELECT 
        SUM(amount) as monthly_total
      FROM payable_bills
      WHERE user_id = p_user_id
        AND due_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
        AND due_date < DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', due_date)
    ) last_months
  ),
  
  -- Top 5 fornecedores
  top_providers AS (
    SELECT 
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'provider', provider_name,
          'count', bill_count,
          'total', total_amount,
          'avg', avg_amount
        )
        ORDER BY total_amount DESC
      ) as data
    FROM (
      SELECT 
        COALESCE(provider_name, 'Sem fornecedor') as provider_name,
        COUNT(*) as bill_count,
        ROUND(SUM(amount), 2) as total_amount,
        ROUND(AVG(amount), 2) as avg_amount
      FROM payable_bills
      WHERE user_id = p_user_id 
        AND due_date BETWEEN v_start_date AND v_end_date
      GROUP BY provider_name
      ORDER BY SUM(amount) DESC
      LIMIT 5
    ) top5
  ),
  
  -- Distribuição por tipo
  by_type AS (
    SELECT 
      JSONB_OBJECT_AGG(
        bill_type,
        JSONB_BUILD_OBJECT(
          'count', bill_count, 
          'total', total_amount,
          'percentage', percentage
        )
      ) as data
    FROM (
      SELECT 
        bill_type,
        COUNT(*) as bill_count,
        ROUND(SUM(amount), 2) as total_amount,
        ROUND((SUM(amount) / NULLIF(SUM(SUM(amount)) OVER (), 0)) * 100, 2) as percentage
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
      'on_time_payment_rate', COALESCE(p.on_time_payment_rate, 0),
      'avg_delay_days', COALESCE(p.avg_delay_days, 0),
      'max_delay_days', COALESCE(p.max_delay_days, 0)
    ),
    'monthly_totals', COALESCE(mt.data, '[]'::JSONB),
    'forecast', JSONB_BUILD_OBJECT(
      'next_month_prediction', COALESCE(f.predicted_amount, 0),
      'based_on_months', COALESCE(f.months_analyzed, 0)
    ),
    'top_providers', COALESCE(tp.data, '[]'::JSONB),
    'by_type', COALESCE(bt.data, '{}'::JSONB)
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
