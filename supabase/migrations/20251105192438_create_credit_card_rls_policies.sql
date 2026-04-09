-- Habilitar RLS em todas as tabelas
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: credit_cards
-- ============================================
CREATE POLICY "Users can view own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: credit_card_invoices
-- ============================================
CREATE POLICY "Users can view own invoices"
  ON credit_card_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON credit_card_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON credit_card_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON credit_card_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: credit_card_transactions
-- ============================================
CREATE POLICY "Users can view own cc transactions"
  ON credit_card_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cc transactions"
  ON credit_card_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cc transactions"
  ON credit_card_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cc transactions"
  ON credit_card_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: credit_card_payments
-- ============================================
CREATE POLICY "Users can view own payments"
  ON credit_card_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
  ON credit_card_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
  ON credit_card_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments"
  ON credit_card_payments FOR DELETE
  USING (auth.uid() = user_id);;
