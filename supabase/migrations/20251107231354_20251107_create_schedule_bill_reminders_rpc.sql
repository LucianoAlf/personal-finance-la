CREATE OR REPLACE FUNCTION schedule_bill_reminders(
  p_bill_id uuid,
  p_user_id uuid,
  p_days_before integer[],
  p_times time[],
  p_channels text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due_date date;
  v_count integer := 0;
  v_day integer;
  v_time time;
  v_channel text;
  v_reminder_date date;
BEGIN
  IF p_days_before IS NULL OR array_length(p_days_before, 1) IS NULL THEN
    RAISE EXCEPTION 'p_days_before não pode ser vazio';
  END IF;
  IF p_times IS NULL OR array_length(p_times, 1) IS NULL THEN
    RAISE EXCEPTION 'p_times não pode ser vazio';
  END IF;
  IF array_length(p_days_before, 1) != array_length(p_times, 1) THEN
    RAISE EXCEPTION 'Arrays p_days_before e p_times devem ter mesmo tamanho';
  END IF;
  IF p_channels IS NULL OR array_length(p_channels, 1) IS NULL THEN
    RAISE EXCEPTION 'p_channels não pode ser vazio';
  END IF;

  SELECT due_date INTO v_due_date FROM payable_bills WHERE id = p_bill_id;
  IF v_due_date IS NULL THEN
    RAISE EXCEPTION 'Conta não encontrada: %', p_bill_id;
  END IF;

  DELETE FROM bill_reminders
  WHERE bill_id = p_bill_id AND user_id = p_user_id AND status = 'pending';

  FOR i IN 1..array_length(p_days_before, 1) LOOP
    v_day := p_days_before[i];
    v_time := p_times[i];
    v_reminder_date := v_due_date - (v_day || ' days')::interval;

    IF (v_reminder_date > CURRENT_DATE) OR (v_reminder_date = CURRENT_DATE AND v_time > CURRENT_TIME) THEN
      FOREACH v_channel IN ARRAY p_channels LOOP
        INSERT INTO bill_reminders (
          bill_id, user_id, reminder_date, reminder_time, days_before, channel, reminder_type, status, retry_count, created_at
        ) VALUES (
          p_bill_id, p_user_id, v_reminder_date, v_time, v_day, v_channel, v_channel, 'pending', 0, now()
        )
        ON CONFLICT DO NOTHING;
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION schedule_bill_reminders(uuid, uuid, integer[], time[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION schedule_bill_reminders(uuid, uuid, integer[], time[], text[]) TO authenticated, service_role;;
