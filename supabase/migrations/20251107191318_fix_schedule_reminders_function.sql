-- Corrigir função schedule_bill_reminders para usar reminder_type correto
CREATE OR REPLACE FUNCTION schedule_bill_reminders(
  p_bill_id UUID,
  p_user_id UUID,
  p_days_before INTEGER[],
  p_channels TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bill RECORD;
  v_day INTEGER;
  v_channel TEXT;
  v_reminder_date DATE;
  v_created_count INTEGER := 0;
BEGIN
  -- Buscar conta
  SELECT * INTO v_bill FROM payable_bills 
  WHERE id = p_bill_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  -- Validar que não está vencida
  IF v_bill.due_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Não é possível criar lembretes para contas vencidas';
  END IF;
  
  -- Deletar lembretes antigos pendentes desta conta
  DELETE FROM bill_reminders 
  WHERE bill_id = p_bill_id AND status = 'pending';
  
  -- Criar novos lembretes
  FOREACH v_day IN ARRAY p_days_before LOOP
    v_reminder_date := v_bill.due_date - (v_day || ' days')::INTERVAL;
    
    -- Só criar se data futura ou hoje
    IF v_reminder_date >= CURRENT_DATE THEN
      FOREACH v_channel IN ARRAY p_channels LOOP
        INSERT INTO bill_reminders (
          bill_id, 
          user_id, 
          reminder_date, 
          reminder_time,
          days_before, 
          reminder_type,  -- Usar o channel como reminder_type
          channel, 
          status
        ) VALUES (
          p_bill_id, 
          p_user_id, 
          v_reminder_date, 
          '09:00:00'::TIME,
          v_day, 
          v_channel,  -- 'push', 'email', etc
          v_channel, 
          'pending'
        );
        
        v_created_count := v_created_count + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN v_created_count;
END;
$$;;
