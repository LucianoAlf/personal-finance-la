-- ============================================
-- TRIGGERS PARA LANÇAMENTO DE COMPRAS
-- ============================================

-- 1. Atualizar limite disponível ao criar transação
CREATE OR REPLACE FUNCTION update_card_limit_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduzir do limite disponível
  UPDATE credit_cards
  SET 
    current_balance = current_balance + NEW.amount,
    available_limit = "limit" - (current_balance + NEW.amount),
    updated_at = NOW()
  WHERE id = NEW.credit_card_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_card_limit_on_purchase ON credit_card_transactions;
CREATE TRIGGER trg_update_card_limit_on_purchase
  AFTER INSERT ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_limit_on_purchase();

-- 2. Atualizar total da fatura ao adicionar transação
CREATE OR REPLACE FUNCTION update_invoice_total_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Somar ao total da fatura
  UPDATE credit_card_invoices
  SET 
    total_amount = COALESCE(total_amount, 0) + NEW.amount,
    remaining_amount = COALESCE(remaining_amount, 0) + NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_invoice_total_on_transaction ON credit_card_transactions;
CREATE TRIGGER trg_update_invoice_total_on_transaction
  AFTER INSERT ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total_on_transaction();

-- 3. Atualizar limite ao deletar transação
CREATE OR REPLACE FUNCTION update_card_limit_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Devolver ao limite disponível
  UPDATE credit_cards
  SET 
    current_balance = current_balance - OLD.amount,
    available_limit = "limit" - (current_balance - OLD.amount),
    updated_at = NOW()
  WHERE id = OLD.credit_card_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_card_limit_on_delete ON credit_card_transactions;
CREATE TRIGGER trg_update_card_limit_on_delete
  AFTER DELETE ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_limit_on_delete();

-- 4. Atualizar total da fatura ao deletar transação
CREATE OR REPLACE FUNCTION update_invoice_total_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtrair do total da fatura
  UPDATE credit_card_invoices
  SET 
    total_amount = COALESCE(total_amount, 0) - OLD.amount,
    remaining_amount = COALESCE(remaining_amount, 0) - OLD.amount,
    updated_at = NOW()
  WHERE id = OLD.invoice_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_invoice_total_on_delete ON credit_card_transactions;
CREATE TRIGGER trg_update_invoice_total_on_delete
  AFTER DELETE ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_total_on_delete();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON FUNCTION update_card_limit_on_purchase() IS 
  'Atualiza o saldo e limite disponível do cartão ao criar uma transação';

COMMENT ON FUNCTION update_invoice_total_on_transaction() IS 
  'Atualiza o total e valor restante da fatura ao adicionar uma transação';

COMMENT ON FUNCTION update_card_limit_on_delete() IS 
  'Devolve o valor ao limite disponível ao deletar uma transação';

COMMENT ON FUNCTION update_invoice_total_on_delete() IS 
  'Subtrai o valor do total da fatura ao deletar uma transação';

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Para verificar se os triggers foram criados:
-- SELECT * FROM pg_trigger WHERE tgname LIKE '%purchase%' OR tgname LIKE '%invoice%';
