CREATE OR REPLACE FUNCTION mark_reminder_sent(p_reminder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bill_reminders
  SET status = 'sent',
      sent_at = now(),
      error_message = NULL
  WHERE id = p_reminder_id;
END;
$$;

CREATE OR REPLACE FUNCTION mark_reminder_failed(p_reminder_id uuid, p_error_message text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE bill_reminders
  SET status = 'failed',
      retry_count = LEAST(COALESCE(retry_count,0) + 1, 3),
      error_message = p_error_message
  WHERE id = p_reminder_id;
END;
$$;;
