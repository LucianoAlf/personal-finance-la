-- ============================================
-- RLS POLICIES: payable_bills
-- ============================================

ALTER TABLE payable_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills"
  ON payable_bills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bills"
  ON payable_bills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bills"
  ON payable_bills FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bills"
  ON payable_bills FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: bill_payment_history
-- ============================================

ALTER TABLE bill_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history"
  ON bill_payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history"
  ON bill_payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: bill_reminders
-- ============================================

ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON bill_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON bill_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON bill_reminders FOR UPDATE
  USING (auth.uid() = user_id);;
