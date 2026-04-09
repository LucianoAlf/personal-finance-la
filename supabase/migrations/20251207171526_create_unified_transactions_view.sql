-- View unificada de transações (normais + cartão de crédito)
-- Para aparecer em "Transações Recentes" no Dashboard

CREATE OR REPLACE VIEW v_all_transactions AS
-- Transações normais
SELECT 
  t.id,
  t.user_id,
  t.account_id,
  t.category_id,
  t.type,
  t.amount,
  t.description,
  t.transaction_date,
  t.is_paid,
  t.payment_method,
  t.created_at,
  'transaction' as source_type,
  NULL::uuid as credit_card_id,
  NULL::text as credit_card_name,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  a.name as account_name
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN accounts a ON t.account_id = a.id

UNION ALL

-- Transações de cartão de crédito
SELECT 
  cct.id,
  cct.user_id,
  NULL::uuid as account_id,
  cct.category_id,
  'expense'::text as type,
  cct.amount,
  cct.description,
  cct.purchase_date as transaction_date,
  false as is_paid, -- Compras de cartão são pagas quando a fatura é paga
  'credit'::text as payment_method,
  cct.created_at,
  'credit_card' as source_type,
  cct.credit_card_id,
  cc.name as credit_card_name,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  cc.name as account_name -- Usar nome do cartão como "conta"
FROM credit_card_transactions cct
LEFT JOIN categories c ON cct.category_id = c.id
LEFT JOIN credit_cards cc ON cct.credit_card_id = cc.id;;
