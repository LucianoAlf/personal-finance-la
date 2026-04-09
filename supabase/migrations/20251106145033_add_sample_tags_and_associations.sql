
-- Criar tags de exemplo
INSERT INTO tags (user_id, name, color) VALUES
  ((SELECT user_id FROM credit_card_transactions LIMIT 1), 'Alimentação', '#f59e0b'),
  ((SELECT user_id FROM credit_card_transactions LIMIT 1), 'Transporte', '#3b82f6'),
  ((SELECT user_id FROM credit_card_transactions LIMIT 1), 'Lazer', '#ec4899'),
  ((SELECT user_id FROM credit_card_transactions LIMIT 1), 'Saúde', '#10b981')
ON CONFLICT DO NOTHING;

-- Associar tags às transações existentes (distribuição aleatória)
WITH transactions AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM credit_card_transactions
),
tags_list AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM tags
)
INSERT INTO credit_card_transaction_tags (credit_card_transaction_id, tag_id)
SELECT 
  t.id,
  tl.id
FROM transactions t
CROSS JOIN tags_list tl
WHERE (t.rn % 5) + 1 = tl.rn
ON CONFLICT DO NOTHING;
;
