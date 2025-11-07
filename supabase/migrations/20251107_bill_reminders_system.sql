-- ============================================
-- MIGRATION: Sistema de Lembretes Flexível
-- Data: 2025-11-07
-- Descrição: Tabela bill_reminders + Function schedule_bill_reminders
-- ============================================

-- 1. CRIAR TABELA bill_reminders
CREATE TABLE IF NOT EXISTS bill_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES payable_bills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Agendamento
  reminder_date date NOT NULL,
  reminder_time time NOT NULL DEFAULT '09:00:00',
  days_before integer NOT NULL CHECK (days_before >= 0 AND days_before <= 30),
  
  -- Canal
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'email', 'push', 'sms')),
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamp with time zone,
  
  -- Retry
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),
  error_message text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Constraint: não duplicar reminder para mesmo bill+data+hora+canal
  CONSTRAINT unique_bill_reminder UNIQUE (bill_id, reminder_date, reminder_time, channel)
);

-- 2. ÍNDICES DE PERFORMANCE
CREATE INDEX idx_bill_reminders_user ON bill_reminders(user_id);
CREATE INDEX idx_bill_reminders_bill ON bill_reminders(bill_id);
CREATE INDEX idx_bill_reminders_channel ON bill_reminders(channel);

-- Índice composto para buscar lembretes pendentes (usado pelo N8N)
CREATE INDEX idx_bill_reminders_pending ON bill_reminders(reminder_date, reminder_time, status)
  WHERE status = 'pending';

-- Índice para lembretes que falharam e podem ser retentados
CREATE INDEX idx_bill_reminders_retry ON bill_reminders(status, retry_count, reminder_date)
  WHERE status = 'failed' AND retry_count < 3;

-- 3. TRIGGER para updated_at
CREATE OR REPLACE FUNCTION update_bill_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bill_reminders_updated_at
  BEFORE UPDATE ON bill_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_reminders_updated_at();

-- 4. RLS POLICIES
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios lembretes
CREATE POLICY "Users can view own bill_reminders"
  ON bill_reminders FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir lembretes para suas contas
CREATE POLICY "Users can insert own bill_reminders"
  ON bill_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus lembretes
CREATE POLICY "Users can update own bill_reminders"
  ON bill_reminders FOR UPDATE
  USING (auth.uid() = user_id);

-- Usuários podem deletar seus lembretes
CREATE POLICY "Users can delete own bill_reminders"
  ON bill_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- 5. FUNCTION: schedule_bill_reminders (com horários customizados)
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
  v_now timestamp := now();
BEGIN
  -- Validações
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

  -- Buscar due_date da conta
  SELECT due_date INTO v_due_date
  FROM payable_bills
  WHERE id = p_bill_id;

  IF v_due_date IS NULL THEN
    RAISE EXCEPTION 'Conta não encontrada: %', p_bill_id;
  END IF;

  -- Deletar lembretes pendentes anteriores (caso seja edição)
  DELETE FROM bill_reminders
  WHERE bill_id = p_bill_id
    AND user_id = p_user_id
    AND status = 'pending';

  -- Inserir novos lembretes (combinação dias x canais)
  FOR i IN 1..array_length(p_days_before, 1) LOOP
    v_day := p_days_before[i];
    v_time := p_times[i];
    v_reminder_date := v_due_date - (v_day || ' days')::interval;
    
    -- Só criar se:
    -- 1. Data futura OU data hoje mas horário futuro
    -- 2. Não ultrapassou data de vencimento
    IF (v_reminder_date > CURRENT_DATE) OR 
       (v_reminder_date = CURRENT_DATE AND v_time > CURRENT_TIME) THEN
      
      -- Para cada canal configurado
      FOREACH v_channel IN ARRAY p_channels LOOP
        BEGIN
          INSERT INTO bill_reminders (
            bill_id,
            user_id,
            reminder_date,
            reminder_time,
            days_before,
            channel,
            status,
            retry_count,
            created_at
          ) VALUES (
            p_bill_id,
            p_user_id,
            v_reminder_date,
            v_time,
            v_day,
            v_channel,
            'pending',
            0,
            v_now
          )
          ON CONFLICT (bill_id, reminder_date, reminder_time, channel)
          DO NOTHING; -- Ignorar se já existe
          
          v_count := v_count + 1;
          
        EXCEPTION
          WHEN OTHERS THEN
            -- Log error mas continua para próximos
            RAISE NOTICE 'Erro ao inserir lembrete: %', SQLERRM;
        END;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Comentários
COMMENT ON TABLE bill_reminders IS 'Lembretes agendados para contas a pagar com suporte a múltiplos canais e horários';
COMMENT ON FUNCTION schedule_bill_reminders IS 'Agenda lembretes flexíveis para uma conta - aceita arrays de dias, horários e canais';

-- Exemplo de uso:
-- SELECT schedule_bill_reminders(
--   '<bill_id>',
--   '<user_id>',
--   ARRAY[7, 3, 1, 0],  -- dias antes
--   ARRAY['09:00', '09:00', '14:00', '08:00']::time[],  -- horários
--   ARRAY['whatsapp', 'email']  -- canais
-- );
-- Resultado: 8 lembretes (4 dias x 2 canais)
