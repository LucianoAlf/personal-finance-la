-- Corrigir a view para retornar apenas uma linha por cartão
-- Pegar a fatura aberta mais próxima do vencimento

DROP VIEW IF EXISTS v_credit_cards_summary;

CREATE VIEW v_credit_cards_summary AS
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
  -- Fatura atual: a fatura aberta com vencimento mais próximo
  ci_current.id AS current_invoice_id,
  ci_current.total_amount AS current_invoice_amount,
  ci_current.due_date AS current_due_date,
  ci_current.status AS current_invoice_status,
  -- Próxima fatura: a próxima fatura fechada
  ci_next.id AS next_invoice_id,
  ci_next.total_amount AS next_invoice_amount,
  ci_next.due_date AS next_due_date,
  -- Cálculos
  cc.credit_limit - cc.available_limit AS used_limit,
  ROUND((cc.credit_limit - cc.available_limit) / NULLIF(cc.credit_limit, 0) * 100, 2) AS usage_percentage,
  (SELECT COUNT(*) FROM credit_card_transactions WHERE credit_card_id = cc.id) AS total_transactions,
  (SELECT COUNT(*) FROM credit_card_invoices WHERE credit_card_id = cc.id AND status = 'paid') AS paid_invoices_count
FROM credit_cards cc
-- Fatura atual: pegar a fatura aberta com menor due_date (mais próxima)
LEFT JOIN LATERAL (
  SELECT id, total_amount, due_date, status
  FROM credit_card_invoices
  WHERE credit_card_id = cc.id 
    AND status IN ('open', 'partial')
  ORDER BY due_date ASC
  LIMIT 1
) ci_current ON true
-- Próxima fatura fechada
LEFT JOIN LATERAL (
  SELECT id, total_amount, due_date
  FROM credit_card_invoices
  WHERE credit_card_id = cc.id 
    AND status = 'closed'
  ORDER BY due_date ASC
  LIMIT 1
) ci_next ON true
WHERE cc.is_active = true AND cc.is_archived = false;;
