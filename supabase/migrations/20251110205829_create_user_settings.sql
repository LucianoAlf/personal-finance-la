-- Migration: Create user_settings table
-- Responsabilidade: Configurações gerais do usuário (tema, idioma, preferências financeiras)

CREATE TABLE IF NOT EXISTS public.user_settings (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Perfil
  display_name VARCHAR(200),
  avatar_url TEXT,
  
  -- Preferências Gerais
  language VARCHAR(10) DEFAULT 'pt-BR' NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL' NOT NULL,
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY' NOT NULL,
  number_format VARCHAR(20) DEFAULT 'pt-BR' NOT NULL, -- 1.234,56 vs 1,234.56
  
  -- Tema
  theme VARCHAR(20) DEFAULT 'auto' NOT NULL CHECK (theme IN ('light', 'dark', 'auto')),
  
  -- Configurações Financeiras
  monthly_savings_goal_percentage INTEGER DEFAULT 20 CHECK (monthly_savings_goal_percentage >= 0 AND monthly_savings_goal_percentage <= 100),
  monthly_closing_day INTEGER DEFAULT 1 CHECK (monthly_closing_day >= 1 AND monthly_closing_day <= 28),
  
  -- Preferências de Notificação (defaults)
  default_bill_reminder_days INTEGER DEFAULT 3 CHECK (default_bill_reminder_days >= 0),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT user_settings_user_id_unique UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- RLS Policies
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.user_settings IS 'Configurações gerais do usuário (tema, idioma, preferências financeiras)';
COMMENT ON COLUMN public.user_settings.monthly_closing_day IS 'Dia do mês para fechamento mensal (1-28)';
COMMENT ON COLUMN public.user_settings.monthly_savings_goal_percentage IS 'Meta de economia mensal em % da renda';;
