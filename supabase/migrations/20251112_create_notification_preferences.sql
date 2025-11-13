-- Migration: Criar tabela de preferências de notificações
-- Permite usuário controlar quais notificações deseja receber

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipos de notificações
  upcoming_bills_enabled BOOLEAN DEFAULT true,
  upcoming_bills_days INTEGER DEFAULT 3 CHECK (upcoming_bills_days BETWEEN 1 AND 7),
  
  budget_alerts_enabled BOOLEAN DEFAULT true,
  budget_alert_at_80 BOOLEAN DEFAULT true,
  budget_alert_at_90 BOOLEAN DEFAULT true,
  budget_alert_at_100 BOOLEAN DEFAULT true,
  
  goals_achieved_enabled BOOLEAN DEFAULT true,
  dividends_received_enabled BOOLEAN DEFAULT true,
  
  -- Configurações gerais
  notification_time TIME DEFAULT '09:00:00', -- Horário preferido (local)
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  
  -- Canais
  whatsapp_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  
  -- Frequência
  max_notifications_per_day INTEGER DEFAULT 5 CHECK (max_notifications_per_day BETWEEN 1 AND 20),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint: um registro por usuário
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_whatsapp_enabled ON notification_preferences(whatsapp_enabled) WHERE whatsapp_enabled = true;

-- RLS Policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Função para criar preferências padrão ao conectar WhatsApp
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar preferências padrão se usuário conectou WhatsApp
  IF NEW.is_connected = true AND OLD.is_connected = false THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_notification_prefs_on_whatsapp_connect
  AFTER UPDATE ON whatsapp_connection_status
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Comentários
COMMENT ON TABLE notification_preferences IS 'Preferências de notificações proativas do usuário';
COMMENT ON COLUMN notification_preferences.upcoming_bills_days IS 'Quantos dias antes do vencimento notificar (padrão: 3)';
COMMENT ON COLUMN notification_preferences.notification_time IS 'Horário preferido para receber notificações (local)';
COMMENT ON COLUMN notification_preferences.max_notifications_per_day IS 'Limite de notificações por dia para evitar spam';
