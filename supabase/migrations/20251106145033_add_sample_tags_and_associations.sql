
-- Sample tags (only when at least one credit_card_transaction exists — fresh DBs skip)
INSERT INTO tags (user_id, name, color)
SELECT cct.user_id, v.name, v.color
FROM (SELECT user_id FROM credit_card_transactions LIMIT 1) cct
CROSS JOIN (
  VALUES
    ('Alimentação', '#f59e0b'),
    ('Transporte', '#3b82f6'),
    ('Lazer', '#ec4899'),
    ('Saúde', '#10b981')
) AS v(name, color)
WHERE cct.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Associar tags às transações existentes (distribuição determinística)
WITH transactions AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM credit_card_transactions
),
tags_list AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) AS rn
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
