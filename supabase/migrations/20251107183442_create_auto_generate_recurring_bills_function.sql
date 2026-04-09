-- Função principal para auto-gerar contas recorrentes
CREATE OR REPLACE FUNCTION auto_generate_recurring_bills()
RETURNS TABLE(generated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bill RECORD;
  v_next_date DATE;
  v_generated INTEGER := 0;
BEGIN
  -- Buscar contas recorrentes que precisam gerar nova ocorrência
  FOR v_bill IN 
    SELECT * FROM payable_bills
    WHERE is_recurring = TRUE
      AND (next_occurrence_date IS NULL OR next_occurrence_date <= CURRENT_DATE + INTERVAL '7 days')
      AND (recurrence_config->>'end_date' IS NULL 
           OR (recurrence_config->>'end_date')::DATE > CURRENT_DATE)
  LOOP
    -- Calcular próxima data
    v_next_date := calculate_next_occurrence(
      COALESCE(v_bill.next_occurrence_date, v_bill.due_date),
      (v_bill.recurrence_config->>'frequency')::TEXT,
      (v_bill.recurrence_config->>'day_of_month')::INTEGER
    );
    
    -- Inserir nova ocorrência
    INSERT INTO payable_bills (
      user_id, description, amount, due_date, bill_type, priority,
      provider_name, payment_method, qr_code_pix, barcode, category_id,
      is_recurring, recurrence_config, parent_recurring_id, status
    ) VALUES (
      v_bill.user_id, v_bill.description, v_bill.amount, v_next_date,
      v_bill.bill_type, v_bill.priority, v_bill.provider_name,
      v_bill.payment_method, v_bill.qr_code_pix, v_bill.barcode, v_bill.category_id,
      FALSE, NULL, v_bill.id, 'pending'
    );
    
    -- Calcular próxima data para o template
    v_next_date := v_next_date + 
      CASE (v_bill.recurrence_config->>'frequency')::TEXT
        WHEN 'monthly' THEN INTERVAL '1 month'
        WHEN 'bimonthly' THEN INTERVAL '2 months'
        WHEN 'quarterly' THEN INTERVAL '3 months'
        WHEN 'semiannual' THEN INTERVAL '6 months'
        WHEN 'yearly' THEN INTERVAL '1 year'
        ELSE INTERVAL '1 month'
      END;
    
    -- Atualizar next_occurrence_date do template
    UPDATE payable_bills
    SET next_occurrence_date = v_next_date
    WHERE id = v_bill.id;
    
    v_generated := v_generated + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_generated;
END;
$$;;
