-- Migration: Create notification_preferences table
-- Responsabilidade: Preferências de notificações do usuário

CREATE TYPE notification_channel AS ENUM (
  'push',
  'email',
  'whatsapp'
);

CREATE TYPE summary_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly'
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Canais ativos
  push_enabled BOOLEAN DEFAULT true NOT NULL,
  email_enabled BOOLEAN DEFAULT true NOT NULL,
  whatsapp_enabled BOOLEAN DEFAULT false NOT NULL,
  
  -- Modo Não Perturbe
  do_not_disturb_enabled BOOLEAN DEFAULT false,
  do_not_disturb_start_time TIME, -- Exemplo: 22:00
  do_not_disturb_end_time TIME,   -- Exemplo: 08:00
  
  -- Horários permitidos (geral)
  allowed_hours_start TIME DEFAULT '08:00'::TIME,
  allowed_hours_end TIME DEFAULT '22:00'::TIME,
  
  -- Resumos Automáticos
  daily_summary_enabled BOOLEAN DEFAULT true,
  daily_summary_time TIME DEFAULT '20:00'::TIME,
  
  weekly_summary_enabled BOOLEAN DEFAULT true,
  weekly_summary_day_of_week INTEGER DEFAULT 0, -- 0=Domingo, 1=Segunda, etc
  weekly_summary_time TIME DEFAULT '09:00'::TIME,
  
  monthly_summary_enabled BOOLEAN DEFAULT true,
  monthly_summary_day_of_month INTEGER DEFAULT 1 CHECK (monthly_summary_day_of_month >= 1 AND monthly_summary_day_of_month <= 28),
  monthly_summary_time TIME DEFAULT '09:00'::TIME,
  
  -- Alertas Específicos
  bill_reminders_enabled BOOLEAN DEFAULT true,
  bill_reminders_days_before INTEGER DEFAULT 3,
  
  budget_alerts_enabled BOOLEAN DEFAULT true,
  budget_alert_threshold_percentage INTEGER DEFAULT 90 CHECK (budget_alert_threshold_percentage >= 50 AND budget_alert_threshold_percentage <= 100),
  
  goal_milestones_enabled BOOLEAN DEFAULT true,
  achievements_enabled BOOLEAN DEFAULT true,
  
  ana_tips_enabled BOOLEAN DEFAULT true,
  ana_tips_frequency summary_frequency DEFAULT 'daily',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT notification_preferences_user_id_unique UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- RLS Policies
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON public.notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.notification_preferences IS 'Preferências de notificações do usuário (canais, horários, frequência)';
COMMENT ON COLUMN public.notification_preferences.do_not_disturb_start_time IS 'Hora de início do modo Não Perturbe (ex: 22:00)';
COMMENT ON COLUMN public.notification_preferences.budget_alert_threshold_percentage IS 'Notificar quando gasto atingir X% do orçamento';;
