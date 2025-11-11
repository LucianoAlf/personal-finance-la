// Edge Function: validate-api-key
// Responsabilidade: Valida API Key de provedores de IA fazendo uma chamada de teste

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
  } catch (error: any) {
    console.error("Error in validate-api-key:", error);

    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
