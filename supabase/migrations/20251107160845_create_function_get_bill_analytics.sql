-- ============================================
-- FUNCTION: get_bill_analytics()
-- ============================================

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
  
  WITH analytics AS (
    SELECT
      COUNT(*) as total_bills,
      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
      SUM(amount) as total_amount,
      SUM(amount) FILTER (WHERE status = 'paid') as paid_amount,
      SUM(amount) FILTER (WHERE status = 'overdue') as overdue_amount,
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'paid' AND paid_at <= due_date)::NUMERIC / 
         NULLIF(COUNT(*) FILTER (WHERE status = 'paid'), 0)) * 100,
        2
      ) as on_time_payment_rate,
      AVG(EXTRACT(DAY FROM (paid_at - due_date)))
        FILTER (WHERE status = 'paid' AND paid_at > due_date) as avg_delay_days,
      JSONB_OBJECT_AGG(
        bill_type,
        JSONB_BUILD_OBJECT('count', COUNT(*), 'total', SUM(amount))
      ) FILTER (WHERE bill_type IS NOT NULL) as by_type
    FROM payable_bills
    WHERE user_id = p_user_id AND due_date BETWEEN v_start_date AND v_end_date
  )
  SELECT JSONB_BUILD_OBJECT(
    'period', JSONB_BUILD_OBJECT('start_date', v_start_date, 'end_date', v_end_date),
    'totals', JSONB_BUILD_OBJECT(
      'total_bills', total_bills, 'paid_count', paid_count,
      'overdue_count', overdue_count, 'total_amount', total_amount,
      'paid_amount', paid_amount, 'overdue_amount', overdue_amount
    ),
    'performance', JSONB_BUILD_OBJECT(
      'on_time_payment_rate', on_time_payment_rate,
      'avg_delay_days', COALESCE(avg_delay_days, 0)
    ),
    'by_type', by_type
  ) INTO v_result FROM analytics;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_bill_analytics IS 'Retorna analytics completo de contas a pagar';;
