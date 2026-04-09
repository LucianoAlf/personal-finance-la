-- Adicionar novos campos para suporte multi-canal na tabela bill_reminders
ALTER TABLE bill_reminders 
ADD COLUMN IF NOT EXISTS channel TEXT CHECK (channel IN ('push', 'email', 'whatsapp')) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS days_before INTEGER DEFAULT 1;

-- Renomear delivery_status para status (mais consistente com o código)
ALTER TABLE bill_reminders 
RENAME COLUMN delivery_status TO status;

-- Ajustar constraint do status
ALTER TABLE bill_reminders 
DROP CONSTRAINT IF EXISTS bill_reminders_delivery_status_check;

ALTER TABLE bill_reminders
ADD CONSTRAINT bill_reminders_status_check 
CHECK (status IN ('pending', 'sent', 'failed'));

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_bill_reminders_channel 
ON bill_reminders(channel);

CREATE INDEX IF NOT EXISTS idx_bill_reminders_pending 
ON bill_reminders(reminder_date, reminder_time) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bill_reminders_retry 
ON bill_reminders(retry_count) 
WHERE status = 'pending' AND retry_count < 3;

-- Comentários explicativos
COMMENT ON COLUMN bill_reminders.channel IS 'Canal de envio: push (notificação app), email, ou whatsapp';
COMMENT ON COLUMN bill_reminders.days_before IS 'Quantos dias antes do vencimento enviar (0 = no dia)';
COMMENT ON COLUMN bill_reminders.retry_count IS 'Número de tentativas de reenvio (máx 3)';
COMMENT ON COLUMN bill_reminders.metadata IS 'Dados adicionais (ex: email_id, push_receipt, message_id)';;
