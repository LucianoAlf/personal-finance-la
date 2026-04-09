CREATE OR REPLACE FUNCTION public.schedule_bill_reminders(
  p_bill_id uuid,
  p_user_id uuid,
  p_reminders jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reminder jsonb;
  v_days_before integer;
  v_time time;
  v_channel text;
  v_reminder_type text;
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

  FOR v_reminder IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_reminders, '[]'::jsonb))
  LOOP
    v_days_before := COALESCE((v_reminder->>'days_before')::integer, 0);
    v_time := COALESCE((v_reminder->>'time')::time, '09:00:00'::time);
    v_channel := COALESCE(NULLIF(v_reminder->>'channel', ''), 'whatsapp');
    v_reminder_type := CASE
      WHEN v_channel IN ('whatsapp', 'email', 'push', 'sms') THEN v_channel
      ELSE 'push'
    END;
    v_reminder_date := (v_bill_due_date - (v_days_before || ' days')::interval)::date;

    IF v_reminder_date > current_date_brasilia()
       OR (v_reminder_date = current_date_brasilia() AND v_time > current_time_brasilia()) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM bill_reminders existing_reminder
        WHERE existing_reminder.bill_id = p_bill_id
          AND existing_reminder.reminder_date = v_reminder_date
          AND existing_reminder.reminder_time = v_time
          AND existing_reminder.channel = v_channel
      ) THEN
        INSERT INTO bill_reminders (
          bill_id,
          user_id,
          reminder_date,
          reminder_time,
          reminder_type,
          sent_at,
          status,
          error_message,
          channel,
          retry_count,
          metadata,
          days_before,
          scheduled_time
        ) VALUES (
          p_bill_id,
          p_user_id,
          v_reminder_date,
          v_time,
          v_reminder_type,
          NULL,
          'pending',
          NULL,
          v_channel,
          0,
          jsonb_build_object('source', 'schedule_bill_reminders'),
          v_days_before,
          v_time
        );
      END IF;
    END IF;
  END LOOP;
END;
$function$;;
