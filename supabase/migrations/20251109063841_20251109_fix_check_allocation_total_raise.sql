-- Fix RAISE: usar placeholders corretos
CREATE OR REPLACE FUNCTION check_allocation_total()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(target_percentage), 0) INTO v_total
  FROM investment_allocation_targets
  WHERE user_id = NEW.user_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  IF (v_total + NEW.target_percentage) > 100 THEN
    RAISE EXCEPTION 'Total de alocação não pode exceder 100%% (atual: %%%, tentando adicionar: %%%)', v_total, NEW.target_percentage;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;;
