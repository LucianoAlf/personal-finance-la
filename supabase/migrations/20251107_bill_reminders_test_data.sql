-- ============================================
-- SEED: Dados de Teste para Bill Reminders
-- Data: 2025-11-07
-- Uso: Testar function schedule_bill_reminders
-- ============================================

-- NOTA: Execute apenas em ambiente de desenvolvimento!

DO $$
DECLARE
  v_user_id uuid;
  v_bill_id_1 uuid;
  v_bill_id_2 uuid;
  v_bill_id_3 uuid;
  v_result integer;
BEGIN
  -- Obter um user_id existente (primeiro da tabela)
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado. Crie um usuário primeiro.';
  END IF;

  RAISE NOTICE 'Usando user_id: %', v_user_id;

  -- ========================================
  -- TESTE 1: Conta com múltiplos lembretes
  -- ========================================
  INSERT INTO payable_bills (
    user_id,
    description,
    amount,
    due_date,
    bill_type,
    provider_name,
    status,
    priority,
    reminder_enabled,
    is_recurring,
    is_installment
  ) VALUES (
    v_user_id,
    'Aluguel - Novembro 2025',
    2800.00,
    CURRENT_DATE + INTERVAL '10 days',  -- Vence daqui 10 dias
    'housing',
    'Imobiliária Prime',
    'pending',
    'high',
    true,
    false,
    false
  )
  RETURNING id INTO v_bill_id_1;

  -- Agendar 4 lembretes com horários diferentes
  SELECT schedule_bill_reminders(
    v_bill_id_1,
    v_user_id,
    ARRAY[7, 3, 1, 0],  -- 7 dias antes, 3 dias, 1 dia, no dia
    ARRAY['09:00', '09:00', '14:00', '08:00']::time[],
    ARRAY['whatsapp', 'email']  -- 2 canais
  ) INTO v_result;

  RAISE NOTICE 'Teste 1 - Aluguel: % lembretes criados (esperado: 8)', v_result;

  -- ========================================
  -- TESTE 2: Conta com 1 lembrete simples
  -- ========================================
  INSERT INTO payable_bills (
    user_id,
    description,
    amount,
    due_date,
    bill_type,
    provider_name,
    status,
    priority,
    reminder_enabled,
    is_recurring,
    is_installment
  ) VALUES (
    v_user_id,
    'Netflix - Novembro 2025',
    45.90,
    CURRENT_DATE + INTERVAL '5 days',
    'subscription',
    'Netflix',
    'pending',
    'low',
    true,
    false,
    false
  )
  RETURNING id INTO v_bill_id_2;

  -- Apenas 1 lembrete no dia, 9h, WhatsApp
  SELECT schedule_bill_reminders(
    v_bill_id_2,
    v_user_id,
    ARRAY[0],  -- No dia
    ARRAY['09:00']::time[],
    ARRAY['whatsapp']
  ) INTO v_result;

  RAISE NOTICE 'Teste 2 - Netflix: % lembrete criado (esperado: 1)', v_result;

  -- ========================================
  -- TESTE 3: Conta vencida (não deve criar lembretes)
  -- ========================================
  INSERT INTO payable_bills (
    user_id,
    description,
    amount,
    due_date,
    bill_type,
    status,
    priority,
    reminder_enabled,
    is_recurring,
    is_installment
  ) VALUES (
    v_user_id,
    'Conta de Luz - Outubro 2025 (vencida)',
    250.00,
    CURRENT_DATE - INTERVAL '5 days',  -- Venceu há 5 dias
    'service',
    'overdue',
    'medium',
    true,
    false,
    false
  )
  RETURNING id INTO v_bill_id_3;

  -- Tentar agendar (não deve criar nenhum)
  SELECT schedule_bill_reminders(
    v_bill_id_3,
    v_user_id,
    ARRAY[1, 0],
    ARRAY['09:00', '09:00']::time[],
    ARRAY['whatsapp']
  ) INTO v_result;

  RAISE NOTICE 'Teste 3 - Conta vencida: % lembretes criados (esperado: 0)', v_result;

  -- ========================================
  -- VERIFICAR RESULTADOS
  -- ========================================
  RAISE NOTICE '=======================================';
  RAISE NOTICE 'RESUMO DOS TESTES:';
  RAISE NOTICE '=======================================';
  
  RAISE NOTICE 'Total de lembretes criados: %', (SELECT COUNT(*) FROM bill_reminders WHERE user_id = v_user_id);
  RAISE NOTICE 'Lembretes pendentes: %', (SELECT COUNT(*) FROM bill_reminders WHERE user_id = v_user_id AND status = 'pending');
  RAISE NOTICE 'Canais WhatsApp: %', (SELECT COUNT(*) FROM bill_reminders WHERE user_id = v_user_id AND channel = 'whatsapp');
  RAISE NOTICE 'Canais Email: %', (SELECT COUNT(*) FROM bill_reminders WHERE user_id = v_user_id AND channel = 'email');
  
  RAISE NOTICE '=======================================';
  RAISE NOTICE 'Detalhes dos lembretes:';
  RAISE NOTICE '=======================================';

  -- Exibir detalhes
  FOR v_bill_id_1 IN 
    SELECT 
      br.id,
      pb.description,
      br.days_before,
      br.reminder_date,
      br.reminder_time,
      br.channel,
      br.status
    FROM bill_reminders br
    JOIN payable_bills pb ON pb.id = br.bill_id
    WHERE br.user_id = v_user_id
    ORDER BY br.reminder_date, br.reminder_time, br.channel
  LOOP
    RAISE NOTICE '% | % dias antes | Data: % às % | Canal: % | Status: %',
      v_bill_id_1.description,
      v_bill_id_1.days_before,
      v_bill_id_1.reminder_date,
      v_bill_id_1.reminder_time,
      v_bill_id_1.channel,
      v_bill_id_1.status;
  END LOOP;

END $$;

-- Query para visualizar lembretes criados
SELECT 
  pb.description as conta,
  pb.due_date as vencimento,
  br.days_before as dias_antes,
  br.reminder_date as data_lembrete,
  br.reminder_time as horario,
  br.channel as canal,
  br.status,
  br.created_at
FROM bill_reminders br
JOIN payable_bills pb ON pb.id = br.bill_id
ORDER BY br.reminder_date, br.reminder_time, br.channel;
