// Edge Function: update-ai-config
// Responsabilidade: Atualiza/Cria configuração de provedor de IA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    try {
      const base64 = jwt.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
      const payloadJson = atob(base64 || "");
      const payload = JSON.parse(payloadJson);
      userId = payload?.sub || null;
    } catch (_) {}

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawBody = await req.text();
    let body: UpdateAIConfigRequest;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch (parseError) {
      console.error("Invalid JSON payload:", rawBody, parseError);
      return new Response(
        JSON.stringify({ error: "Payload inválido. Envie JSON com provider e model_name." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validações
    if (!body.provider || !body.model_name) {
      return new Response(
        JSON.stringify({ error: "provider e model_name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar configuração existente (mais recente) para preservar campos não enviados
    const { data: existing } = await supabaseClient
      .from("ai_provider_configs")
      .select("id, is_default, is_active, api_key_encrypted, is_validated, validation_error, temperature, max_tokens, response_style, response_tone, system_prompt")
      .eq("user_id", userId)
      .eq("provider", body.provider)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Preparar dados para upsert preservando valores existentes
    const configData: any = {
      user_id: userId,
      provider: body.provider,
      model_name: body.model_name,
      temperature: body.temperature ?? existing?.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? existing?.max_tokens ?? 1000,
      response_style: body.response_style ?? existing?.response_style ?? "medium",
      response_tone: body.response_tone ?? existing?.response_tone ?? "friendly",
      system_prompt: body.system_prompt ?? existing?.system_prompt,
      is_default: body.is_default ?? existing?.is_default ?? false,
      is_active: body.is_active ?? existing?.is_active ?? true,
    };

    // Se API Key foi fornecida, processar
    if (body.api_key) {
      // Extrair últimos 4 dígitos
      configData.api_key_last_4 = body.api_key.slice(-4);
      
      // IMPORTANTE: Em produção, usar Supabase Vault para criptografar
      // Por enquanto, armazenar diretamente (TEMPORÁRIO)
      configData.api_key_encrypted = body.api_key;
      
      // Verificar se a chave mudou comparando com a existente
      // Só resetar validação se a chave realmente mudou
      if (existing && existing.api_key_encrypted !== body.api_key) {
        configData.is_validated = false;
        configData.validation_error = null;
      }
    }

    // Persistência: update por id quando existir; insert caso contrário
    if (existing?.id) {
      const updates: any = {
        model_name: body.model_name,
        temperature: configData.temperature,
        max_tokens: configData.max_tokens,
        response_style: configData.response_style,
        response_tone: configData.response_tone,
        system_prompt: configData.system_prompt,
      };
      if (typeof body.is_active !== 'undefined') updates.is_active = configData.is_active;
      if (typeof body.is_default !== 'undefined') updates.is_default = configData.is_default;
      if (body.api_key) {
        updates.api_key_encrypted = configData.api_key_encrypted;
        updates.api_key_last_4 = configData.api_key_last_4;
        if (configData.is_validated === false) {
          updates.is_validated = false;
          updates.validation_error = null;
        }
      }

      const { data, error } = await supabaseClient
        .from('ai_provider_configs')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data, error } = await supabaseClient
      .from('ai_provider_configs')
      .insert({
        ...configData,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
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
