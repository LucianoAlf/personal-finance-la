-- Migration: Create ai_provider_configs table
-- Responsabilidade: Configuração de provedores de IA (OpenAI, Gemini, Claude, Open Router)

CREATE TYPE ai_provider_type AS ENUM (
  'openai',
  'gemini',
  'claude',
  'openrouter'
);

CREATE TYPE response_style AS ENUM (
  'short',    -- curta
  'medium',   -- média
  'long'      -- longa
);

CREATE TYPE response_tone AS ENUM (
  'formal',   -- formal
  'friendly', -- amigável
  'casual'    -- casual
);

CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Provedor
  provider ai_provider_type NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Credenciais (CRIPTOGRAFADAS via Supabase Vault)
  api_key_encrypted TEXT, -- Armazenar via vault.secrets
  api_key_last_4 VARCHAR(4), -- Últimos 4 dígitos para exibição
  
  -- Modelo Específico
  model_name VARCHAR(100) NOT NULL, -- gpt-4-turbo, gemini-pro, claude-3-opus, etc
  
  -- Parâmetros LLM
  temperature DECIMAL(3,2) DEFAULT 0.70 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
  
  -- Personalização Ana Clara
  response_style response_style DEFAULT 'medium',
  response_tone response_tone DEFAULT 'friendly',
  system_prompt TEXT DEFAULT 'Você é Ana Clara, uma assistente financeira virtual especializada em educação financeira pessoal. Seu objetivo é ajudar usuários a organizarem suas finanças, aprenderem sobre investimentos e alcançarem suas metas financeiras de forma simples e amigável.',
  
  -- Status de validação
  is_validated BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  
  -- Plano (para exibição de badge)
  plan_type VARCHAR(20) DEFAULT 'free', -- free, paid
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT ai_provider_configs_user_provider_unique UNIQUE(user_id, provider)
);

-- Índices
CREATE INDEX idx_ai_provider_configs_user_id ON public.ai_provider_configs(user_id);
CREATE INDEX idx_ai_provider_configs_default ON public.ai_provider_configs(user_id, is_default) WHERE is_default = true;
CREATE INDEX idx_ai_provider_configs_active ON public.ai_provider_configs(user_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI configs"
  ON public.ai_provider_configs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI configs"
  ON public.ai_provider_configs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI configs"
  ON public.ai_provider_configs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI configs"
  ON public.ai_provider_configs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_ai_provider_configs_updated_at
  BEFORE UPDATE ON public.ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Garantir apenas 1 provedor default por usuário
CREATE OR REPLACE FUNCTION ensure_single_default_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.ai_provider_configs
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_provider_trigger
  BEFORE INSERT OR UPDATE ON public.ai_provider_configs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_provider();

-- Comentários
COMMENT ON TABLE public.ai_provider_configs IS 'Configurações de provedores de IA (OpenAI, Gemini, Claude, Open Router)';
COMMENT ON COLUMN public.ai_provider_configs.api_key_encrypted IS 'API Key criptografada (via Supabase Vault)';
COMMENT ON COLUMN public.ai_provider_configs.temperature IS 'Temperatura do LLM (0.0-2.0). Maior = mais criativo';
COMMENT ON COLUMN public.ai_provider_configs.system_prompt IS 'Prompt do sistema para personalizar Ana Clara';
