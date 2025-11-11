// Edge Function: update-ai-config
// Responsabilidade: Atualiza/Cria configuração de provedor de IA

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
