CREATE OR REPLACE FUNCTION public.send_proactive_whatsapp_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection RECORD;
  v_reminder RECORD;
  v_message text;
  v_phone text;
  v_request_id bigint;
  v_connections_scanned integer := 0;
  v_connections_skipped_missing_phone integer := 0;
  v_connections_skipped_missing_token integer := 0;
  v_reminders_seen integer := 0;
  v_sent integer := 0;
  v_failed integer := 0;
BEGIN
  FOR v_connection IN
    SELECT
      wc.user_id,
      wc.phone_number,
      wc.instance_token
    FROM public.whatsapp_connections wc
    WHERE wc.connected = true
      AND wc.status = 'connected'
  LOOP
    v_connections_scanned := v_connections_scanned + 1;

    IF v_connection.instance_token IS NULL OR btrim(v_connection.instance_token) = '' THEN
      v_connections_skipped_missing_token := v_connections_skipped_missing_token + 1;
      CONTINUE;
    END IF;

    v_phone := regexp_replace(coalesce(v_connection.phone_number, ''), '\D', '', 'g');
    IF v_phone = '' THEN
      v_connections_skipped_missing_phone := v_connections_skipped_missing_phone + 1;
      CONTINUE;
    ELSIF length(v_phone) = 11 THEN
      v_phone := '55' || v_phone;
    ELSIF length(v_phone) = 12 AND left(v_phone, 1) = '0' THEN
      v_phone := '55' || substring(v_phone FROM 2);
    END IF;

    FOR v_reminder IN
      SELECT *
      FROM public.get_pending_reminders() pr
      WHERE pr.user_id = v_connection.user_id
    LOOP
      v_reminders_seen := v_reminders_seen + 1;

      v_message := concat_ws(
        E'\n',
        '━━━━━━━━━━━━━━━━━━━',
        '🔔 *Lembrete Ana Clara*',
        '',
        format('Olá %s! 👋', coalesce(nullif(btrim(v_reminder.full_name), ''), '')),
        '',
        CASE
          WHEN v_reminder.days_before = 0 THEN '🔴 HOJE você tem uma conta a pagar:'
          WHEN v_reminder.days_before = 1 THEN '🟡 Amanhã você tem uma conta a pagar:'
          ELSE format('🟢 Daqui %s dias você tem uma conta a pagar:', v_reminder.days_before)
        END,
        '',
        format('📄 *%s*', coalesce(v_reminder.description, 'Conta a pagar')),
        format(
          '💰 Valor: *R$ %s*',
          trim(to_char(coalesce(v_reminder.amount, 0)::numeric, 'FM999G999G999G990D00'))
        ),
        format('📅 Vencimento: *%s*', to_char(v_reminder.due_date, 'DD/MM/YYYY')),
        CASE
          WHEN v_reminder.provider_name IS NOT NULL AND btrim(v_reminder.provider_name) <> ''
            THEN format('🏢 Fornecedor: %s', v_reminder.provider_name)
          ELSE NULL
        END,
        '',
        '⏰ *Não esqueça!*',
        '━━━━━━━━━━━━━━━━━━━',
        '💡 _Responda "pago" para marcar como paga_',
        '━━━━━━━━━━━━━━━━━━━'
      );

      BEGIN
        SELECT net.http_post(
          url := 'https://lamusic.uazapi.com/send/text',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'token', v_connection.instance_token
          ),
          body := jsonb_build_object(
            'number', v_phone,
            'text', v_message
          )
        )
        INTO v_request_id;

        PERFORM public.mark_reminder_sent(p_reminder_id := v_reminder.id);
        v_sent := v_sent + 1;
      EXCEPTION
        WHEN OTHERS THEN
          PERFORM public.mark_reminder_failed(
            p_reminder_id := v_reminder.id,
            p_error_message := SQLERRM
          );
          v_failed := v_failed + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'connections_scanned', v_connections_scanned,
    'connections_skipped_missing_phone', v_connections_skipped_missing_phone,
    'connections_skipped_missing_token', v_connections_skipped_missing_token,
    'reminders_seen', v_reminders_seen,
    'sent', v_sent,
    'failed', v_failed
  );
END;
$$;

COMMENT ON FUNCTION public.send_proactive_whatsapp_notifications() IS
  'Cron entrypoint for direct SQL WhatsApp bill reminders. Iterates only canonical whatsapp_connections rows where connected = true and status = connected, skips blank phone/token rows, uses only row instance_token, sends directly via net.http_post, and does not reference whatsapp_connection_status.';;
