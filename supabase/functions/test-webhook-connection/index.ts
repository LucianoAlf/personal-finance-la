// Edge Function: test-webhook-connection
// Responsabilidade: Testa conexão com webhook fazendo uma chamada de teste

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

    // Criar log usando service role
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
  } catch (error: any) {
    console.error("Error in test-webhook-connection:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
