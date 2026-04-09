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
      )
      ON CONFLICT (bill_id, reminder_date, reminder_time, channel) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

DROP FUNCTION IF EXISTS public.generate_recurring_bills();

CREATE FUNCTION public.generate_recurring_bills(
  p_horizon_days integer DEFAULT 120
)
RETURNS TABLE(generated_count integer, bills_created jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  rec_bill RECORD;
  new_due_date date;
  last_materialized_due_date date;
  bills_array jsonb := '[]'::jsonb;
  total_generated integer := 0;
  new_bill_id uuid;
  config jsonb;
  horizon_date date := current_date + GREATEST(COALESCE(p_horizon_days, 120), 30);
  reminder_payload jsonb;
BEGIN
  FOR rec_bill IN
    SELECT *
    FROM payable_bills
    WHERE is_recurring = true
      AND parent_bill_id IS NULL
      AND status != 'cancelled'
      AND recurrence_config IS NOT NULL
      AND ((recurrence_config->>'end_date') IS NULL OR (recurrence_config->>'end_date')::date >= current_date)
  LOOP
    config := rec_bill.recurrence_config;
    last_materialized_due_date := COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date);

    LOOP
      CASE (config->>'frequency')
        WHEN 'monthly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '1 month')::date;
        WHEN 'bimonthly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '2 months')::date;
        WHEN 'quarterly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '3 months')::date;
        WHEN 'semiannual' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '6 months')::date;
        WHEN 'yearly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '1 year')::date;
        ELSE
          new_due_date := (last_materialized_due_date + INTERVAL '1 month')::date;
      END CASE;

      IF (config->>'day') IS NOT NULL THEN
        new_due_date := (date_trunc('month', new_due_date)::date + ((config->>'day')::integer - 1))::date;
      END IF;

      EXIT WHEN new_due_date > horizon_date;
      EXIT WHEN (config->>'end_date') IS NOT NULL AND new_due_date > (config->>'end_date')::date;

      IF NOT EXISTS (
        SELECT 1
        FROM payable_bills existing_bill
        WHERE existing_bill.user_id = rec_bill.user_id
          AND existing_bill.parent_bill_id = rec_bill.id
          AND existing_bill.due_date = new_due_date
      ) THEN
        INSERT INTO payable_bills (
          user_id,
          description,
          amount,
          due_date,
          bill_type,
          provider_name,
          category_id,
          is_recurring,
          recurrence_config,
          parent_bill_id,
          reminder_enabled,
          reminder_days_before,
          reminder_channels,
          priority,
          payment_account_id,
          payment_method,
          tags,
          status
        ) VALUES (
          rec_bill.user_id,
          rec_bill.description || ' - ' || TO_CHAR(new_due_date, 'MM/YYYY'),
          rec_bill.amount,
          new_due_date,
          rec_bill.bill_type,
          rec_bill.provider_name,
          rec_bill.category_id,
          false,
          rec_bill.recurrence_config,
          rec_bill.id,
          rec_bill.reminder_enabled,
          rec_bill.reminder_days_before,
          rec_bill.reminder_channels,
          rec_bill.priority,
          rec_bill.payment_account_id,
          rec_bill.payment_method,
          rec_bill.tags,
          'pending'
        ) RETURNING id INTO new_bill_id;

        IF rec_bill.reminder_enabled THEN
          SELECT COALESCE(
            (
              SELECT jsonb_agg(reminder_row.reminder)
              FROM (
                SELECT DISTINCT jsonb_build_object(
                  'days_before', br.days_before,
                  'time', to_char(br.reminder_time, 'HH24:MI:SS'),
                  'channel', br.channel
                ) AS reminder
                FROM bill_reminders br
                WHERE br.bill_id = rec_bill.id
              ) AS reminder_row
            ),
            '[]'::jsonb
          ) INTO reminder_payload;

          IF jsonb_array_length(reminder_payload) = 0 THEN
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'days_before', COALESCE(rec_bill.reminder_days_before, 1),
                  'time', '09:00:00',
                  'channel', reminder_channel
                )
              ),
              '[]'::jsonb
            ) INTO reminder_payload
            FROM unnest(COALESCE(rec_bill.reminder_channels, ARRAY['whatsapp'])) AS reminder_channel;
          END IF;

          IF jsonb_array_length(reminder_payload) > 0 THEN
            PERFORM public.schedule_bill_reminders(new_bill_id, rec_bill.user_id, reminder_payload);
          END IF;
        END IF;

        bills_array := bills_array || jsonb_build_object(
          'id', new_bill_id,
          'template_id', rec_bill.id,
          'description', rec_bill.description,
          'provider', rec_bill.provider_name,
          'due_date', new_due_date,
          'amount', rec_bill.amount
        );

        total_generated := total_generated + 1;
      END IF;

      last_materialized_due_date := new_due_date;
    END LOOP;

    UPDATE payable_bills
    SET next_occurrence_date = last_materialized_due_date,
        updated_at = NOW()
    WHERE id = rec_bill.id;
  END LOOP;

  RETURN QUERY
  SELECT total_generated, bills_array;
END;
$function$;;
