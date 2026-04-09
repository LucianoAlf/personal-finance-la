-- Migration: Substituir função de lembretes para suportar horários personalizados

-- Dropar função antiga
DROP FUNCTION IF EXISTS schedule_bill_reminders(uuid, uuid, integer[], text[]);

-- Criar nova função com suporte a múltiplos lembretes e horários
CREATE OR REPLACE FUNCTION schedule_bill_reminders(
  p_bill_id UUID,
  p_user_id UUID,
  p_reminders JSONB  -- Array de {days_before, time, channels[]}
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bill RECORD;
  v_reminder JSONB;
  v_days_before INTEGER;
  v_time TIME;
  v_channels TEXT[];
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
  
  -- Deletar lembretes pendentes antigos desta conta
  DELETE FROM bill_reminders 
  WHERE bill_id = p_bill_id AND status = 'pending';
  
  -- Criar novos lembretes
  FOR v_reminder IN SELECT * FROM jsonb_array_elements(p_reminders)
  LOOP
    -- Extrair dados do reminder
    v_days_before := (v_reminder->>'days_before')::INTEGER;
    v_time := (v_reminder->>'time')::TIME;
    v_channels := ARRAY(SELECT jsonb_array_elements_text(v_reminder->'channels'));
    
    -- Calcular data do lembrete
    v_reminder_date := v_bill.due_date - (v_days_before || ' days')::INTERVAL;
    
    -- Só criar se data futura ou hoje
    IF v_reminder_date >= CURRENT_DATE THEN
      -- Para cada canal
      FOREACH v_channel IN ARRAY v_channels
      LOOP
        INSERT INTO bill_reminders (
          bill_id, 
          user_id, 
          reminder_date, 
          reminder_time,
          scheduled_time,
          days_before, 
          reminder_type,
          channel, 
          status
        ) VALUES (
          p_bill_id, 
          p_user_id, 
          v_reminder_date, 
          v_time,
          v_time,
          v_days_before, 
          v_channel,
          v_channel, 
          'pending'
        );
        
        v_created_count := v_created_count + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN v_created_count;
END;
$$;

COMMENT ON FUNCTION schedule_bill_reminders IS 'Agenda múltiplos lembretes para uma conta com horários personalizados';;
