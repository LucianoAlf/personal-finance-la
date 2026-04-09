-- Safe create types if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_provider_type') THEN
    CREATE TYPE ai_provider_type AS ENUM ('openai','gemini','claude','openrouter');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'response_style') THEN
    CREATE TYPE response_style AS ENUM ('short','medium','long');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'response_tone') THEN
    CREATE TYPE response_tone AS ENUM ('formal','friendly','casual');
  END IF;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider ai_provider_type NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  api_key_encrypted TEXT,
  api_key_last_4 VARCHAR(4),
  model_name VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.70 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
  response_style response_style DEFAULT 'medium',
  response_tone response_tone DEFAULT 'friendly',
  system_prompt TEXT DEFAULT 'Você é Ana Clara, uma assistente financeira virtual especializada em educação financeira pessoal. Seu objetivo é ajudar usuários a organizarem suas finanças, aprenderem sobre investimentos e alcançarem suas metas financeiras de forma simples e amigável.',
  is_validated BOOLEAN DEFAULT false,
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT,
  plan_type VARCHAR(20) DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT ai_provider_configs_user_provider_unique UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_user_id ON public.ai_provider_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_default ON public.ai_provider_configs(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_active ON public.ai_provider_configs(user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_provider_configs' AND policyname='Users can view own AI configs'
  ) THEN
    CREATE POLICY "Users can view own AI configs" ON public.ai_provider_configs FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_provider_configs' AND policyname='Users can insert own AI configs'
  ) THEN
    CREATE POLICY "Users can insert own AI configs" ON public.ai_provider_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_provider_configs' AND policyname='Users can update own AI configs'
  ) THEN
    CREATE POLICY "Users can update own AI configs" ON public.ai_provider_configs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_provider_configs' AND policyname='Users can delete own AI configs'
  ) THEN
    CREATE POLICY "Users can delete own AI configs" ON public.ai_provider_configs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_provider_configs_updated_at'
  ) THEN
    CREATE TRIGGER update_ai_provider_configs_updated_at
      BEFORE UPDATE ON public.ai_provider_configs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ensure single default trigger+fn
CREATE OR REPLACE FUNCTION ensure_single_default_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.ai_provider_configs
      SET is_default = false
      WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_single_default_provider_trigger'
  ) THEN
    CREATE TRIGGER ensure_single_default_provider_trigger
      BEFORE INSERT OR UPDATE ON public.ai_provider_configs
      FOR EACH ROW WHEN (NEW.is_default = true)
      EXECUTE FUNCTION ensure_single_default_provider();
  END IF;
END $$;
;
