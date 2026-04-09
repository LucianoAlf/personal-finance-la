-- ============================================
-- TABELA: bill_reminders (Lembretes Agendados)
-- ============================================

CREATE TABLE bill_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES payable_bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Agendamento
  reminder_date DATE NOT NULL,
  reminder_time TIME DEFAULT '09:00:00',
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN (
    'app', 'email', 'whatsapp', 'push', 'sms'
  )),
  
  -- Status
  sent_at TIMESTAMPTZ,
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'sent', 'failed', 'read', 'clicked'
  )),
  error_message TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_bill_reminders_user_date 
  ON bill_reminders(user_id, reminder_date, reminder_time);

CREATE INDEX idx_bill_reminders_pending 
  ON bill_reminders(reminder_date, reminder_time, reminder_type) 
  WHERE delivery_status = 'pending';

CREATE INDEX idx_bill_reminders_bill 
  ON bill_reminders(bill_id);

COMMENT ON TABLE bill_reminders IS 'Lembretes agendados com rastreamento de entrega';;
