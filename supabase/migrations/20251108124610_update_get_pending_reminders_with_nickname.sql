-- Atualizar função para incluir nickname
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
  full_name text,
  nickname text
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
    u.full_name,
    u.nickname
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

COMMENT ON FUNCTION get_pending_reminders IS 'Busca lembretes pendentes com nickname do usuário';;
