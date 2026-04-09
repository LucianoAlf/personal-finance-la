-- ============================================
-- FUNCTION: update_overdue_bills()
-- ============================================

CREATE OR REPLACE FUNCTION update_overdue_bills()
RETURNS TABLE(updated_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_updated INTEGER;
BEGIN
  UPDATE payable_bills
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS total_updated = ROW_COUNT;
  
  RETURN QUERY SELECT total_updated;
END;
$$;

COMMENT ON FUNCTION update_overdue_bills() IS 'Atualiza status pending → overdue quando vencidas';;
