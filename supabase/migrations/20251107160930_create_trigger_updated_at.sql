-- ============================================
-- TRIGGER: Auto-atualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payable_bills_updated_at
  BEFORE UPDATE ON payable_bills
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();;
