-- ============================================
-- MIGRATION: Configurar Timezone Brasil (UTC-3)
-- Data: 2025-11-08
-- ============================================

-- 1. CONFIGURAR TIMEZONE PADRÃO DO DATABASE
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';

-- 2. RECRIAR FUNÇÃO get_pending_reminders COM TIMEZONE CORRETO
DROP FUNCTION IF EXISTS get_pending_reminders();

CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
  id uuid,
  bill_id uuid,
  user_id uuid,
  reminder_date date,
  reminder_time time,
  days_before integer,
  channel text,
  retry_count integer,
  description varchar(255),
  amount numeric,
  due_date date,
  provider_name varchar(255),
  phone text,
  email text,
  full_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    br.id,
    br.bill_id,
    br.user_id,
    br.reminder_date,
    br.reminder_time,
    br.days_before,
    br.channel,
    br.retry_count,
    pb.description,
    pb.amount,
    pb.due_date,
    pb.provider_name,
    u.phone,
    u.email,
    u.full_name
  FROM bill_reminders br
  JOIN payable_bills pb ON pb.id = br.bill_id
  JOIN users u ON u.id = br.user_id
  WHERE br.status = 'pending'
    AND br.reminder_date = (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo')::date
    AND br.reminder_time <= (CURRENT_TIME AT TIME ZONE 'America/Sao_Paulo')::time + INTERVAL '10 minutes'
    AND br.retry_count < 3
    AND pb.status != 'paid'
  ORDER BY br.reminder_time ASC
  LIMIT 100;
$$;

-- 3. FUNÇÕES AUXILIARES PARA TIMEZONE BRASÍLIA
CREATE OR REPLACE FUNCTION now_brasilia()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
$$;

CREATE OR REPLACE FUNCTION current_date_brasilia()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

CREATE OR REPLACE FUNCTION current_time_brasilia()
RETURNS time
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::time;
$$;

-- 4. DROPAR AMBAS VERSÕES DA FUNÇÃO schedule_bill_reminders
DROP FUNCTION IF EXISTS schedule_bill_reminders(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS schedule_bill_reminders(uuid, uuid, integer[], time[], text[]);

-- 5. RECRIAR FUNÇÃO schedule_bill_reminders COM TIMEZONE BRASIL
CREATE OR REPLACE FUNCTION schedule_bill_reminders(
  p_bill_id uuid,
  p_user_id uuid,
  p_reminders jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder jsonb;
  v_days_before integer;
  v_time time;
  v_channel text;
  v_reminder_date date;
  v_bill_due_date date;
BEGIN
  SELECT due_date INTO v_bill_due_date
  FROM payable_bills
  WHERE id = p_bill_id AND user_id = p_user_id;

  IF v_bill_due_date IS NULL THEN
    RAISE EXCEPTION 'Conta não encontrada ou não pertence ao usuário';
  END IF;

  DELETE FROM bill_reminders
  WHERE bill_id = p_bill_id AND status = 'pending';

  FOR v_reminder IN SELECT * FROM jsonb_array_elements(p_reminders)
  LOOP
    v_days_before := (v_reminder->>'days_before')::integer;
    v_time := (v_reminder->>'time')::time;
    v_channel := v_reminder->>'channel';
    v_reminder_date := v_bill_due_date - (v_days_before || ' days')::interval;

    IF v_reminder_date > current_date_brasilia() OR 
       (v_reminder_date = current_date_brasilia() AND v_time > current_time_brasilia()) THEN
      
      INSERT INTO bill_reminders (
        bill_id, user_id, reminder_date, reminder_time, days_before,
        channel, status, retry_count, scheduled_time
      ) VALUES (
        p_bill_id, p_user_id, v_reminder_date, v_time, v_days_before,
        v_channel, 'pending', 0, NOW() AT TIME ZONE 'America/Sao_Paulo'
      );
    END IF;
  END LOOP;
END;
$$;

-- 6. VIEW PARA MONITORAR LEMBRETES
CREATE OR REPLACE VIEW v_reminders_brasilia AS
SELECT 
  br.id,
  br.bill_id,
  pb.description AS bill_description,
  br.reminder_date,
  br.reminder_time,
  br.channel,
  br.status,
  u.full_name,
  u.email,
  current_date_brasilia() AS today_brasilia,
  current_time_brasilia() AS now_brasilia,
  CASE 
    WHEN br.reminder_date < current_date_brasilia() THEN 'Atrasado'
    WHEN br.reminder_date = current_date_brasilia() AND br.reminder_time <= current_time_brasilia() THEN 'Pronto'
    WHEN br.reminder_date = current_date_brasilia() THEN 'Hoje'
    ELSE 'Futuro'
  END AS status_timing
FROM bill_reminders br
JOIN payable_bills pb ON pb.id = br.bill_id
JOIN users u ON u.id = br.user_id
ORDER BY br.reminder_date, br.reminder_time;;
