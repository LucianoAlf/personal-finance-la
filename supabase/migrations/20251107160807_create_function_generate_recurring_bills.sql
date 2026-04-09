-- ============================================
-- FUNCTION: generate_recurring_bills()
-- ============================================

CREATE OR REPLACE FUNCTION generate_recurring_bills()
RETURNS TABLE(generated_count INTEGER, bills_created JSONB) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec_bill RECORD;
  new_due_date DATE;
  bills_array JSONB := '[]'::JSONB;
  total_generated INTEGER := 0;
  new_bill_id UUID;
  config JSONB;
BEGIN
  FOR rec_bill IN 
    SELECT * FROM payable_bills 
    WHERE is_recurring = true 
      AND parent_bill_id IS NULL
      AND (next_occurrence_date IS NULL OR next_occurrence_date <= CURRENT_DATE + INTERVAL '30 days')
      AND ((recurrence_config->>'end_date') IS NULL OR (recurrence_config->>'end_date')::DATE >= CURRENT_DATE)
      AND status != 'cancelled'
  LOOP
    config := rec_bill.recurrence_config;
    
    CASE (config->>'frequency')
      WHEN 'monthly' THEN
        new_due_date := (COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date) + INTERVAL '1 month')::DATE;
      WHEN 'bimonthly' THEN
        new_due_date := (COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date) + INTERVAL '2 months')::DATE;
      WHEN 'quarterly' THEN
        new_due_date := (COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date) + INTERVAL '3 months')::DATE;
      WHEN 'semiannual' THEN
        new_due_date := (COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date) + INTERVAL '6 months')::DATE;
      WHEN 'yearly' THEN
        new_due_date := (COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date) + INTERVAL '1 year')::DATE;
      ELSE
        new_due_date := (COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date) + INTERVAL '1 month')::DATE;
    END CASE;
    
    IF (config->>'day') IS NOT NULL THEN
      new_due_date := DATE_TRUNC('month', new_due_date) + ((config->>'day')::INTEGER - 1) * INTERVAL '1 day';
    END IF;
    
    IF (config->>'end_date') IS NULL OR new_due_date <= (config->>'end_date')::DATE THEN
      INSERT INTO payable_bills (
        user_id, description, amount, due_date, bill_type, provider_name, category_id,
        is_recurring, recurrence_config, parent_bill_id, reminder_enabled,
        reminder_days_before, reminder_channels, priority, payment_account_id,
        payment_method, tags, status
      ) VALUES (
        rec_bill.user_id, rec_bill.description || ' - ' || TO_CHAR(new_due_date, 'MM/YYYY'),
        rec_bill.amount, new_due_date, rec_bill.bill_type, rec_bill.provider_name,
        rec_bill.category_id, false, rec_bill.recurrence_config, rec_bill.id,
        rec_bill.reminder_enabled, rec_bill.reminder_days_before, rec_bill.reminder_channels,
        rec_bill.priority, rec_bill.payment_account_id, rec_bill.payment_method,
        rec_bill.tags, 'pending'
      ) RETURNING id INTO new_bill_id;
      
      bills_array := bills_array || JSONB_BUILD_OBJECT(
        'id', new_bill_id, 'description', rec_bill.description,
        'provider', rec_bill.provider_name, 'due_date', new_due_date, 'amount', rec_bill.amount
      );
      
      total_generated := total_generated + 1;
      
      UPDATE payable_bills 
      SET next_occurrence_date = new_due_date, updated_at = NOW()
      WHERE id = rec_bill.id;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT total_generated, bills_array;
END;
$$;;
