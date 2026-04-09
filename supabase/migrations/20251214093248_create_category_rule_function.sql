-- Função para criar regra a partir de padrão (upsert)
CREATE OR REPLACE FUNCTION create_category_rule(
  p_user_id UUID,
  p_merchant_pattern TEXT,
  p_category_id UUID
)
RETURNS UUID AS $$
DECLARE
  rule_id UUID;
BEGIN
  -- Inserir ou atualizar regra (upsert)
  INSERT INTO category_rules (user_id, merchant_pattern, category_id)
  VALUES (p_user_id, p_merchant_pattern, p_category_id)
  ON CONFLICT (user_id, merchant_pattern)
  DO UPDATE SET 
    category_id = EXCLUDED.category_id,
    updated_at = NOW()
  RETURNING id INTO rule_id;

  RETURN rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
