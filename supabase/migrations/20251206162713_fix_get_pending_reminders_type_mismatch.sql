-- Corrigir função get_pending_reminders() - Type mismatch em varchar vs text
-- Problema: colunas varchar(255) não batem com tipo de retorno text

CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
    id uuid,
    bill_id uuid,
    user_id uuid,
    reminder_date date,
    reminder_time time without time zone,
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
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    -- Buscar preferências de cada usuário
    SELECT 
      np.user_id,
      COALESCE(np.bill_reminders_days_before_array, ARRAY[3]) as days_array,
      COALESCE(np.bill_reminders_time, '09:00:00'::time) as pref_reminder_time,
      COALESCE(np.bill_reminders_enabled, true) as enabled,
      COALESCE(np.whatsapp_enabled, false) as whatsapp_enabled
    FROM notification_preferences np
  ),
  pending_bills AS (
    -- Buscar contas pendentes
    SELECT 
      pb.id as pb_bill_id,
      pb.user_id as pb_user_id,
      pb.description as pb_description,
      pb.amount as pb_amount,
      pb.due_date as pb_due_date,
      pb.provider_name as pb_provider_name
    FROM payable_bills pb
    WHERE pb.status != 'paid'
      AND pb.due_date >= CURRENT_DATE
  )
  SELECT 
    gen_random_uuid() as id,
    pb.pb_bill_id as bill_id,
    pb.pb_user_id as user_id,
    CURRENT_DATE as reminder_date,
    up.pref_reminder_time as reminder_time,
    (pb.pb_due_date - CURRENT_DATE)::integer as days_before,
    'whatsapp'::text as channel,
    0 as retry_count,
    pb.pb_description::text as description,  -- Cast explícito para text
    pb.pb_amount as amount,
    pb.pb_due_date as due_date,
    pb.pb_provider_name::text as provider_name,  -- Cast explícito para text
    u.phone::text as phone,  -- Cast explícito para text
    u.full_name::text as full_name  -- Cast explícito para text
  FROM pending_bills pb
  JOIN user_preferences up ON up.user_id = pb.pb_user_id
  JOIN users u ON u.id = pb.pb_user_id
  WHERE up.enabled = true
    AND up.whatsapp_enabled = true
    -- Verifica se hoje é um dia de lembrete (baseado no array)
    AND (pb.pb_due_date - CURRENT_DATE)::integer = ANY(up.days_array)
    -- Verifica se já passou do horário configurado
    AND up.pref_reminder_time <= CURRENT_TIME
    -- Usuário tem telefone
    AND u.phone IS NOT NULL
  ORDER BY pb.pb_due_date ASC, up.pref_reminder_time ASC
  LIMIT 100;
END;
$$;

-- Adicionar comentário
COMMENT ON FUNCTION get_pending_reminders() IS 'Retorna lembretes pendentes de contas a pagar. Corrigido em 06/12/2025 - type mismatch varchar vs text';;
