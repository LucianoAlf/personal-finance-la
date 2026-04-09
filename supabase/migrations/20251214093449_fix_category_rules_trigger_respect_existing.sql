-- Corrigir função para NÃO sobrescrever categoria já definida
CREATE OR REPLACE FUNCTION apply_category_rules()
RETURNS TRIGGER AS $$
DECLARE
  matched_category_id UUID;
BEGIN
  -- ✅ SÓ aplicar regra se category_id ainda não foi definido
  -- Isso respeita a categorização do WhatsApp e outras fontes
  IF NEW.category_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;;
