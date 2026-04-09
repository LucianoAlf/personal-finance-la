-- =====================================================
-- TRIGGER: Calcular rentabilidade automática
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_investment_returns()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar current_value baseado em current_price
  IF NEW.current_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.current_value = NEW.quantity * NEW.current_price;
  END IF;
  
  -- Calcular rentabilidade percentual
  IF NEW.total_invested IS NOT NULL AND NEW.total_invested > 0 AND NEW.current_value IS NOT NULL THEN
    -- Rentabilidade = ((Valor Atual - Investido) / Investido) * 100
    NEW.return_percentage = 
      ((NEW.current_value - NEW.total_invested) / NEW.total_invested) * 100;
  ELSE
    NEW.return_percentage = 0;
  END IF;
  
  -- Atualizar timestamp
  NEW.last_price_update = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_calculate_returns ON investments;

CREATE TRIGGER trigger_calculate_returns
  BEFORE UPDATE OF current_price ON investments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_investment_returns();

-- Comentário
COMMENT ON FUNCTION calculate_investment_returns() IS 
'Calcula automaticamente current_value e return_percentage quando current_price é atualizado';

COMMENT ON TRIGGER trigger_calculate_returns ON investments IS 
'Trigger que recalcula rentabilidade ao atualizar cotação';;
