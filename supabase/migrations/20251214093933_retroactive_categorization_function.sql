-- Função para categorizar retroativamente transações sem categoria
CREATE OR REPLACE FUNCTION categorize_uncategorized_transactions()
RETURNS TABLE(
  processed_count INT,
  categorized_count INT,
  still_uncategorized_count INT
) AS $$
DECLARE
  v_processed_count INT := 0;
  v_categorized_count INT := 0;
  v_still_uncategorized_count INT := 0;
  v_transaction_id UUID;
  v_user_id UUID;
  v_description TEXT;
  v_matched_category_id UUID;
BEGIN
  -- Cursor para iterar sobre transações sem categoria
  FOR v_transaction_id, v_user_id, v_description IN
    SELECT id, user_id, description
    FROM credit_card_transactions
    WHERE category_id IS NULL
      AND description IS NOT NULL
      AND description != ''
    ORDER BY created_at DESC
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Buscar regra que corresponde ao padrão
    SELECT category_id INTO v_matched_category_id
    FROM category_rules
    WHERE user_id = v_user_id
      AND v_description ILIKE merchant_pattern
    ORDER BY LENGTH(merchant_pattern) DESC
    LIMIT 1;
    
    -- Se encontrou regra, atualizar transação
    IF v_matched_category_id IS NOT NULL THEN
      UPDATE credit_card_transactions
      SET category_id = v_matched_category_id,
          updated_at = NOW()
      WHERE id = v_transaction_id;
      
      v_categorized_count := v_categorized_count + 1;
    END IF;
  END LOOP;
  
  -- Contar quantas ainda ficaram sem categoria
  SELECT COUNT(*) INTO v_still_uncategorized_count
  FROM credit_card_transactions
  WHERE category_id IS NULL;
  
  -- Retornar resultados
  RETURN QUERY SELECT v_processed_count, v_categorized_count, v_still_uncategorized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
