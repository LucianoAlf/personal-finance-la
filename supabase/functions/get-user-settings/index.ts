// Edge Function: get-user-settings
// Responsabilidade: Retorna TODAS as configurações do usuário

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
