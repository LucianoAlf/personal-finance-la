-- Função para aplicar regras de categorização
CREATE OR REPLACE FUNCTION apply_category_rules()
RETURNS TRIGGER AS $$
DECLARE
  matched_category_id UUID;
BEGIN
  -- Buscar regra que corresponde ao padrão do estabelecimento
  SELECT category_id INTO matched_category_id
  FROM category_rules
  WHERE user_id = NEW.user_id
    AND NEW.description ILIKE merchant_pattern
  ORDER BY LENGTH(merchant_pattern) DESC
  LIMIT 1;

  -- Se encontrou regra, aplicar categoria
  IF matched_category_id IS NOT NULL THEN
    NEW.category_id := matched_category_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para aplicar regras em novas transações
DROP TRIGGER IF EXISTS trigger_apply_category_rules ON credit_card_transactions;
CREATE TRIGGER trigger_apply_category_rules
  BEFORE INSERT ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION apply_category_rules();;
