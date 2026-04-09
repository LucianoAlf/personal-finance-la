-- View: Resumo de Cartões com Fatura Atual
CREATE OR REPLACE VIEW v_credit_cards_summary AS
SELECT 
  cc.id,
  cc.user_id,
  cc.name,
  cc.brand,
  cc.last_four_digits,
  cc.credit_limit,
  cc.available_limit,
  cc.closing_day,
  cc.due_day,
  cc.color,
  cc.icon,
  cc.is_active,
  cc.is_archived,
  cc.created_at,
  
  -- Fatura Atual (aberta)
  ci_open.id AS current_invoice_id,
  ci_open.total_amount AS current_invoice_amount,
  ci_open.due_date AS current_due_date,
  ci_open.status AS current_invoice_status,
  
  -- Próxima Fatura (fechada, não paga)
  ci_next.id AS next_invoice_id,
  ci_next.total_amount AS next_invoice_amount,
  ci_next.due_date AS next_due_date,
  
  -- Estatísticas
  (cc.credit_limit - cc.available_limit) AS used_limit,
  ROUND(((cc.credit_limit - cc.available_limit) / NULLIF(cc.credit_limit, 0) * 100), 2) AS usage_percentage,
  
  -- Contadores
  (SELECT COUNT(*) FROM credit_card_transactions WHERE credit_card_id = cc.id) AS total_transactions,
  (SELECT COUNT(*) FROM credit_card_invoices WHERE credit_card_id = cc.id AND status = 'paid') AS paid_invoices_count
  
FROM credit_cards cc

LEFT JOIN credit_card_invoices ci_open ON 
  ci_open.credit_card_id = cc.id AND 
  ci_open.status = 'open'

LEFT JOIN credit_card_invoices ci_next ON 
  ci_next.credit_card_id = cc.id AND 
  ci_next.status = 'closed' AND
  ci_next.due_date = (
    SELECT MIN(due_date) 
    FROM credit_card_invoices 
    WHERE credit_card_id = cc.id AND status = 'closed'
  )

WHERE cc.is_active = TRUE AND cc.is_archived = FALSE;

-- View: Detalhes de Faturas
CREATE OR REPLACE VIEW v_invoices_detailed AS
SELECT 
  ci.id AS invoice_id,
  ci.credit_card_id,
  cc.name AS card_name,
  cc.brand,
  cc.last_four_digits,
  ci.user_id,
  ci.reference_month,
  ci.closing_date,
  ci.due_date,
  ci.status,
  ci.total_amount,
  ci.paid_amount,
  ci.remaining_amount,
  ci.payment_date,
  
  -- Contadores
  COUNT(DISTINCT cct.id) AS transaction_count,
  COUNT(DISTINCT ccp.id) AS payment_count,
  
  -- Agregações
  COALESCE(SUM(cct.amount), 0) AS transactions_sum,
  COALESCE(SUM(ccp.amount), 0) AS payments_sum,
  
  -- Status Helpers
  CASE 
    WHEN ci.status = 'paid' THEN FALSE
    WHEN ci.due_date < CURRENT_DATE AND ci.status != 'paid' THEN TRUE
    ELSE FALSE
  END AS is_overdue,
  
  (ci.due_date - CURRENT_DATE) AS days_until_due

FROM credit_card_invoices ci
JOIN credit_cards cc ON ci.credit_card_id = cc.id
LEFT JOIN credit_card_transactions cct ON cct.invoice_id = ci.id
LEFT JOIN credit_card_payments ccp ON ccp.invoice_id = ci.id

GROUP BY ci.id, cc.id;;
