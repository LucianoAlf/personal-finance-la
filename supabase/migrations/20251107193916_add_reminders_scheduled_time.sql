-- Migration: Adicionar horário personalizado aos lembretes
-- Permite configurar horário específico para cada lembrete

-- Adicionar coluna de horário agendado
ALTER TABLE bill_reminders 
ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT '09:00:00';

-- Comentário
COMMENT ON COLUMN bill_reminders.scheduled_time IS 'Horário do dia para envio do lembrete (formato 24h)';

-- Índice composto para busca eficiente de lembretes pendentes
CREATE INDEX IF NOT EXISTS idx_bill_reminders_scheduled 
ON bill_reminders(reminder_date, scheduled_time, status)
WHERE status = 'pending';

-- Atualizar lembretes existentes com horário padrão
UPDATE bill_reminders 
SET scheduled_time = reminder_time 
WHERE scheduled_time IS NULL AND reminder_time IS NOT NULL;;
