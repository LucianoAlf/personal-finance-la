-- ============================================
-- TESTE: Criar lembrete que dispara em 2 minutos
-- Data: 2025-11-07
-- Descrição: Script para testar envio via WhatsApp
-- ============================================

-- IMPORTANTE: Substituir '<seu_user_id>' pelo seu user_id real antes de executar

DO $$
DECLARE
  v_user_id uuid := '<seu_user_id>'; -- SUBSTITUIR AQUI!
  v_bill_id uuid;
  v_test_time time;
  v_reminders_created integer;
BEGIN
  -- 1. Calcular horário: AGORA + 2 minutos
  v_test_time := (CURRENT_TIME + INTERVAL '2 minutes')::time;
  
  RAISE NOTICE '⏰ Horário do teste: %', v_test_time;
  
  -- 2. Criar conta de teste (vence amanhã)
  INSERT INTO payable_bills (
    user_id,
    description,
    amount,
    due_date,
    bill_type,
    status,
    priority,
    created_at
  ) VALUES (
    v_user_id,
    '🧪 TESTE - Lembrete WhatsApp',
    99.90,
    CURRENT_DATE + 1,  -- Vence amanhã
    'other',
    'pending',
    'high',
    now()
  )
  RETURNING id INTO v_bill_id;
  
  RAISE NOTICE '✅ Conta teste criada: %', v_bill_id;
  
  -- 3. Agendar lembrete para daqui 2 minutos
  SELECT schedule_bill_reminders(
    v_bill_id,
    v_user_id,
    ARRAY[0],  -- "No dia" (mas na verdade daqui 2 minutos)
    ARRAY[v_test_time],
    ARRAY['whatsapp']
  ) INTO v_reminders_created;
  
  RAISE NOTICE '✅ % lembrete(s) agendado(s) para %', v_reminders_created, v_test_time;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Deploy da Edge Function: supabase functions deploy send-bill-reminders';
  RAISE NOTICE '2. Configurar CRON Job no Dashboard';
  RAISE NOTICE '3. Aguardar 2 minutos';
  RAISE NOTICE '4. CRON executa e envia mensagem WhatsApp';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Verificar WhatsApp para mensagem de teste!';
  RAISE NOTICE '';
  
  -- 4. Exibir detalhes do lembrete
  RAISE NOTICE '📋 DETALHES DO LEMBRETE:';
  RAISE NOTICE '   Bill ID: %', v_bill_id;
  RAISE NOTICE '   Reminder Time: %', v_test_time;
  RAISE NOTICE '   Current Time: %', CURRENT_TIME;
  
END $$;

-- Query para verificar o lembrete criado
SELECT 
  br.id,
  br.reminder_date,
  br.reminder_time,
  br.status,
  br.channel,
  pb.description,
  pb.amount,
  u.full_name,
  u.phone
FROM bill_reminders br
JOIN payable_bills pb ON pb.id = br.bill_id
JOIN users u ON u.id = br.user_id
WHERE pb.description LIKE '%TESTE%'
ORDER BY br.created_at DESC
LIMIT 1;
