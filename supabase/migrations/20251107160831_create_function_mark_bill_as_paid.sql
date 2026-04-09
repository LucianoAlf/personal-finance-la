-- ============================================
-- FUNCTION: mark_bill_as_paid()
-- ============================================

CREATE OR REPLACE FUNCTION mark_bill_as_paid(
  p_bill_id UUID,
  p_user_id UUID,
  p_paid_amount DECIMAL,
  p_payment_method VARCHAR,
  p_account_from_id UUID DEFAULT NULL,
  p_confirmation_number VARCHAR DEFAULT NULL,
  p_payment_proof_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bill RECORD;
  v_payment_history_id UUID;
  v_total_paid DECIMAL;
  v_new_status VARCHAR(20);
  result JSONB;
BEGIN
  -- Buscar conta
  SELECT * INTO v_bill FROM payable_bills WHERE id = p_bill_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  -- Registrar no histórico
  INSERT INTO bill_payment_history (
    bill_id, user_id, payment_date, amount_paid, payment_method,
    account_from_id, confirmation_number, payment_proof_url, notes
  ) VALUES (
    p_bill_id, p_user_id, NOW(), p_paid_amount, p_payment_method,
    p_account_from_id, p_confirmation_number, p_payment_proof_url, p_notes
  ) RETURNING id INTO v_payment_history_id;
  
  -- Calcular total pago
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
  FROM bill_payment_history
  WHERE bill_id = p_bill_id;
  
  -- Determinar novo status
  IF v_total_paid >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;
  
  -- Atualizar conta
  UPDATE payable_bills
  SET 
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
    paid_amount = v_total_paid,
    payment_method = p_payment_method,
    payment_account_id = p_account_from_id,
    updated_at = NOW()
  WHERE id = p_bill_id;
  
  -- Retornar resultado
  result := JSONB_BUILD_OBJECT(
    'success', true,
    'payment_history_id', v_payment_history_id,
    'bill_id', p_bill_id,
    'amount_paid', p_paid_amount,
    'total_paid', v_total_paid,
    'status', v_new_status,
    'remaining', v_bill.amount - v_total_paid
  );
  
  RETURN result;
END;
$$;

COMMENT ON FUNCTION mark_bill_as_paid IS 'Marca conta como paga (total/parcial) e registra histórico';;
