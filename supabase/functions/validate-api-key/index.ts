// Edge Function: validate-api-key
// Responsabilidade: Valida API Key de provedores de IA fazendo uma chamada de teste

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ValidateRequest {
  provider: "openai" | "gemini" | "claude" | "openrouter";
  api_key: string;
  model_name?: string;
}

async function parseErrorMessage(response: Response, fallback: string) {
  let msg = fallback;
  try {
    const raw = await response.text();
    try {
      const error = JSON.parse(raw);
      msg = error.error?.message || error.message || msg;
    } catch (_) {
      msg = raw || msg;
    }
  } catch (_) {}
  return msg;
}

async function validateOpenAI(apiKey: string, model: string = "gpt-5-mini") {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: "Responda apenas com OK",
      max_output_tokens: 16,
    }),
  });

  if (!response.ok) {
    const msg = await parseErrorMessage(response, "Falha ao validar OpenAI");
    return { valid: false, error: msg } as const;
  }

  const data = await response.json();
  return {
    valid: true,
    message: "API Key válida",
    tested_model: model,
    responded_model: data.model || model,
  } as const;
}

async function validateGemini(apiKey: string, model: string = "gemini-3-flash-preview") {
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
    const msg = await parseErrorMessage(response, "Falha ao validar Gemini");
    return { valid: false, error: msg } as const;
  }

  const data = await response.json();
  return {
    valid: true,
    message: "API Key válida",
    tested_model: model,
    responded_model: data.modelVersion || model,
  } as const;
}

async function validateClaude(apiKey: string, model: string = "claude-sonnet-4-6") {
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
    const msg = await parseErrorMessage(response, "Falha ao validar Claude");
    return { valid: false, error: msg } as const;
  }

  const data = await response.json();
  return {
    valid: true,
    message: "API Key válida",
    tested_model: model,
    responded_model: data.model || model,
  } as const;
}

async function validateOpenRouter(apiKey: string, model: string = "minimax/minimax-m2.7") {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Responda apenas com OK" }],
      max_tokens: 16,
    }),
  });

  if (!response.ok) {
    const msg = await parseErrorMessage(response, "Falha ao validar OpenRouter");
    return { valid: false, error: msg } as const;
  }

  const data = await response.json();
  return { 
    valid: true, 
    message: "API Key válida",
    tested_model: model,
    responded_model: data.model || model,
    credits: data.usage?.total_tokens || 0,
  } as const;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Extrai o header Authorization e garante propagação global para RLS
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autenticado (sem Authorization)" }),
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

    // Decodifica o JWT para extrair o user_id (sub)
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
    let body: ValidateRequest;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch (parseError) {
      console.error("Invalid JSON payload:", rawBody, parseError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Payload inválido. Envie JSON com provider e api_key.' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body?.provider || !body?.api_key) {
      return new Response(
        JSON.stringify({ valid: false, error: "provider e api_key são obrigatórios" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /** Sem renomeação silenciosa; catálogo em `AI_MODELS` (frontend). */
    const resolvedModelName = body.model_name;

    let result: {
      valid: boolean;
      message?: string;
      error?: string;
      credits?: number;
      tested_model?: string;
      responded_model?: string;
    };

    switch (body.provider) {
      case "openai":
        result = await validateOpenAI(body.api_key, resolvedModelName);
        break;
      case "gemini":
        result = await validateGemini(body.api_key, resolvedModelName);
        break;
      case "claude":
        result = await validateClaude(body.api_key, resolvedModelName);
        break;
      case "openrouter":
        result = await validateOpenRouter(body.api_key, resolvedModelName);
        break;
      default:
        throw new Error("Provedor não suportado");
    }

    // Recupera configuração existente (se houver) para preservar ID e modelo
    const { data: existingConfig } = await supabaseClient
      .from("ai_provider_configs")
      .select("id, model_name, api_key_encrypted")
      .eq("user_id", userId)
      .eq("provider", body.provider)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const modelNameToPersist =
      result.tested_model || resolvedModelName || existingConfig?.model_name || "default";

    if (existingConfig?.id) {
      // Update direto na linha mais recente
      const { error: updateError } = await supabaseClient
        .from("ai_provider_configs")
        .update({
          model_name: modelNameToPersist,
          is_validated: result.valid,
          last_validated_at: new Date().toISOString(),
          validation_error: result.valid ? null : (result.error ?? null),
          api_key_encrypted: body.api_key,
          api_key_last_4: body.api_key.slice(-4),
        })
        .eq("id", existingConfig.id);

      if (updateError) {
        console.error("Update error:", updateError);
      }
    } else {
      // Insert quando não há config ainda
      const { error: insertError } = await supabaseClient
        .from("ai_provider_configs")
        .insert({
          user_id: userId,
          provider: body.provider,
          model_name: modelNameToPersist,
          is_validated: result.valid,
          last_validated_at: new Date().toISOString(),
          validation_error: result.valid ? null : (result.error ?? null),
          api_key_encrypted: body.api_key,
          api_key_last_4: body.api_key.slice(-4),
          is_active: true,
          is_default: false,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        requested_model: body.model_name ?? null,
        resolved_model: resolvedModelName ?? null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in validate-api-key:", error);

    // Erros inesperados (payload inválido, sem auth, exceções)
    return new Response(
      JSON.stringify({ valid: false, error: error.message || "Erro inesperado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
