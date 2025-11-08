-- ============================================
-- MIGRATION: Fix schedule_bill_reminders - Sobrecarga Simplificada
-- Data: 2025-11-08
-- Descrição: Adiciona sobrecarga da função schedule_bill_reminders que aceita
--            apenas days_before e channels (sem times), usando 09:00 como padrão
-- ============================================

-- SOBRECARGA SIMPLIFICADA: sem array de times
-- Esta versão usa 09:00 como horário padrão para todos os lembretes
CREATE OR REPLACE FUNCTION schedule_bill_reminders(
  p_bill_id uuid,
  p_user_id uuid,
  p_days_before integer[],
  p_channels text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_times time[];
  v_i integer;
BEGIN
  -- Validações
  IF p_days_before IS NULL OR array_length(p_days_before, 1) IS NULL THEN
    RAISE EXCEPTION 'p_days_before não pode ser vazio';
  END IF;

  IF p_channels IS NULL OR array_length(p_channels, 1) IS NULL THEN
    RAISE EXCEPTION 'p_channels não pode ser vazio';
  END IF;

  -- Criar array de times com 09:00 para cada dia
  v_times := ARRAY[]::time[];
  FOR v_i IN 1..array_length(p_days_before, 1) LOOP
    v_times := array_append(v_times, '09:00:00'::time);
  END LOOP;

  -- Chamar função principal com times padrão
  RETURN schedule_bill_reminders(
    p_bill_id,
    p_user_id,
    p_days_before,
    v_times,
    p_channels
  );
END;
$$;

-- Comentário
COMMENT ON FUNCTION schedule_bill_reminders(uuid, uuid, integer[], text[]) IS
  'Sobrecarga simplificada - agenda lembretes às 09:00 para os dias e canais especificados';

-- Exemplo de uso:
-- SELECT schedule_bill_reminders(
--   '<bill_id>',
--   '<user_id>',
--   ARRAY[7, 3, 1, 0],           -- dias antes
--   ARRAY['whatsapp', 'email']   -- canais
-- );
-- Resultado: 8 lembretes (4 dias x 2 canais), todos às 09:00
