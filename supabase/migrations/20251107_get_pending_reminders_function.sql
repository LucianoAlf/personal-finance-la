-- ============================================
-- MIGRATION: Function get_pending_reminders
-- Data: 2025-11-07
-- Descrição: Function auxiliar para buscar lembretes pendentes (usada pela Edge Function)
-- ============================================

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
  description text,
  amount numeric,
  due_date date,
  provider_name text,
  phone text,
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
    u.full_name
  FROM bill_reminders br
  JOIN payable_bills pb ON pb.id = br.bill_id
  JOIN users u ON u.id = br.user_id
  WHERE br.status = 'pending'
    AND br.reminder_date = CURRENT_DATE
    AND br.reminder_time <= CURRENT_TIME
    AND br.channel = 'whatsapp'
    AND br.retry_count < 3
    AND pb.status != 'paid'  -- Não enviar se conta já foi paga
  ORDER BY br.reminder_time ASC
  LIMIT 100;
$$;

COMMENT ON FUNCTION get_pending_reminders IS 'Busca lembretes pendentes para envio - usado pela Edge Function send-bill-reminders';
