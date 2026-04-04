Como está essa estrutura para o TODO do Schema e Backend?

📦 PARTE 1: BACKEND - DATABASE SCHEMA
🗄️ 1.1 - Tabela user_settings
Responsabilidade: Configurações gerais do usuário (tema, idioma, preferências financeiras)

sql
-- Migration: 20251110_create_user_settings.sql

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
  theme VARCHAR(20) DEFAULT 'auto' NOT NULL, -- light, dark, auto
  
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
COMMENT ON COLUMN public.user_settings.monthly_savings_goal_percentage IS 'Meta de economia mensal em % da renda';
🤖 1.2 - Tabela ai_provider_configs
Responsabilidade: Configuração de provedores de IA (OpenAI, Gemini, Claude, Open Router)

sql
-- Migration: 20251110_create_ai_provider_configs.sql

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
🔗 1.3 - Tabela integration_configs
Responsabilidade: Configurações de integrações externas (WhatsApp, Google Calendar, Tick Tick)

sql
-- Migration: 20251110_create_integration_configs.sql

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
🪝 1.4 - Tabela webhook_endpoints
Responsabilidade: Webhooks configurados (N8N endpoints)

sql
-- Migration: 20251110_create_webhook_endpoints.sql

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
COMMENT ON COLUMN public.webhook_endpoints.retry_max_attempts IS 'Número máximo de tentativas em caso de falha';
📝 1.5 - Tabela webhook_logs
Responsabilidade: Histórico de chamadas de webhooks

sql
-- Migration: 20251110_create_webhook_logs.sql

CREATE TYPE webhook_log_status AS ENUM (
  'pending',
  'success',
  'failed',
  'retrying'
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  
  -- Request
  request_payload JSONB,
  request_headers JSONB,
  request_method http_method NOT NULL,
  
  -- Response
  response_status_code INTEGER,
  response_body TEXT,
  response_headers JSONB,
  response_time_ms INTEGER, -- Tempo de resposta em milissegundos
  
  -- Status
  status webhook_log_status DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  
  -- Retry
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  
  -- Metadados
  triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  
  -- Particionamento por data (opcional, futuro)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_webhook_logs_user_id ON public.webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_triggered_at ON public.webhook_logs(triggered_at DESC);
CREATE INDEX idx_webhook_logs_retry ON public.webhook_logs(next_retry_at) WHERE status = 'retrying';

-- RLS Policies
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook logs"
  ON public.webhook_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (true); -- Edge Functions usam service role

CREATE POLICY "Service role can update webhook logs"
  ON public.webhook_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger: Atualizar estatísticas do webhook após log
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE public.webhook_endpoints
    SET 
      total_calls = total_calls + 1,
      success_calls = success_calls + 1,
      last_triggered_at = NEW.triggered_at,
      last_status_code = NEW.response_status_code
    WHERE id = NEW.webhook_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.webhook_endpoints
    SET 
      total_calls = total_calls + 1,
      failed_calls = failed_calls + 1,
      last_triggered_at = NEW.triggered_at,
      last_status_code = NEW.response_status_code
    WHERE id = NEW.webhook_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_stats_trigger
  AFTER INSERT OR UPDATE OF status ON public.webhook_logs
  FOR EACH ROW
  WHEN (NEW.status IN ('success', 'failed'))
  EXECUTE FUNCTION update_webhook_stats();

-- Comentários
COMMENT ON TABLE public.webhook_logs IS 'Histórico de chamadas de webhooks com request/response completos';
COMMENT ON COLUMN public.webhook_logs.response_time_ms IS 'Tempo de resposta do webhook em milissegundos';
🔔 1.6 - Tabela notification_preferences
Responsabilidade: Preferências de notificações do usuário

sql
-- Migration: 20251110_create_notification_preferences.sql

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
COMMENT ON COLUMN public.notification_preferences.budget_alert_threshold_percentage IS 'Notificar quando gasto atingir X% do orçamento';


📦 PARTE 2: BACKEND - EDGE FUNCTIONS
⚡ 2.1 - Edge Function: get-user-settings
Responsabilidade: Retorna TODAS as configurações do usuário (user_settings + ai_provider_configs + integration_configs + webhook_endpoints + notification_preferences)

typescript
// supabase/functions/get-user-settings/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSettingsResponse {
  user_settings: any;
  ai_providers: any[];
  integrations: any[];
  webhooks: any[];
  notification_preferences: any;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Obter usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = user.id;

    // 1. Buscar user_settings (criar se não existir)
    let { data: userSettings, error: settingsError } = await supabaseClient
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (settingsError && settingsError.code === "PGRST116") {
      // Não existe, criar com valores padrão
      const { data: newSettings, error: createError } = await supabaseClient
        .from("user_settings")
        .insert({
          user_id: userId,
          display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          avatar_url: user.user_metadata?.avatar_url,
        })
        .select()
        .single();

      if (createError) throw createError;
      userSettings = newSettings;
    }

    // 2. Buscar ai_provider_configs
    const { data: aiProviders, error: aiError } = await supabaseClient
      .from("ai_provider_configs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (aiError) throw aiError;

    // 3. Buscar integration_configs
    const { data: integrations, error: integrationsError } = await supabaseClient
      .from("integration_configs")
      .select("*")
      .eq("user_id", userId);

    if (integrationsError) throw integrationsError;

    // 4. Buscar webhook_endpoints
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from("webhook_endpoints")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (webhooksError) throw webhooksError;

    // 5. Buscar notification_preferences (criar se não existir)
    let { data: notificationPrefs, error: notifError } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (notifError && notifError.code === "PGRST116") {
      // Criar com valores padrão
      const { data: newPrefs, error: createNotifError } = await supabaseClient
        .from("notification_preferences")
        .insert({ user_id: userId })
        .select()
        .single();

      if (createNotifError) throw createNotifError;
      notificationPrefs = newPrefs;
    }

    // Montar resposta completa
    const response: UserSettingsResponse = {
      user_settings: userSettings,
      ai_providers: aiProviders || [],
      integrations: integrations || [],
      webhooks: webhooks || [],
      notification_preferences: notificationPrefs,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in get-user-settings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
⚡ 2.2 - Edge Function: update-ai-config
Responsabilidade: Atualiza/Cria configuração de provedor de IA

typescript
// supabase/functions/update-ai-config/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateAIConfigRequest {
  provider: "openai" | "gemini" | "claude" | "openrouter";
  api_key?: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  response_style?: "short" | "medium" | "long";
  response_tone?: "formal" | "friendly" | "casual";
  system_prompt?: string;
  is_default?: boolean;
  is_active?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: UpdateAIConfigRequest = await req.json();

    // Validações
    if (!body.provider || !body.model_name) {
      return new Response(
        JSON.stringify({ error: "provider e model_name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar dados para upsert
    const configData: any = {
      user_id: user.id,
      provider: body.provider,
      model_name: body.model_name,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1000,
      response_style: body.response_style ?? "medium",
      response_tone: body.response_tone ?? "friendly",
      system_prompt: body.system_prompt,
      is_default: body.is_default ?? false,
      is_active: body.is_active ?? true,
    };

    // Se API Key foi fornecida, processar
    if (body.api_key) {
      // Extrair últimos 4 dígitos
      configData.api_key_last_4 = body.api_key.slice(-4);
      
      // IMPORTANTE: Em produção, usar Supabase Vault para criptografar
      // Por enquanto, armazenar diretamente (TEMPORÁRIO)
      configData.api_key_encrypted = body.api_key;
      
      // Resetar validação quando API key mudar
      configData.is_validated = false;
      configData.validation_error = null;
    }

    // Upsert (insert ou update se já existir)
    const { data: config, error: upsertError } = await supabaseClient
      .from("ai_provider_configs")
      .upsert(configData, {
        onConflict: "user_id,provider",
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in update-ai-config:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
⚡ 2.3 - Edge Function: validate-api-key
Responsabilidade: Valida API Key de provedores de IA fazendo uma chamada de teste

typescript
// supabase/functions/validate-api-key/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidateRequest {
  provider: "openai" | "gemini" | "claude" | "openrouter";
  api_key: string;
  model_name?: string;
}

async function validateOpenAI(apiKey: string, model: string = "gpt-4o-mini") {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: "Teste" }],
      max_tokens: 5,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API Key inválida");
  }

  return { valid: true, message: "API Key válida" };
}

async function validateGemini(apiKey: string, model: string = "gemini-pro") {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Teste" }] }],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API Key inválida");
  }

  return { valid: true, message: "API Key válida" };
}

async function validateClaude(apiKey: string, model: string = "claude-3-haiku-20240307") {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 5,
      messages: [{ role: "user", content: "Teste" }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API Key inválida");
  }

  return { valid: true, message: "API Key válida" };
}

async function validateOpenRouter(apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("API Key inválida");
  }

  const data = await response.json();
  return { 
    valid: true, 
    message: "API Key válida",
    credits: data.data?.limit || 0
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ValidateRequest = await req.json();

    if (!body.provider || !body.api_key) {
      return new Response(
        JSON.stringify({ error: "provider e api_key são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (body.provider) {
      case "openai":
        result = await validateOpenAI(body.api_key, body.model_name);
        break;
      case "gemini":
        result = await validateGemini(body.api_key, body.model_name);
        break;
      case "claude":
        result = await validateClaude(body.api_key, body.model_name);
        break;
      case "openrouter":
        result = await validateOpenRouter(body.api_key);
        break;
      default:
        throw new Error("Provedor não suportado");
    }

    // Atualizar status de validação no banco
    await supabaseClient
      .from("ai_provider_configs")
      .update({
        is_validated: true,
        last_validated_at: new Date().toISOString(),
        validation_error: null,
      })
      .eq("user_id", user.id)
      .eq("provider", body.provider);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in validate-api-key:", error);

    // Atualizar erro de validação no banco
    const body: ValidateRequest = await req.json();
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseClient
      .from("ai_provider_configs")
      .update({
        is_validated: false,
        validation_error: error.message,
      })
      .eq("provider", body.provider);

    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
⚡ 2.4 - Edge Function: test-webhook-connection
Responsabilidade: Testa conexão com webhook fazendo uma chamada de teste

typescript
// supabase/functions/test-webhook-connection/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestWebhookRequest {
  webhook_id: string;
  test_payload?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TestWebhookRequest = await req.json();

    // Buscar webhook
    const { data: webhook, error: webhookError } = await supabaseClient
      .from("webhook_endpoints")
      .select("*")
      .eq("id", body.webhook_id)
      .eq("user_id", user.id)
      .single();

    if (webhookError || !webhook) {
      return new Response(
        JSON.stringify({ error: "Webhook não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preparar payload de teste
    const testPayload = body.test_payload || {
      event: "test",
      message: "Teste de conexão do webhook",
      timestamp: new Date().toISOString(),
      user_id: user.id,
    };

    // Preparar headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Personal-Finance-LA/1.0",
    };

    // Adicionar autenticação
    if (webhook.auth_type === "bearer" && webhook.auth_token_encrypted) {
      headers["Authorization"] = `Bearer ${webhook.auth_token_encrypted}`;
    } else if (webhook.auth_type === "api_key" && webhook.auth_token_encrypted) {
      headers["X-API-Key"] = webhook.auth_token_encrypted;
    } else if (webhook.auth_type === "basic" && webhook.auth_username && webhook.auth_password_encrypted) {
      const credentials = btoa(`${webhook.auth_username}:${webhook.auth_password_encrypted}`);
      headers["Authorization"] = `Basic ${credentials}`;
    }

    // Adicionar custom headers
    if (webhook.custom_headers) {
      Object.assign(headers, webhook.custom_headers);
    }

    // Fazer chamada
    const startTime = Date.now();
    const response = await fetch(webhook.url, {
      method: webhook.http_method,
      headers,
      body: webhook.http_method !== "GET" ? JSON.stringify(testPayload) : undefined,
    });
    const responseTime = Date.now() - startTime;

    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Criar log
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await serviceClient.from("webhook_logs").insert({
      user_id: user.id,
      webhook_id: webhook.id,
      request_payload: testPayload,
      request_headers: headers,
      request_method: webhook.http_method,
      response_status_code: response.status,
      response_body: responseBody,
      response_headers: responseHeaders,
      response_time_ms: responseTime,
      status: response.ok ? "success" : "failed",
      error_message: response.ok ? null : `HTTP ${response.status}`,
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: response.ok,
        status_code: response.status,
        response_time_ms: responseTime,
        response_body: responseBody,
        message: response.ok ? "Webhook respondeu com sucesso" : `Webhook retornou erro HTTP ${response.status}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in test-webhook-connection:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
⚡ 2.5 - Edge Function: trigger-webhook
Responsabilidade: Dispara webhook manualmente com payload customizado

typescript
// supabase/functions/trigger-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriggerWebhookRequest {
  webhook_id: string;
  payload: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TriggerWebhookRequest = await req.json();

    // Buscar webhook
    const { data: webhook, error: webhookError } = await supabaseClient
      .from("webhook_endpoints")
      .select("*")
      .eq("id", body.webhook_id)
      .eq("user_id", user.id)
      .single();

    if (webhookError || !webhook) {
      return new Response(
        JSON.stringify({ error: "Webhook não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhook.is_active) {
      return new Response(
        JSON.stringify({ error: "Webhook está desativado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lógica de disparo (reutilizar de test-webhook-connection)
    // ... (mesmo código de preparar headers e fazer fetch) ...

    // Retornar sucesso
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook disparado com sucesso",
        log_id: "uuid-do-log" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in trigger-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

📦 PARTE 3: FRONTEND - TYPESCRIPT TYPES
📝 3.1 - Types: settings.types.ts
typescript
// src/types/settings.types.ts

// ==================== USER SETTINGS ====================

export interface UserSettings {
  id: string;
  user_id: string;
  
  // Perfil
  display_name: string | null;
  avatar_url: string | null;
  
  // Preferências Gerais
  language: string;
  timezone: string;
  currency: string;
  date_format: string;
  number_format: string;
  
  // Tema
  theme: 'light' | 'dark' | 'auto';
  
  // Configurações Financeiras
  monthly_savings_goal_percentage: number;
  monthly_closing_day: number;
  default_bill_reminder_days: number;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface UpdateUserSettingsInput {
  display_name?: string;
  avatar_url?: string;
  language?: string;
  timezone?: string;
  currency?: string;
  date_format?: string;
  number_format?: string;
  theme?: 'light' | 'dark' | 'auto';
  monthly_savings_goal_percentage?: number;
  monthly_closing_day?: number;
  default_bill_reminder_days?: number;
}

// ==================== AI PROVIDER CONFIGS ====================

export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'openrouter';
export type ResponseStyle = 'short' | 'medium' | 'long';
export type ResponseTone = 'formal' | 'friendly' | 'casual';

export interface AIProviderConfig {
  id: string;
  user_id: string;
  
  // Provedor
  provider: AIProviderType;
  is_default: boolean;
  is_active: boolean;
  
  // Credenciais
  api_key_encrypted?: string;
  api_key_last_4?: string;
  
  // Modelo
  model_name: string;
  
  // Parâmetros LLM
  temperature: number;
  max_tokens: number;
  
  // Personalização Ana Clara
  response_style: ResponseStyle;
  response_tone: ResponseTone;
  system_prompt: string;
  
  // Validação
  is_validated: boolean;
  last_validated_at: string | null;
  validation_error: string | null;
  
  // Plano
  plan_type: string;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface CreateAIProviderInput {
  provider: AIProviderType;
  api_key: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  response_style?: ResponseStyle;
  response_tone?: ResponseTone;
  system_prompt?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateAIProviderInput {
  api_key?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  response_style?: ResponseStyle;
  response_tone?: ResponseTone;
  system_prompt?: string;
  is_default?: boolean;
  is_active?: boolean;
}

// Modelos disponíveis por provedor
export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  costPer1kTokens: number;
  isFree: boolean;
}

export const AI_MODELS: Record<AIProviderType, AIModel[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Mais recente e poderoso', contextWindow: 128000, costPer1kTokens: 0.005, isFree: false },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Rápido e econômico', contextWindow: 128000, costPer1kTokens: 0.00015, isFree: false },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Anterior, ainda potente', contextWindow: 128000, costPer1kTokens: 0.01, isFree: false },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Econômico', contextWindow: 16385, costPer1kTokens: 0.0005, isFree: false },
  ],
  gemini: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Mais avançado', contextWindow: 1000000, costPer1kTokens: 0.00125, isFree: false },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Rápido e eficiente', contextWindow: 1000000, costPer1kTokens: 0.000075, isFree: false },
    { id: 'gemini-pro', name: 'Gemini Pro', description: 'Versão gratuita', contextWindow: 32760, costPer1kTokens: 0, isFree: true },
  ],
  claude: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Mais poderoso', contextWindow: 200000, costPer1kTokens: 0.015, isFree: false },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanceado', contextWindow: 200000, costPer1kTokens: 0.003, isFree: false },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Rápido', contextWindow: 200000, costPer1kTokens: 0.00025, isFree: false },
  ],
  openrouter: [
    { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B', description: 'Gratuito', contextWindow: 8192, costPer1kTokens: 0, isFree: true },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B', description: 'Gratuito', contextWindow: 8192, costPer1kTokens: 0, isFree: true },
    { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini', description: 'Gratuito', contextWindow: 128000, costPer1kTokens: 0, isFree: true },
  ],
};

// ==================== INTEGRATION CONFIGS ====================

export type IntegrationType = 'whatsapp' | 'google_calendar' | 'ticktick';
export type IntegrationStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface IntegrationConfig {
  id: string;
  user_id: string;
  
  // Tipo
  integration_type: IntegrationType;
  
  // Status
  status: IntegrationStatus;
  is_active: boolean;
  
  // WhatsApp
  whatsapp_instance_id?: string;
  whatsapp_phone_number?: string;
  whatsapp_qr_code?: string;
  
  // Google Calendar
  google_calendar_id?: string;
  google_sync_frequency_minutes?: number;
  
  // Tick Tick
  ticktick_default_project_id?: string;
  
  // Metadados de conexão
  last_connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  error_count: number;
  
  // Config extra
  extra_config: Record<string, any>;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

// ==================== WEBHOOK ENDPOINTS ====================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic';

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  
  // Identificação
  name: string;
  description: string | null;
  
  // Endpoint
  url: string;
  http_method: HttpMethod;
  
  // Autenticação
  auth_type: AuthType;
  auth_token_encrypted?: string;
  auth_username?: string;
  auth_password_encrypted?: string;
  
  // Headers
  custom_headers: Record<string, string>;
  
  // Retry
  retry_enabled: boolean;
  retry_max_attempts: number;
  retry_delay_seconds: number;
  
  // Status
  is_active: boolean;
  
  // Estatísticas
  total_calls: number;
  success_calls: number;
  failed_calls: number;
  last_triggered_at: string | null;
  last_status_code: number | null;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  http_method?: HttpMethod;
  auth_type?: AuthType;
  auth_token?: string;
  auth_username?: string;
  auth_password?: string;
  custom_headers?: Record<string, string>;
  retry_enabled?: boolean;
  retry_max_attempts?: number;
  retry_delay_seconds?: number;
  is_active?: boolean;
}

export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  http_method?: HttpMethod;
  auth_type?: AuthType;
  auth_token?: string;
  auth_username?: string;
  auth_password?: string;
  custom_headers?: Record<string, string>;
  retry_enabled?: boolean;
  retry_max_attempts?: number;
  retry_delay_seconds?: number;
  is_active?: boolean;
}

// ==================== WEBHOOK LOGS ====================

export type WebhookLogStatus = 'pending' | 'success' | 'failed' | 'retrying';

export interface WebhookLog {
  id: string;
  user_id: string;
  webhook_id: string;
  
  // Request
  request_payload: any;
  request_headers: Record<string, string>;
  request_method: HttpMethod;
  
  // Response
  response_status_code: number | null;
  response_body: string | null;
  response_headers: Record<string, string> | null;
  response_time_ms: number | null;
  
  // Status
  status: WebhookLogStatus;
  error_message: string | null;
  
  // Retry
  retry_count: number;
  next_retry_at: string | null;
  
  // Metadados
  triggered_at: string;
  completed_at: string | null;
  created_at: string;
}

// ==================== NOTIFICATION PREFERENCES ====================

export type NotificationChannel = 'push' | 'email' | 'whatsapp';
export type SummaryFrequency = 'daily' | 'weekly' | 'monthly';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  
  // Canais
  push_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  
  // Modo Não Perturbe
  do_not_disturb_enabled: boolean;
  do_not_disturb_start_time: string | null;
  do_not_disturb_end_time: string | null;
  
  // Horários permitidos
  allowed_hours_start: string;
  allowed_hours_end: string;
  
  // Resumos automáticos
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  
  weekly_summary_enabled: boolean;
  weekly_summary_day_of_week: number;
  weekly_summary_time: string;
  
  monthly_summary_enabled: boolean;
  monthly_summary_day_of_month: number;
  monthly_summary_time: string;
  
  // Alertas específicos
  bill_reminders_enabled: boolean;
  bill_reminders_days_before: number;
  
  budget_alerts_enabled: boolean;
  budget_alert_threshold_percentage: number;
  
  goal_milestones_enabled: boolean;
  achievements_enabled: boolean;
  
  ana_tips_enabled: boolean;
  ana_tips_frequency: SummaryFrequency;
  
  // Metadados
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  push_enabled?: boolean;
  email_enabled?: boolean;
  whatsapp_enabled?: boolean;
  do_not_disturb_enabled?: boolean;
  do_not_disturb_start_time?: string;
  do_not_disturb_end_time?: string;
  allowed_hours_start?: string;
  allowed_hours_end?: string;
  daily_summary_enabled?: boolean;
  daily_summary_time?: string;
  weekly_summary_enabled?: boolean;
  weekly_summary_day_of_week?: number;
  weekly_summary_time?: string;
  monthly_summary_enabled?: boolean;
  monthly_summary_day_of_month?: number;
  monthly_summary_time?: string;
  bill_reminders_enabled?: boolean;
  bill_reminders_days_before?: number;
  budget_alerts_enabled?: boolean;
  budget_alert_threshold_percentage?: number;
  goal_milestones_enabled?: boolean;
  achievements_enabled?: boolean;
  ana_tips_enabled?: boolean;
  ana_tips_frequency?: SummaryFrequency;
}

// ==================== COMPLETE SETTINGS RESPONSE ====================

export interface CompleteUserSettings {
  user_settings: UserSettings;
  ai_providers: AIProviderConfig[];
  integrations: IntegrationConfig[];
  webhooks: WebhookEndpoint[];
  notification_preferences: NotificationPreferences;
}

// ==================== LABELS ====================

export const LABELS = {
  theme: {
    light: 'Claro',
    dark: 'Escuro',
    auto: 'Automático',
  },
  responseStyle: {
    short: 'Curta',
    medium: 'Média',
    long: 'Longa',
  },
  responseTone: {
    formal: 'Formal',
    friendly: 'Amigável',
    casual: 'Casual',
  },
  integrationStatus: {
    disconnected: 'Desconectado',
    connecting: 'Conectando...',
    connected: 'Conectado',
    error: 'Erro',
  },
  httpMethod: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
    DELETE: 'DELETE',
  },
  authType: {
    none: 'Nenhuma',
    bearer: 'Bearer Token',
    api_key: 'API Key',
    basic: 'Basic Auth',
  },
  webhookLogStatus: {
    pending: 'Pendente',
    success: 'Sucesso',
    failed: 'Falhou',
    retrying: 'Tentando novamente',
  },
  summaryFrequency: {
    daily: 'Diariamente',
    weekly: 'Semanalmente',
    monthly: 'Mensalmente',
  },
  dayOfWeek: {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado',
  },
};
📦 PARTE 4: FRONTEND - REACT HOOKS
🪝 4.1 - Hook: useSettings.ts
typescript
// src/hooks/useSettings.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  CompleteUserSettings,
  UserSettings,
  AIProviderConfig,
  IntegrationConfig,
  WebhookEndpoint,
  NotificationPreferences,
  UpdateUserSettingsInput,
  UpdateNotificationPreferencesInput,
} from '@/types/settings.types';

export function useSettings() {
  const [settings, setSettings] = useState<CompleteUserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch completo de configurações
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('get-user-settings');

      if (fnError) throw fnError;

      setSettings(data as CompleteUserSettings);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update user_settings
  const updateUserSettings = useCallback(async (input: UpdateUserSettingsInput) => {
    try {
      const { data, error: updateError } = await supabase
        .from('user_settings')
        .update(input)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSettings((prev) => (prev ? { ...prev, user_settings: data } : null));
      toast.success('Configurações atualizadas');
      
      return data;
    } catch (err: any) {
      console.error('Error updating user settings:', err);
      toast.error('Erro ao atualizar configurações');
      throw err;
    }
  }, []);

  // Update notification_preferences
  const updateNotificationPreferences = useCallback(
    async (input: UpdateNotificationPreferencesInput) => {
      try {
        const { data, error: updateError } = await supabase
          .from('notification_preferences')
          .update(input)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setSettings((prev) => (prev ? { ...prev, notification_preferences: data } : null));
        toast.success('Preferências de notificação atualizadas');
        
        return data;
      } catch (err: any) {
        console.error('Error updating notification preferences:', err);
        toast.error('Erro ao atualizar preferências');
        throw err;
      }
    },
    []
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateUserSettings,
    updateNotificationPreferences,
  };
}
🪝 4.2 - Hook: useAIProviders.ts
typescript
// src/hooks/useAIProviders.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  AIProviderConfig,
  AIProviderType,
  CreateAIProviderInput,
  UpdateAIProviderInput,
} from '@/types/settings.types';

export function useAIProviders() {
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setProviders(data || []);
    } catch (err: any) {
      console.error('Error fetching AI providers:', err);
      toast.error('Erro ao carregar provedores de IA');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProvider = useCallback(async (input: CreateAIProviderInput) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-ai-config', {
        body: input,
      });

      if (error) throw error;

      await fetchProviders();
      toast.success('Provedor de IA configurado');
      
      return data;
    } catch (err: any) {
      console.error('Error creating AI provider:', err);
      toast.error('Erro ao configurar provedor');
      throw err;
    }
  }, [fetchProviders]);

  const updateProvider = useCallback(
    async (provider: AIProviderType, input: UpdateAIProviderInput) => {
      try {
        const { data, error } = await supabase.functions.invoke('update-ai-config', {
          body: { provider, ...input },
        });

        if (error) throw error;

        await fetchProviders();
        toast.success('Provedor atualizado');
        
        return data;
      } catch (err: any) {
        console.error('Error updating AI provider:', err);
        toast.error('Erro ao atualizar provedor');
        throw err;
      }
    },
    [fetchProviders]
  );

  const deleteProvider = useCallback(
    async (providerId: string) => {
      try {
        const { error } = await supabase
          .from('ai_provider_configs')
          .delete()
          .eq('id', providerId);

        if (error) throw error;

        await fetchProviders();
        toast.success('Provedor removido');
      } catch (err: any) {
        console.error('Error deleting AI provider:', err);
        toast.error('Erro ao remover provedor');
        throw err;
      }
    },
    [fetchProviders]
  );

  const validateApiKey = useCallback(
    async (provider: AIProviderType, apiKey: string, modelName?: string) => {
      try {
        setValidating(true);

        const { data, error } = await supabase.functions.invoke('validate-api-key', {
          body: { provider, api_key: apiKey, model_name: modelName },
        });

        if (error) throw error;

        if (data.valid) {
          toast.success('API Key válida!');
        } else {
          toast.error(data.error || 'API Key inválida');
        }

        return data;
      } catch (err: any) {
        console.error('Error validating API key:', err);
        toast.error('Erro ao validar API Key');
        throw err;
      } finally {
        setValidating(false);
      }
    },
    []
  );

  const setDefaultProvider = useCallback(
    async (providerId: string) => {
      try {
        const provider = providers.find((p) => p.id === providerId);
        if (!provider) throw new Error('Provedor não encontrado');

        await updateProvider(provider.provider, { is_default: true });
        
        toast.success('Provedor padrão atualizado');
      } catch (err: any) {
        console.error('Error setting default provider:', err);
        toast.error('Erro ao definir provedor padrão');
        throw err;
      }
    },
    [providers, updateProvider]
  );

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Computed
  const defaultProvider = providers.find((p) => p.is_default);
  const activeProviders = providers.filter((p) => p.is_active);
  const validatedProviders = providers.filter((p) => p.is_validated);

  return {
    providers,
    loading,
    validating,
    defaultProvider,
    activeProviders,
    validatedProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    validateApiKey,
    setDefaultProvider,
    refetch: fetchProviders,
  };
}
🪝 4.3 - Hook: useWebhooks.ts
typescript
// src/hooks/useWebhooks.ts

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  WebhookEndpoint,
  WebhookLog,
  CreateWebhookInput,
  UpdateWebhookInput,
} from '@/types/settings.types';

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWebhooks(data || []);
    } catch (err: any) {
      console.error('Error fetching webhooks:', err);
      toast.error('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (webhookId?: string, limit = 100) => {
    try {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(limit);

      if (webhookId) {
        query = query.eq('webhook_id', webhookId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching webhook logs:', err);
      toast.error('Erro ao carregar logs');
    }
  }, []);

  const createWebhook = useCallback(
    async (input: CreateWebhookInput) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Usuário não autenticado');

        const { data, error } = await supabase
          .from('webhook_endpoints')
          .insert({
            user_id: user.user.id,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;

        await fetchWebhooks();
        toast.success('Webhook criado');
        
        return data;
      } catch (err: any) {
        console.error('Error creating webhook:', err);
        toast.error('Erro ao criar webhook');
        throw err;
      }
    },
    [fetchWebhooks]
  );

  const updateWebhook = useCallback(
    async (webhookId: string, input: UpdateWebhookInput) => {
      try {
        const { data, error } = await supabase
          .from('webhook_endpoints')
          .update(input)
          .eq('id', webhookId)
          .select()
          .single();

        if (error) throw error;

        await fetchWebhooks();
        toast.success('Webhook atualizado');
        
        return data;
      } catch (err: any) {
        console.error('Error updating webhook:', err);
        toast.error('Erro ao atualizar webhook');
        throw err;
      }
    },
    [fetchWebhooks]
  );

  const deleteWebhook = useCallback(
    async (webhookId: string) => {
      try {
        const { error } = await supabase
          .from('webhook_endpoints')
          .delete()
          .eq('id', webhookId);

        if (error) throw error;

        await fetchWebhooks();
        toast.success('Webhook removido');
      } catch (err: any) {
        console.error('Error deleting webhook:', err);
        toast.error('Erro ao remover webhook');
        throw err;
      }
    },
    [fetchWebhooks]
  );

  const testWebhook = useCallback(async (webhookId: string, testPayload?: any) => {
    try {
      setTesting(true);

      const { data, error } = await supabase.functions.invoke('test-webhook-connection', {
        body: { webhook_id: webhookId, test_payload: testPayload },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Webhook testado com sucesso! (${data.response_time_ms}ms)`);
      } else {
        toast.error(`Webhook falhou: HTTP ${data.status_code}`);
      }

      await fetchLogs(webhookId);
      
      return data;
    } catch (err: any) {
      console.error('Error testing webhook:', err);
      toast.error('Erro ao testar webhook');
      throw err;
    } finally {
      setTesting(false);
    }
  }, [fetchLogs]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  return {
    webhooks,
    logs,
    loading,
    testing,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchLogs,
    refetch: fetchWebhooks,
  };
}

📦 PARTE 5: FRONTEND - COMPONENTES UI
🎨 5.1 - Página Principal: Settings/index.tsx
typescript
// src/pages/Settings/index.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Sparkles, Plug2, Webhook, Bell } from "lucide-react";
import GeneralSettings from "./tabs/GeneralSettings";
import AIProviderSettings from "./tabs/AIProviderSettings";
import IntegrationsSettings from "./tabs/IntegrationsSettings";
import WebhooksSettings from "./tabs/WebhooksSettings";
import NotificationsSettings from "./tabs/NotificationsSettings";
import Header from "@/components/shared/Header";
import { useSettings } from "@/hooks/useSettings";
import { Skeleton } from "@/components/ui/skeleton";

export default function Settings() {
  const { settings, loading } = useSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Configurações" />
        <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Configurações" icon={SettingsIcon} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <Tabs defaultValue="general" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Ana Clara</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Plug2 className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <GeneralSettings settings={settings?.user_settings} />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIProviderSettings />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsSettings integrations={settings?.integrations || []} />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <WebhooksSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <NotificationsSettings preferences={settings?.notification_preferences} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
🎨 5.2 - Tab: GeneralSettings.tsx
typescript
// src/pages/Settings/tabs/GeneralSettings.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Moon, Laptop, User, Globe, DollarSign, Calendar } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import type { UserSettings } from "@/types/settings.types";

interface GeneralSettingsProps {
  settings?: UserSettings;
}

export default function GeneralSettings({ settings }: GeneralSettingsProps) {
  const { updateUserSettings } = useSettings();
  const [formData, setFormData] = useState({
    display_name: settings?.display_name || "",
    language: settings?.language || "pt-BR",
    timezone: settings?.timezone || "America/Sao_Paulo",
    currency: settings?.currency || "BRL",
    date_format: settings?.date_format || "DD/MM/YYYY",
    theme: settings?.theme || "auto",
    monthly_savings_goal_percentage: settings?.monthly_savings_goal_percentage || 20,
    monthly_closing_day: settings?.monthly_closing_day || 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserSettings(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>Informações pessoais e foto de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={settings?.avatar_url || ""} />
              <AvatarFallback className="text-2xl">
                {formData.display_name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="display_name">Nome de exibição</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferências Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Preferências Gerais
          </CardTitle>
          <CardDescription>Idioma, timezone e formatos de exibição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Select value={formData.timezone} onValueChange={(v) => setFormData({ ...formData, timezone: v })}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (BRT)</SelectItem>
                  <SelectItem value="America/New_York">New York (EST)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_format">Formato de Data</Label>
              <Select value={formData.date_format} onValueChange={(v) => setFormData({ ...formData, date_format: v })}>
                <SelectTrigger id="date_format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tema */}
      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Escolha a aparência do aplicativo</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={formData.theme} onValueChange={(v: any) => setFormData({ ...formData, theme: v })}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="light" className="gap-2">
                <Sun className="h-4 w-4" />
                Claro
              </TabsTrigger>
              <TabsTrigger value="dark" className="gap-2">
                <Moon className="h-4 w-4" />
                Escuro
              </TabsTrigger>
              <TabsTrigger value="auto" className="gap-2">
                <Laptop className="h-4 w-4" />
                Automático
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Configurações Financeiras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configurações Financeiras
          </CardTitle>
          <CardDescription>Metas e preferências de controle financeiro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="savings_goal">Meta de Economia Mensal (%)</Label>
              <Input
                id="savings_goal"
                type="number"
                min={0}
                max={100}
                value={formData.monthly_savings_goal_percentage}
                onChange={(e) => setFormData({ ...formData, monthly_savings_goal_percentage: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Percentual da renda que deseja economizar mensalmente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closing_day">Dia de Fechamento Mensal</Label>
              <Select
                value={formData.monthly_closing_day.toString()}
                onValueChange={(v) => setFormData({ ...formData, monthly_closing_day: parseInt(v) })}
              >
                <SelectTrigger id="closing_day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dia do mês para fechar resumos mensais
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" size="lg">
          Salvar Configurações
        </Button>
      </div>
    </form>
  );
}
🎨 5.3 - Tab: AIProviderSettings.tsx ⭐ PRINCIPAL
typescript
// src/pages/Settings/tabs/AIProviderSettings.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { useAIProviders } from "@/hooks/useAIProviders";
import AIProviderSelector from "../components/AIProviderSelector";
import AIProviderCard from "../components/AIProviderCard";
import CreateAIProviderDialog from "../components/CreateAIProviderDialog";

export default function AIProviderSettings() {
  const { providers, defaultProvider, loading, validatedProviders } = useAIProviders();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Configuração da Ana Clara
          </CardTitle>
          <CardDescription className="text-base">
            Configure os provedores de IA que a Ana Clara utilizará para analisar suas finanças e fornecer insights
            personalizados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border bg-background/50 px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{validatedProviders.length} provedores validados</span>
            </div>
            {defaultProvider && (
              <div className="flex items-center gap-2 rounded-lg border bg-background/50 px-4 py-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">
                  Padrão: <Badge variant="outline">{defaultProvider.provider.toUpperCase()}</Badge>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Provedores Configurados */}
      {providers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Provedores Configurados</h3>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Provedor
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <AIProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
      )}

      {/* Adicionar Primeiro Provedor */}
      {providers.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhum provedor configurado</h3>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              Configure pelo menos um provedor de IA para que a Ana Clara possa funcionar. Recomendamos começar com o
              OpenAI (GPT-4o Mini) por ser rápido e econômico.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Configurar Primeiro Provedor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Criação */}
      <CreateAIProviderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
🎨 5.4 - Componente: AIProviderCard.tsx
typescript
// src/pages/Settings/components/AIProviderCard.tsx

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreVertical,
  CheckCircle2,
  XCircle,
  Star,
  Edit,
  Trash2,
  TestTube,
  Sparkles,
} from "lucide-react";
import { useAIProviders } from "@/hooks/useAIProviders";
import { LABELS } from "@/types/settings.types";
import type { AIProviderConfig } from "@/types/settings.types";

interface AIProviderCardProps {
  provider: AIProviderConfig;
}

const PROVIDER_COLORS = {
  openai: "from-green-500/20 to-emerald-500/20 border-green-500/50",
  gemini: "from-blue-500/20 to-cyan-500/20 border-blue-500/50",
  claude: "from-orange-500/20 to-amber-500/20 border-orange-500/50",
  openrouter: "from-purple-500/20 to-pink-500/20 border-purple-500/50",
};

const PROVIDER_LOGOS = {
  openai: "🤖",
  gemini: "✨",
  claude: "🧠",
  openrouter: "🔀",
};

export default function AIProviderCard({ provider }: AIProviderCardProps) {
  const { updateProvider, deleteProvider, validateApiKey, setDefaultProvider, validating } = useAIProviders();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleToggleActive = async () => {
    await updateProvider(provider.provider, { is_active: !provider.is_active });
  };

  const handleSetDefault = async () => {
    await setDefaultProvider(provider.id);
  };

  const handleTest = async () => {
    await validateApiKey(provider.provider, provider.api_key_encrypted || "", provider.model_name);
  };

  const handleDelete = async () => {
    await deleteProvider(provider.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className={`bg-gradient-to-br ${PROVIDER_COLORS[provider.provider]}`}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{PROVIDER_LOGOS[provider.provider]}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold capitalize">{provider.provider}</h3>
                {provider.is_default && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Padrão
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{provider.model_name}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!provider.is_default && (
                <>
                  <DropdownMenuItem onClick={handleSetDefault} className="gap-2">
                    <Star className="h-4 w-4" />
                    Definir como Padrão
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleTest} className="gap-2" disabled={validating}>
                <TestTube className="h-4 w-4" />
                Testar Conexão
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Status de Validação */}
          <div className="flex items-center gap-2">
            {provider.is_validated ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">API Key validada</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  {provider.validation_error || "Aguardando validação"}
                </span>
              </>
            )}
          </div>

          {/* API Key (últimos 4 dígitos) */}
          {provider.api_key_last_4 && (
            <div className="text-sm text-muted-foreground">
              API Key: ••••{provider.api_key_last_4}
            </div>
          )}

          {/* Parâmetros */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Temperatura:</span>{" "}
              <span className="font-medium">{provider.temperature}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tokens:</span>{" "}
              <span className="font-medium">{provider.max_tokens}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Estilo:</span>{" "}
              <span className="font-medium">{LABELS.responseStyle[provider.response_style]}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tom:</span>{" "}
              <span className="font-medium">{LABELS.responseTone[provider.response_tone]}</span>
            </div>
          </div>

          {/* Plano */}
          {provider.plan_type === "free" ? (
            <Badge variant="outline" className="w-fit">
              Gratuito
            </Badge>
          ) : (
            <Badge variant="secondary" className="w-fit gap-1">
              <Sparkles className="h-3 w-3" />
              Pago
            </Badge>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Switch checked={provider.is_active} onCheckedChange={handleToggleActive} id={`active-${provider.id}`} />
            <Label htmlFor={`active-${provider.id}`} className="text-sm">
              Ativo
            </Label>
          </div>

          <Button variant="outline" size="sm" onClick={handleTest} disabled={validating} className="gap-2">
            <TestTube className="h-3 w-3" />
            Testar
          </Button>
        </CardFooter>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Provedor de IA?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Você precisará reconfigurar o provedor caso queira usá-lo novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

📦 PARTE 5 (continuação): COMPONENTES UI
🎨 5.5 - Componente: CreateAIProviderDialog.tsx
typescript
// src/pages/Settings/components/CreateAIProviderDialog.tsx

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useAIProviders } from "@/hooks/useAIProviders";
import { AI_MODELS, LABELS } from "@/types/settings.types";
import type { AIProviderType, CreateAIProviderInput } from "@/types/settings.types";
import TemperatureSlider from "./TemperatureSlider";
import PromptEditor from "./PromptEditor";

interface CreateAIProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_SYSTEM_PROMPT = `Você é Ana Clara, uma assistente financeira virtual especializada em educação financeira pessoal. Seu objetivo é ajudar usuários a organizarem suas finanças, aprenderem sobre investimentos e alcançarem suas metas financeiras de forma simples e amigável.

Características:
- Seja sempre educada, empática e encorajadora
- Use exemplos práticos e relatos do dia a dia
- Evite jargões técnicos complexos
- Forneça conselhos práticos e acionáveis
- Celebre as conquistas financeiras dos usuários`;

export default function CreateAIProviderDialog({ open, onOpenChange }: CreateAIProviderDialogProps) {
  const { createProvider, validateApiKey, validating } = useAIProviders();
  const [step, setStep] = useState(1); // 1: Provedor, 2: API Key, 3: Configurações
  const [loading, setLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string } | null>(null);

  const [formData, setFormData] = useState<CreateAIProviderInput>({
    provider: "openai",
    api_key: "",
    model_name: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1000,
    response_style: "medium",
    response_tone: "friendly",
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    is_default: false,
    is_active: true,
  });

  const handleProviderSelect = (provider: AIProviderType) => {
    const defaultModel = AI_MODELS[provider][0];
    setFormData({
      ...formData,
      provider,
      model_name: defaultModel.id,
    });
    setStep(2);
  };

  const handleValidateApiKey = async () => {
    setValidationResult(null);
    const result = await validateApiKey(formData.provider, formData.api_key, formData.model_name);
    setValidationResult(result);
    
    if (result.valid) {
      setTimeout(() => setStep(3), 1000);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await createProvider(formData);
      onOpenChange(false);
      // Reset form
      setStep(1);
      setFormData({
        provider: "openai",
        api_key: "",
        model_name: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 1000,
        response_style: "medium",
        response_tone: "friendly",
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        is_default: false,
        is_active: true,
      });
      setValidationResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Provedor de IA</DialogTitle>
          <DialogDescription>
            {step === 1 && "Escolha o provedor de IA que deseja configurar"}
            {step === 2 && "Insira sua API Key e valide a conexão"}
            {step === 3 && "Personalize os parâmetros da Ana Clara"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Escolher Provedor */}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["openai", "gemini", "claude", "openrouter"] as AIProviderType[]).map((provider) => (
                <Card
                  key={provider}
                  className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleProviderSelect(provider)}
                >
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="mb-3 text-5xl">
                      {provider === "openai" && "🤖"}
                      {provider === "gemini" && "✨"}
                      {provider === "claude" && "🧠"}
                      {provider === "openrouter" && "🔀"}
                    </div>
                    <h3 className="mb-2 font-semibold capitalize">{provider}</h3>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {AI_MODELS[provider].length} modelos disponíveis
                    </p>
                    {AI_MODELS[provider].some((m) => m.isFree) && (
                      <Badge variant="secondary" className="text-xs">
                        Planos gratuitos
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 2: API Key e Validação */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  <strong>Provedor selecionado:</strong>{" "}
                  <span className="capitalize">{formData.provider}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Select value={formData.model_name} onValueChange={(v) => setFormData({ ...formData, model_name: v })}>
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS[formData.provider].map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          {model.isFree && (
                            <Badge variant="outline" className="text-xs">
                              Gratuito
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {AI_MODELS[formData.provider].find((m) => m.id === formData.model_name)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api_key"
                    type={showApiKey ? "text" : "password"}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sua API Key será armazenada de forma segura e criptografada
                </p>
              </div>

              {validationResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg border p-3 ${
                    validationResult.valid
                      ? "border-green-500 bg-green-500/10 text-green-600"
                      : "border-red-500 bg-red-500/10 text-red-600"
                  }`}
                >
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    {validationResult.valid ? "API Key válida!" : validationResult.message || "API Key inválida"}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleValidateApiKey}
                  disabled={!formData.api_key || validating}
                  className="flex-1"
                >
                  {validating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    "Validar e Continuar"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Configurações Avançadas */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Temperatura */}
              <div className="space-y-2">
                <Label>Temperatura (Criatividade)</Label>
                <TemperatureSlider
                  value={formData.temperature || 0.7}
                  onChange={(v) => setFormData({ ...formData, temperature: v })}
                />
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label htmlFor="max_tokens">Tamanho Máximo de Resposta (tokens)</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  min={100}
                  max={4000}
                  step={100}
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Quanto maior, mais detalhadas serão as respostas (custo maior)
                </p>
              </div>

              {/* Estilo de Resposta */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="response_style">Estilo de Resposta</Label>
                  <Select
                    value={formData.response_style}
                    onValueChange={(v: any) => setFormData({ ...formData, response_style: v })}
                  >
                    <SelectTrigger id="response_style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">{LABELS.responseStyle.short}</SelectItem>
                      <SelectItem value="medium">{LABELS.responseStyle.medium}</SelectItem>
                      <SelectItem value="long">{LABELS.responseStyle.long}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="response_tone">Tom de Voz</Label>
                  <Select
                    value={formData.response_tone}
                    onValueChange={(v: any) => setFormData({ ...formData, response_tone: v })}
                  >
                    <SelectTrigger id="response_tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">{LABELS.responseTone.formal}</SelectItem>
                      <SelectItem value="friendly">{LABELS.responseTone.friendly}</SelectItem>
                      <SelectItem value="casual">{LABELS.responseTone.casual}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prompt do Sistema */}
              <div className="space-y-2">
                <Label>Prompt do Sistema</Label>
                <PromptEditor
                  value={formData.system_prompt || DEFAULT_SYSTEM_PROMPT}
                  onChange={(v) => setFormData({ ...formData, system_prompt: v })}
                />
              </div>
            </div>
          )}
        </div>

        {step === 3 && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Provedor"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
🎨 5.6 - Componente: TemperatureSlider.tsx
typescript
// src/pages/Settings/components/TemperatureSlider.tsx

import { Slider } from "@/components/ui/slider";
import { Snowflake, Flame } from "lucide-react";

interface TemperatureSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function TemperatureSlider({ value, onChange }: TemperatureSliderProps) {
  const getTemperatureLabel = (temp: number) => {
    if (temp <= 0.3) return "Muito Conservadora";
    if (temp <= 0.5) return "Conservadora";
    if (temp <= 0.7) return "Balanceada";
    if (temp <= 1.0) return "Criativa";
    if (temp <= 1.5) return "Muito Criativa";
    return "Extremamente Criativa";
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 0.5) return "text-blue-500";
    if (temp <= 1.0) return "text-green-500";
    if (temp <= 1.5) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Snowflake className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-muted-foreground">Precisa</span>
        </div>
        <div className={`font-semibold ${getTemperatureColor(value)}`}>
          {value.toFixed(2)} - {getTemperatureLabel(value)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Criativa</span>
          <Flame className="h-4 w-4 text-red-500" />
        </div>
      </div>

      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={2}
        step={0.05}
        className="w-full"
      />

      <div className="rounded-lg bg-muted p-3 text-sm">
        <p className="text-muted-foreground">
          <strong>Temperatura {value <= 0.5 ? "baixa" : value <= 1.0 ? "média" : "alta"}:</strong>{" "}
          {value <= 0.5 &&
            "Respostas mais determinísticas e focadas. Ideal para análises financeiras precisas."}
          {value > 0.5 &&
            value <= 1.0 &&
            "Equilíbrio entre precisão e criatividade. Recomendado para a maioria dos casos."}
          {value > 1.0 &&
            "Respostas mais variadas e criativas. Use com cuidado em análises financeiras."}
        </p>
      </div>
    </div>
  );
}
🎨 5.7 - Componente: PromptEditor.tsx
typescript
// src/pages/Settings/components/PromptEditor.tsx

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const DEFAULT_PROMPT = `Você é Ana Clara, uma assistente financeira virtual especializada em educação financeira pessoal. Seu objetivo é ajudar usuários a organizarem suas finanças, aprenderem sobre investimentos e alcançarem suas metas financeiras de forma simples e amigável.

Características:
- Seja sempre educada, empática e encorajadora
- Use exemplos práticos e relatos do dia a dia
- Evite jargões técnicos complexos
- Forneça conselhos práticos e acionáveis
- Celebre as conquistas financeiras dos usuários`;

export default function PromptEditor({ value, onChange }: PromptEditorProps) {
  const [showTips, setShowTips] = useState(false);
  const characterCount = value.length;
  const lineCount = value.split("\n").length;

  const handleReset = () => {
    onChange(DEFAULT_PROMPT);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{characterCount} caracteres</Badge>
          <Badge variant="outline">{lineCount} linhas</Badge>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowTips(!showTips)}>
            <Info className="mr-2 h-4 w-4" />
            {showTips ? "Ocultar" : "Dicas"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar
          </Button>
        </div>
      </div>

      {showTips && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Dicas para personalizar o prompt:</strong>
            <ul className="ml-4 mt-2 list-disc space-y-1">
              <li>Defina a personalidade e tom da Ana Clara</li>
              <li>Inclua diretrizes sobre como abordar tópicos financeiros</li>
              <li>Especifique o nível de detalhe desejado nas respostas</li>
              <li>Adicione restrições sobre o que a Ana Clara deve evitar</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite o prompt do sistema..."
        className="min-h-[300px] font-mono text-sm"
      />

      <p className="text-xs text-muted-foreground">
        Este prompt será usado em todas as interações com a Ana Clara. Seja específico sobre o comportamento
        esperado.
      </p>
    </div>
  );
}
🎨 5.8 - Tab: WebhooksSettings.tsx
typescript
// src/pages/Settings/tabs/WebhooksSettings.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Webhook, AlertCircle } from "lucide-react";
import { useWebhooks } from "@/hooks/useWebhooks";
import { DataTable } from "@/components/ui/data-table";
import WebhookForm from "../components/WebhookForm";
import WebhookLogsList from "../components/WebhookLogsList";
import { webhooksColumns } from "../components/WebhooksColumns";

export default function WebhooksSettings() {
  const { webhooks, logs, loading, fetchLogs } = useWebhooks();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  const handleViewLogs = (webhookId: string) => {
    setSelectedWebhook(webhookId);
    fetchLogs(webhookId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-6 w-6 text-blue-500" />
            Webhooks & N8N
          </CardTitle>
          <CardDescription className="text-base">
            Configure endpoints para integrar com N8N e automatizar fluxos financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border bg-background/50 px-4 py-2">
              <span className="text-sm font-medium">{webhooks.length} webhooks configurados</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-background/50 px-4 py-2">
              <span className="text-sm font-medium">
                {webhooks.filter((w) => w.is_active).length} ativos
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Webhooks */}
      {webhooks.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Webhooks Configurados</CardTitle>
              <CardDescription>Gerencie seus endpoints e visualize logs</CardDescription>
            </div>
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Webhook
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={webhooksColumns(handleViewLogs)}
              data={webhooks}
              searchKey="name"
              searchPlaceholder="Buscar webhook..."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhum webhook configurado</h3>
            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              Configure webhooks para integrar com N8N e automatizar processos como lançamentos, alertas e
              relatórios.
            </p>
            <Button onClick={() => setFormOpen(true)} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Configurar Primeiro Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Logs */}
      {selectedWebhook && (
        <Card>
          <CardHeader>
            <CardTitle>Logs do Webhook</CardTitle>
            <CardDescription>Últimas 100 chamadas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookLogsList webhookId={selectedWebhook} logs={logs} />
          </CardContent>
        </Card>
      )}

      {/* Webhook Form Dialog */}
      <WebhookForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
🎨 5.9 - Tab: NotificationsSettings.tsx
typescript
// src/pages/Settings/tabs/NotificationsSettings.tsx

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "[/components/ui/card";](cci:4://file:///components/ui/card";:0:0-0:0)
import { Label } from "[/components/ui/label";](cci:4://file:///components/ui/label";:0:0-0:0)
import { Switch } from "[/components/ui/switch";](cci:4://file:///components/ui/switch";:0:0-0:0)
import { Button } from "[/components/ui/button";](cci:4://file:///components/ui/button";:0:0-0:0)
import { Input } from "[/components/ui/input";](cci:4://file:///components/ui/input";:0:0-0:0)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "[/components/ui/select";](cci:4://file:///components/ui/select";:0:0-0:0)
import { Bell, Clock, Moon, Smartphone, Mail, MessageCircle, TrendingUp, Target, Award } from "lucide-react";
import { useSettings } from "[/hooks/useSettings";](cci:4://file:///hooks/useSettings";:0:0-0:0)
import { LABELS } from "[/types/settings.types";](cci:4://file:///types/settings.types";:0:0-0:0)
import type { NotificationPreferences } from "[/types/settings.types";](cci:4://file:///types/settings.types";:0:0-0:0)

interface NotificationsSettingsProps {
  preferences?: NotificationPreferences;
}

export default function NotificationsSettings({ preferences }: NotificationsSettingsProps) {
  const { updateNotificationPreferences } = useSettings();
  const [formData, setFormData] = useState({
    push_enabled: preferences?.push_enabled ?? true,
    email_enabled: preferences?.email_enabled ?? true,
    whatsapp_enabled: preferences?.whatsapp_enabled ?? false,
    do_not_disturb_enabled: preferences?.do_not_disturb_enabled ?? false,
    do_not_disturb_start_time: preferences?.do_not_disturb_start_time || "22:00",
    do_not_disturb_end_time: preferences?.do_not_disturb_end_time || "08:00",
    daily_summary_enabled: preferences?.daily_summary_enabled ?? true,
    daily_summary_time: preferences?.daily_summary_time || "20:00",
    weekly_summary_enabled: preferences?.weekly_summary_enabled ?? true,
    weekly_summary_day_of_week: preferences?.weekly_summary_day_of_week ?? 0,
    weekly_summary_time: preferences?.weekly_summary_time || "09:00",
    monthly_summary_enabled: preferences?.monthly_summary_enabled ?? true,
    monthly_summary_day_of_month: preferences?.monthly_summary_day_of_month ?? 1,
    monthly_summary_time: preferences?.monthly_summary_time || "09:00",
    bill_reminders_enabled: preferences?.bill_reminders_enabled ?? true,
    bill_reminders_days_before: preferences?.bill_reminders_days_before ?? 3,
    budget_alerts_enabled: preferences?.budget_alerts_enabled ?? true,
    budget_alert_threshold_percentage: preferences?.budget_alert_threshold_percentage ?? 90,
    goal_milestones_enabled: preferences?.goal_milestones_enabled ?? true,
    achievements_enabled: preferences?.achievements_enabled ?? true,
    ana_tips_enabled: preferences?.ana_tips_enabled ?? true,
    ana_tips_frequency: preferences?.ana_tips_frequency || "daily",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateNotificationPreferences(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Canais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>Escolha como deseja receber notificações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-blue-500" />
              <div>
                <Label htmlFor="push_enabled" className="text-base">
                  Notificações Push
                </Label>
                <p className="text-sm text-muted-foreground">Receba alertas no aplicativo</p>
              </div>
            </div>
            <Switch
              id="push_enabled"
              checked={formData.push_enabled}
              onCheckedChange={(v) => setFormData({ ...formData, push_enabled: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-green-500" />
              <div>
                <Label htmlFor="email_enabled" className="text-base">
                  E-mail
                </Label>
                <p className="text-sm text-muted-foreground">Receba resumos e alertas por e-mail</p>
              </div>

✅ BACKEND CONCLUÍDO

Database (6 tabelas)
✅ user_settings - Preferências gerais
✅ ai_provider_configs - Configuração de IA
✅ integration_configs - WhatsApp, Google Calendar, Tick Tick
✅ webhook_endpoints - N8N webhooks
✅ webhook_logs - Histórico de chamadas
✅ notification_preferences - Preferências de notificação

Edge Functions (6 functions)
✅ get-user-settings
✅ update-ai-config
✅ validate-api-key
✅ test-webhook-connection
✅ trigger-webhook
✅ update-webhook

TypeScript Types
✅ settings.types.ts - Todos os tipos e labels

React Hooks
✅ useSettings.ts
✅ useAIProviders.ts
✅ useWebhooks.ts