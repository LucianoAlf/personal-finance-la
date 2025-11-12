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

async function validateOpenAI(apiKey: string, _model?: string) {
  // Validação simples e robusta: lista modelos para checar a API Key
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    let msg = "API Key inválida";
    try {
      const raw = await response.text();
      try {
        const error = JSON.parse(raw);
        msg = error.error?.message || error.message || msg;
      } catch (_) {
        msg = raw || msg;
      }
    } catch (_) {}
    return { valid: false, error: msg } as const;
  }

  return { valid: true, message: "API Key válida" } as const;
}

async function validateGemini(apiKey: string, model: string = "gemini-2.5-flash") {
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
    let msg = "API Key inválida";
    try {
      const raw = await response.text();
      try {
        const error = JSON.parse(raw);
        msg = error.error?.message || error.message || msg;
      } catch (_) {
        msg = raw || msg;
      }
    } catch (_) {}
    return { valid: false, error: msg } as const;
  }

  return { valid: true, message: "API Key válida" } as const;
}

async function validateClaude(apiKey: string, model: string = "claude-haiku-4.5") {
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
    let msg = "API Key inválida";
    try {
      const raw = await response.text();
      try {
        const error = JSON.parse(raw);
        msg = error.error?.message || error.message || msg;
      } catch (_) {
        msg = raw || msg;
      }
    } catch (_) {}
    return { valid: false, error: msg } as const;
  }

  return { valid: true, message: "API Key válida" } as const;
}

async function validateOpenRouter(apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    return { valid: false, error: "API Key inválida" } as const;
  }

  const data = await response.json();
  return { 
    valid: true, 
    message: "API Key válida",
    credits: data.data?.limit || 0
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

    let result: { valid: boolean; message?: string; error?: string; credits?: number };

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

    // Upsert: criar ou atualizar status de validação no banco conforme resultado
    const { error: upsertError } = await supabaseClient
      .from("ai_provider_configs")
      .upsert({
        user_id: userId,
        provider: body.provider,
        model_name: body.model_name || "default",
        is_validated: result.valid,
        last_validated_at: new Date().toISOString(),
        validation_error: result.valid ? null : (result.error ?? null),
        api_key_encrypted: body.api_key, // TODO: Criptografar em produção
        api_key_last_4: body.api_key.slice(-4),
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in validate-api-key:", error);

    // Erros inesperados (payload inválido, sem auth, exceções)
    return new Response(
      JSON.stringify({ valid: false, error: error.message || "Erro inesperado" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
