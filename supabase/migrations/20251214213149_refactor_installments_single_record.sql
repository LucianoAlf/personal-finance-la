
-- Adicionar campo para valor total da compra parcelada
ALTER TABLE credit_card_transactions 
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);

-- Adicionar campo para indicar se é registro pai de parcelamento
ALTER TABLE credit_card_transactions 
ADD COLUMN IF NOT EXISTS is_parent_installment BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN credit_card_transactions.total_amount IS 'Valor total da compra parcelada (amount = valor da parcela)';
COMMENT ON COLUMN credit_card_transactions.is_parent_installment IS 'True se for o registro pai de um parcelamento (as parcelas são calculadas dinamicamente)';

-- Criar view para exibir transações com parcelas calculadas
CREATE OR REPLACE VIEW v_credit_card_transactions_with_installments AS
SELECT 
  t.*,
  -- Para parcelamentos, calcular a parcela atual baseado no mês
  CASE 
    WHEN t.is_installment AND t.is_parent_installment THEN
      LEAST(
        t.total_installments,
        GREATEST(
          1,
          EXTRACT(MONTH FROM AGE(CURRENT_DATE, t.purchase_date))::INTEGER + 1
        )
      )
    ELSE t.installment_number
  END AS current_installment_number,
  -- Nome do cartão para exibição
  cc.name AS credit_card_name,
  -- Categoria para exibição
  cat.name AS category_name,
  cat.icon AS category_icon
FROM credit_card_transactions t
LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
LEFT JOIN categories cat ON t.category_id = cat.id;

-- Função para gerar parcelas virtuais de um parcelamento
CREATE OR REPLACE FUNCTION get_installment_schedule(
  p_transaction_id UUID
)
RETURNS TABLE (
  installment_number INTEGER,
  amount NUMERIC,
  due_date DATE,
  status TEXT,
  invoice_month DATE
) AS $$
DECLARE
  v_transaction RECORD;
  v_closing_day INTEGER;
  i INTEGER;
  v_invoice_date DATE;
BEGIN
  -- Buscar transação
  SELECT t.*, cc.closing_day INTO v_transaction
  FROM credit_card_transactions t
  JOIN credit_cards cc ON t.credit_card_id = cc.id
  WHERE t.id = p_transaction_id;
  
  IF NOT FOUND OR NOT v_transaction.is_installment THEN
    RETURN;
  END IF;
  
  v_closing_day := COALESCE(v_transaction.closing_day, 1);
  
  -- Gerar cada parcela
  FOR i IN 1..v_transaction.total_installments LOOP
    -- Calcular mês da fatura (baseado na data de compra + número de meses)
    v_invoice_date := DATE_TRUNC('month', v_transaction.purchase_date) + ((i - 1) || ' months')::INTERVAL;
    
    RETURN QUERY SELECT
      i AS installment_number,
      v_transaction.amount AS amount,
      (v_invoice_date + ((v_closing_day - 1) || ' days')::INTERVAL)::DATE AS due_date,
      CASE 
        WHEN v_invoice_date < DATE_TRUNC('month', CURRENT_DATE) THEN 'paid'
        WHEN v_invoice_date = DATE_TRUNC('month', CURRENT_DATE) THEN 'current'
        ELSE 'future'
      END AS status,
      v_invoice_date AS invoice_month;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
;
