-- ============================================
-- VIEW: v_bills_summary (Resumo Mensal)
-- ============================================

CREATE OR REPLACE VIEW v_bills_summary AS
SELECT 
  user_id,
  DATE_TRUNC('month', due_date)::DATE as month_date,
  
  -- Contadores
  COUNT(*) as total_bills,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE status = 'partial') as partial_count,
  
  -- Valores
  COALESCE(SUM(amount), 0) as total_amount,
  COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
  COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0) as overdue_amount,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid_amount,
  COALESCE(SUM(amount - COALESCE(paid_amount, 0)) FILTER (WHERE status IN ('pending', 'overdue', 'partial')), 0) as remaining_amount,
  
  -- Por prioridade
  COUNT(*) FILTER (WHERE priority = 'critical' AND status IN ('pending', 'overdue')) as critical_pending,
  COUNT(*) FILTER (WHERE priority = 'high' AND status IN ('pending', 'overdue')) as high_pending,
  
  -- Datas
  MIN(due_date) FILTER (WHERE status = 'pending') as next_due_date,
  MAX(paid_at) FILTER (WHERE status = 'paid') as last_payment_date,
  
  -- Metadados
  MAX(updated_at) as last_updated
  
FROM payable_bills
WHERE due_date >= '2020-01-01'
GROUP BY user_id, DATE_TRUNC('month', due_date)
ORDER BY user_id, month_date DESC;

COMMENT ON VIEW v_bills_summary IS 'Resumo mensal agregado de contas a pagar';;
