-- Migration: Create webhook_endpoints table
-- Responsabilidade: Webhooks configurados (N8N endpoints)

CREATE TYPE http_method AS ENUM (
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE'
);

CREATE TYPE auth_type AS ENUM (
  'none',
  'bearer',
  'api_key',
  'basic'
);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Endpoint
  url TEXT NOT NULL,
  http_method http_method DEFAULT 'POST' NOT NULL,
  
  -- Autenticação
  auth_type auth_type DEFAULT 'none' NOT NULL,
  auth_token_encrypted TEXT, -- Bearer token ou API key
  auth_username VARCHAR(200), -- Para Basic Auth
  auth_password_encrypted TEXT, -- Para Basic Auth
  
  -- Headers customizados
  custom_headers JSONB DEFAULT '{}'::jsonb,
  
  -- Retry
  retry_enabled BOOLEAN DEFAULT true,
  retry_max_attempts INTEGER DEFAULT 3 CHECK (retry_max_attempts >= 1 AND retry_max_attempts <= 10),
  retry_delay_seconds INTEGER DEFAULT 60 CHECK (retry_delay_seconds >= 10),
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Estatísticas
  total_calls INTEGER DEFAULT 0,
  success_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT webhook_endpoints_url_check CHECK (url ~* '^https?://')
);

-- Índices
CREATE INDEX idx_webhook_endpoints_user_id ON public.webhook_endpoints(user_id);
CREATE INDEX idx_webhook_endpoints_active ON public.webhook_endpoints(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_webhook_endpoints_last_triggered ON public.webhook_endpoints(last_triggered_at DESC);

-- RLS Policies
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks"
  ON public.webhook_endpoints
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks"
  ON public.webhook_endpoints
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON public.webhook_endpoints
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON public.webhook_endpoints
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.webhook_endpoints IS 'Webhooks configurados pelo usuário (N8N endpoints)';
COMMENT ON COLUMN public.webhook_endpoints.custom_headers IS 'Headers HTTP customizados em formato JSON';
COMMENT ON COLUMN public.webhook_endpoints.retry_max_attempts IS 'Número máximo de tentativas em caso de falha';;
