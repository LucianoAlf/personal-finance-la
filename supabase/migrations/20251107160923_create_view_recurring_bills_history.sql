-- ============================================
-- VIEW: v_recurring_bills_history (Histórico de Recorrentes)
-- ============================================

CREATE OR REPLACE VIEW v_recurring_bills_history AS
WITH recurring_templates AS (
  SELECT 
    id as template_id,
    user_id,
    provider_name,
    bill_type,
    description,
    recurrence_config
  FROM payable_bills
  WHERE is_recurring = true AND parent_bill_id IS NULL
),
occurrences AS (
  SELECT 
    pb.*,
    rt.template_id,
    LAG(pb.amount) OVER (PARTITION BY pb.parent_bill_id ORDER BY pb.due_date) as previous_amount,
    LEAD(pb.due_date) OVER (PARTITION BY pb.parent_bill_id ORDER BY pb.due_date) as next_due_date,
    ROW_NUMBER() OVER (PARTITION BY pb.parent_bill_id ORDER BY pb.due_date DESC) as recency_rank
  FROM payable_bills pb
  INNER JOIN recurring_templates rt ON pb.parent_bill_id = rt.template_id
  WHERE pb.is_installment = false
)
SELECT 
  *,
  CASE 
    WHEN previous_amount IS NOT NULL AND previous_amount > 0 THEN
      ROUND(((amount - previous_amount) / previous_amount) * 100, 2)
    ELSE NULL
  END as variation_percentage,
  CASE WHEN recency_rank = 1 THEN true ELSE false END as is_latest,
  DATE_PART('month', AGE(CURRENT_DATE, due_date))::INTEGER as months_ago
FROM occurrences
ORDER BY user_id, template_id, due_date DESC;

COMMENT ON VIEW v_recurring_bills_history IS 'Histórico de contas recorrentes com variação %';;
