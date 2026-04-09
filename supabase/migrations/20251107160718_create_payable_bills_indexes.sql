-- ============================================
-- ÍNDICES: payable_bills (7 índices otimizados)
-- ============================================

CREATE INDEX idx_payable_bills_user_status 
  ON payable_bills(user_id, status)
  INCLUDE (due_date, amount);

CREATE INDEX idx_payable_bills_user_due_date 
  ON payable_bills(user_id, due_date DESC)
  WHERE status IN ('pending', 'overdue');

CREATE INDEX idx_payable_bills_user_type 
  ON payable_bills(user_id, bill_type);

CREATE INDEX idx_payable_bills_provider 
  ON payable_bills(user_id, provider_name)
  WHERE provider_name IS NOT NULL;

CREATE INDEX idx_payable_bills_recurring 
  ON payable_bills(user_id, is_recurring, next_occurrence_date) 
  WHERE is_recurring = true;

CREATE INDEX idx_payable_bills_installment 
  ON payable_bills(installment_group_id, installment_number) 
  WHERE is_installment = true;

CREATE INDEX idx_payable_bills_upcoming 
  ON payable_bills(user_id, due_date, priority) 
  WHERE status = 'pending';;
