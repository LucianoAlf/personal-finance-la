-- =====================================================
-- FIX: Trigger inteligente - não duplicar valores iniciais
-- =====================================================

CREATE OR REPLACE FUNCTION update_investment_after_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_investment RECORD;
  v_existing_transactions INTEGER;
BEGIN
  SELECT * INTO v_investment FROM investments WHERE id = NEW.investment_id;
  
  -- Contar transações existentes ANTES desta (excluindo a atual)
  SELECT COUNT(*) INTO v_existing_transactions
  FROM investment_transactions
  WHERE investment_id = NEW.investment_id
    AND transaction_type = 'buy'
    AND id != NEW.id;
  
  IF NEW.transaction_type = 'buy' THEN
    -- Se já existe quantity no investment E é a primeira transação de compra,
    -- significa que o investimento foi criado com valores iniciais.
    -- Neste caso, NÃO somar novamente.
    IF v_investment.quantity > 0 AND v_existing_transactions = 0 THEN
      -- Investimento já tem valores iniciais, apenas atualizar timestamp
      UPDATE investments
      SET updated_at = NOW()
      WHERE id = NEW.investment_id;
      
    ELSE
      -- Compra adicional: recalcular preço médio e somar
      UPDATE investments
      SET 
        quantity = v_investment.quantity + NEW.quantity,
        purchase_price = (
          (v_investment.quantity * v_investment.purchase_price) + 
          (NEW.quantity * NEW.price)
        ) / (v_investment.quantity + NEW.quantity),
        total_invested = COALESCE(total_invested, 0) + NEW.total_value + NEW.fees,
        updated_at = NOW()
      WHERE id = NEW.investment_id;
    END IF;
    
  ELSIF NEW.transaction_type = 'sell' THEN
    -- Venda: sempre processar
    UPDATE investments
    SET 
      quantity = v_investment.quantity - NEW.quantity,
      status = CASE 
        WHEN (v_investment.quantity - NEW.quantity) <= 0 THEN 'sold'::TEXT
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
    
  ELSIF NEW.transaction_type = 'split' THEN
    -- Desdobramento: sempre processar
    UPDATE investments
    SET 
      quantity = v_investment.quantity * NEW.quantity,
      purchase_price = v_investment.purchase_price / NEW.quantity,
      current_price = CASE 
        WHEN current_price IS NOT NULL THEN current_price / NEW.quantity
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário atualizado
COMMENT ON FUNCTION update_investment_after_transaction() IS 
'Trigger inteligente que detecta se é transação inicial (dados já no investment) 
ou transação adicional (precisa somar). Evita duplicação de valores.';;
