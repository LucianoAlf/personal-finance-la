-- Dropar função antiga
DROP FUNCTION IF EXISTS get_pending_reminders();

-- Recriar com suporte a arrays
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    SELECT 
      np.user_id,
      COALESCE(np.bill_reminders_days_before_array, ARRAY[3]) as days_array,
      COALESCE(np.bill_reminders_time, '09:00:00'::time) as reminder_time,
      COALESCE(np.bill_reminders_enabled, true) as enabled,
      COALESCE(np.whatsapp_enabled, false) as whatsapp_enabled
    FROM notification_preferences np
  ),
  pending_bills AS (
    SELECT 
      pb.id as bill_id,
      pb.user_id,
      pb.description,
      pb.amount,
      pb.due_date,
      pb.provider_name
    FROM payable_bills pb
    WHERE pb.status != 'paid'
      AND pb.due_date >= CURRENT_DATE
  )
  SELECT 
    gen_random_uuid() as id,
    pb.bill_id,
    pb.user_id,
    CURRENT_DATE as reminder_date,
    up.reminder_time as reminder_time,
    (pb.due_date - CURRENT_DATE)::integer as days_before,
    'whatsapp'::text as channel,
    0 as retry_count,
    pb.description,
    pb.amount,
    pb.due_date,
    pb.provider_name,
    u.phone,
    u.full_name
  FROM pending_bills pb
  JOIN user_preferences up ON up.user_id = pb.user_id
  JOIN users u ON u.id = pb.user_id
  WHERE up.enabled = true
    AND up.whatsapp_enabled = true
    AND (pb.due_date - CURRENT_DATE)::integer = ANY(up.days_array)
    AND up.reminder_time <= CURRENT_TIME
    AND u.phone IS NOT NULL
  ORDER BY pb.due_date ASC, up.reminder_time ASC
  LIMIT 100;
END;
$$;;
