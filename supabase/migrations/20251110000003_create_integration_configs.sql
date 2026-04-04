-- Migration: Create integration_configs table
-- Responsabilidade: Configurações de integrações externas (WhatsApp, Google Calendar, Tick Tick)

CREATE TYPE integration_type AS ENUM (
  'whatsapp',
  'google_calendar',
  'ticktick'
);

CREATE TYPE integration_status AS ENUM (
  'disconnected',
  'connecting',
  'connected',
  'error'
);

CREATE TABLE IF NOT EXISTS public.integration_configs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de Integração
  integration_type integration_type NOT NULL,
  
  -- Status
  status integration_status DEFAULT 'disconnected' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Credenciais/Tokens (CRIPTOGRAFADOS)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  
  -- WhatsApp específico
  whatsapp_instance_id VARCHAR(100),
  whatsapp_phone_number VARCHAR(20),
  whatsapp_qr_code TEXT, -- Base64 do QR Code
  
  -- Google Calendar específico
  google_calendar_id VARCHAR(200),
  google_sync_frequency_minutes INTEGER DEFAULT 30, -- 15, 30, 60
  
  -- Tick Tick específico
  ticktick_api_key_encrypted TEXT,
  ticktick_default_project_id VARCHAR(100),
  
  -- Metadados de conexão
  last_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  -- Configurações extras (JSON flexível)
  extra_config JSONB DEFAULT '{}'::jsonb,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT integration_configs_user_type_unique UNIQUE(user_id, integration_type)
);

-- Índices
CREATE INDEX idx_integration_configs_user_id ON public.integration_configs(user_id);
CREATE INDEX idx_integration_configs_type ON public.integration_configs(integration_type);
CREATE INDEX idx_integration_configs_status ON public.integration_configs(status);
CREATE INDEX idx_integration_configs_active ON public.integration_configs(user_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON public.integration_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON public.integration_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.integration_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.integration_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_integration_configs_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.integration_configs IS 'Configurações de integrações externas (WhatsApp, Google Calendar, Tick Tick)';
COMMENT ON COLUMN public.integration_configs.whatsapp_qr_code IS 'QR Code base64 para conexão WhatsApp';
COMMENT ON COLUMN public.integration_configs.google_sync_frequency_minutes IS 'Frequência de sincronização com Google Calendar (minutos)';
