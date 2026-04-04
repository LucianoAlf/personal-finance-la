-- ============================================
-- AUTOMAÇÃO DE FATURAS - CRON JOBS E TRIGGERS
-- ============================================

-- 1. Função para fechar faturas automaticamente
CREATE OR REPLACE FUNCTION close_invoices_automatically()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Fechar faturas abertas cujo período já terminou
  UPDATE credit_card_invoices
  SET 
    status = 'closed',
    updated_at = NOW()
  WHERE status = 'open'
    AND closing_date < CURRENT_DATE;
    
  RAISE NOTICE 'Faturas fechadas automaticamente';
END;
$$;

-- 2. Função para verificar faturas vencidas
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar faturas como vencidas
  UPDATE credit_card_invoices
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE status IN ('open', 'closed')
    AND due_date < CURRENT_DATE
    AND (paid_amount < total_amount OR paid_amount IS NULL);
    
  RAISE NOTICE 'Faturas vencidas verificadas';
END;
$$;

-- 3. Habilitar extensão pg_cron (se ainda não estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Agendar fechamento automático de faturas (todo dia à meia-noite)
SELECT cron.schedule(
  'close-invoices-daily',
  '0 0 * * *', -- Todo dia à meia-noite (00:00)
  $$SELECT close_invoices_automatically();$$
);

-- 5. Agendar verificação de faturas vencidas (todo dia às 01:00)
SELECT cron.schedule(
  'check-overdue-invoices-daily',
  '0 1 * * *', -- Todo dia à 1h da manhã
  $$SELECT check_overdue_invoices();$$
);

-- 6. Trigger para calcular total da fatura ao fechar
CREATE OR REPLACE FUNCTION calculate_invoice_total_on_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  -- Se a fatura está sendo fechada, calcular o total
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    -- Somar todas as transações da fatura
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM credit_card_transactions
    WHERE invoice_id = NEW.id;
    
    -- Atualizar total_amount
    NEW.total_amount := v_total;
    NEW.remaining_amount := v_total - COALESCE(NEW.paid_amount, 0);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_calculate_invoice_total_on_close ON credit_card_invoices;
CREATE TRIGGER trg_calculate_invoice_total_on_close
  BEFORE UPDATE ON credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_total_on_close();

-- 7. Trigger para atualizar remaining_amount ao registrar pagamento
CREATE OR REPLACE FUNCTION update_invoice_remaining_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar remaining_amount
  NEW.remaining_amount := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
  
  -- Se pagamento total, marcar como paga
  IF NEW.remaining_amount <= 0 THEN
    NEW.status := 'paid';
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
    NEW.status := 'partial';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trg_update_invoice_remaining_amount ON credit_card_invoices;
CREATE TRIGGER trg_update_invoice_remaining_amount
  BEFORE UPDATE ON credit_card_invoices
  FOR EACH ROW
  WHEN (OLD.paid_amount IS DISTINCT FROM NEW.paid_amount)
  EXECUTE FUNCTION update_invoice_remaining_amount();

-- 8. Função para executar manualmente (útil para testes)
COMMENT ON FUNCTION close_invoices_automatically() IS 
  'Fecha automaticamente faturas cujo período de fechamento já passou. Execute manualmente com: SELECT close_invoices_automatically();';

COMMENT ON FUNCTION check_overdue_invoices() IS 
  'Verifica e marca faturas vencidas. Execute manualmente com: SELECT check_overdue_invoices();';

-- 9. Verificar cron jobs agendados
-- Para ver os jobs agendados, execute:
-- SELECT * FROM cron.job;

-- 10. Para remover um cron job (se necessário):
-- SELECT cron.unschedule('close-invoices-daily');
-- SELECT cron.unschedule('check-overdue-invoices-daily');
