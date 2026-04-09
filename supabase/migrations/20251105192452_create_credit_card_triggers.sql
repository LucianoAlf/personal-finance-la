-- Function: Atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cc_transactions_updated_at
  BEFORE UPDATE ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Atualizar Total da Fatura
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Determinar o invoice_id (INSERT, UPDATE ou DELETE)
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Atualizar total da fatura
  IF v_invoice_id IS NOT NULL THEN
    UPDATE credit_card_invoices
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM credit_card_transactions
      WHERE invoice_id = v_invoice_id
    )
    WHERE id = v_invoice_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_total
  AFTER INSERT OR UPDATE OR DELETE ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total();

-- Function: Atualizar Limite Disponível
CREATE OR REPLACE FUNCTION update_available_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Determinar o card_id
  IF TG_OP = 'DELETE' THEN
    v_card_id := OLD.credit_card_id;
  ELSE
    v_card_id := NEW.credit_card_id;
  END IF;
  
  -- Atualizar limite disponível
  UPDATE credit_cards
  SET available_limit = credit_limit - (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM credit_card_invoices
    WHERE credit_card_id = v_card_id
      AND status IN ('open', 'closed')
  )
  WHERE id = v_card_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_available_limit
  AFTER INSERT OR UPDATE OR DELETE ON credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_available_limit();;
