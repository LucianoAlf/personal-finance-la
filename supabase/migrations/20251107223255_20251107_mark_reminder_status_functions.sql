-- Funções RPC para atualizar status de lembretes com segurança
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
      updated_at = now(),
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
      retry_count = LEAST(retry_count + 1, 3),
      error_message = p_error_message,
      updated_at = now()
  WHERE id = p_reminder_id;
END;
$$;

-- Permissões: somente authenticated e service executam
REVOKE ALL ON FUNCTION mark_reminder_sent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_reminder_failed(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_reminder_sent(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_reminder_failed(uuid, text) TO authenticated, service_role;;
