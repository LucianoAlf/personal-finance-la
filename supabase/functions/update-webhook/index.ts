// Edge Function: update-webhook
// Responsabilidade: CRUD de webhooks (create, update, delete)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookRequest {
  id?: string; // For update/delete
  action: "create" | "update" | "delete";
  name?: string;
  description?: string;
  url?: string;
  http_method?: string;
  auth_type?: string;
  auth_token_encrypted?: string;
  auth_username?: string;
  auth_password_encrypted?: string;
  custom_headers?: Record<string, string>;
  retry_enabled?: boolean;
  retry_max_attempts?: number;
  retry_delay_seconds?: number;
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

    const body: WebhookRequest = await req.json();

    // CREATE
    if (body.action === "create") {
      if (!body.name || !body.url) {
        return new Response(
          JSON.stringify({ error: "name e url são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseClient
        .from("webhook_endpoints")
        .insert({
          user_id: user.id,
          name: body.name,
          description: body.description,
          url: body.url,
          http_method: body.http_method || "POST",
          auth_type: body.auth_type || "none",
          auth_token_encrypted: body.auth_token_encrypted,
          auth_username: body.auth_username,
          auth_password_encrypted: body.auth_password_encrypted,
          custom_headers: body.custom_headers || {},
          retry_enabled: body.retry_enabled ?? true,
          retry_max_attempts: body.retry_max_attempts || 3,
          retry_delay_seconds: body.retry_delay_seconds || 60,
          is_active: body.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }

    // UPDATE
    if (body.action === "update") {
      if (!body.id) {
        return new Response(
          JSON.stringify({ error: "id é obrigatório para update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: any = {};
      if (body.name) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.url) updateData.url = body.url;
      if (body.http_method) updateData.http_method = body.http_method;
      if (body.auth_type) updateData.auth_type = body.auth_type;
      if (body.auth_token_encrypted !== undefined) updateData.auth_token_encrypted = body.auth_token_encrypted;
      if (body.auth_username !== undefined) updateData.auth_username = body.auth_username;
      if (body.auth_password_encrypted !== undefined) updateData.auth_password_encrypted = body.auth_password_encrypted;
      if (body.custom_headers !== undefined) updateData.custom_headers = body.custom_headers;
      if (body.retry_enabled !== undefined) updateData.retry_enabled = body.retry_enabled;
      if (body.retry_max_attempts !== undefined) updateData.retry_max_attempts = body.retry_max_attempts;
      if (body.retry_delay_seconds !== undefined) updateData.retry_delay_seconds = body.retry_delay_seconds;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;

      const { data, error } = await supabaseClient
        .from("webhook_endpoints")
        .update(updateData)
        .eq("id", body.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // DELETE
    if (body.action === "delete") {
      if (!body.id) {
        return new Response(
          JSON.stringify({ error: "id é obrigatório para delete" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabaseClient
        .from("webhook_endpoints")
        .delete()
        .eq("id", body.id)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
