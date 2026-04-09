-- View para histórico de tendências de contas recorrentes
CREATE OR REPLACE VIEW v_recurring_bills_trend AS
WITH monthly_data AS (
  SELECT
    pb.parent_recurring_id,
    parent.description,
    parent.provider_name,
    DATE_TRUNC('month', pb.due_date) AS month,
    AVG(pb.amount) AS avg_amount,
    MIN(pb.amount) AS min_amount,
    MAX(pb.amount) AS max_amount,
    STDDEV(pb.amount) AS stddev_amount,
    COUNT(*) AS occurrences_count
  FROM payable_bills pb
  JOIN payable_bills parent ON pb.parent_recurring_id = parent.id
  WHERE pb.parent_recurring_id IS NOT NULL
  GROUP BY pb.parent_recurring_id, parent.description, parent.provider_name, DATE_TRUNC('month', pb.due_date)
),
with_variation AS (
  SELECT
    *,
    LAG(avg_amount) OVER (PARTITION BY parent_recurring_id ORDER BY month) AS previous_month_amount,
    (avg_amount - LAG(avg_amount) OVER (PARTITION BY parent_recurring_id ORDER BY month)) / 
    NULLIF(LAG(avg_amount) OVER (PARTITION BY parent_recurring_id ORDER BY month), 0) * 100 AS variation_percent
  FROM monthly_data
)
SELECT
  parent_recurring_id,
  description,
  provider_name,
  month,
  avg_amount,
  min_amount,
  max_amount,
  COALESCE(stddev_amount, 0) AS stddev_amount,
  occurrences_count,
  COALESCE(variation_percent, 0) AS variation_percent,
  previous_month_amount
FROM with_variation
ORDER BY parent_recurring_id, month DESC;;
