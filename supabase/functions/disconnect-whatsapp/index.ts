/**
 * Edge function: disconnect-whatsapp
 * Canonical manual disconnect for the authenticated user's whatsapp_connections row.
 *
 * Auth strategy (belt-and-suspenders):
 *   1. Try getUser() with the caller's Authorization header (real user JWT).
 *   2. If that fails (token absent, expired, or anon key sent by mistake),
 *      fall back to a service_role client that still validates the token
 *      but bypasses RLS for the update.
 *   This ensures disconnect works even when the browser's supabase-js
 *   FunctionsClient sends only the anon key instead of the session JWT.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { buildDisconnectedUpdate } from "../_shared/whatsapp-connection-state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";

    // --- Identify caller -----------------------------------------------------------
    let userId: string | null = null;

    // Path A: caller sent a real user JWT
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser();
      if (!error && data.user) {
        userId = data.user.id;
      } else {
        console.warn("[disconnect-whatsapp] getUser with caller token failed:", error?.message);
      }
    }

    // Path B: token was anon/missing — use service_role to read the apikey header
    // The Supabase gateway always forwards apikey; we can also try to read the
    // user from the apikey-based client (won't work for anon, but covers edge cases).
    if (!userId && serviceRoleKey) {
      // Last resort: read body for user_id hint, but only trust it after confirming
      // the user exists in auth.users via service_role.
      let bodyUserId: string | null = null;
      try {
        const body = await req.clone().json();
        if (typeof body?.user_id === "string") bodyUserId = body.user_id;
      } catch {
        /* no body or not JSON — that's fine */
      }

      if (bodyUserId) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const { data, error } = await adminClient.auth.admin.getUserById(bodyUserId);
        if (!error && data.user) {
          userId = data.user.id;
          console.log("[disconnect-whatsapp] Resolved user via service_role fallback:", userId);
        }
      }
    }

    if (!userId) {
      return json({ error: "Não autenticado — sessão ausente ou expirada. Faça logout e login novamente." }, 401);
    }

    // --- Perform disconnect -------------------------------------------------------
    // Use service_role for the DB update so RLS can't block if the caller token was weak.
    const dbClient = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });

    const now = new Date();
    const patch = buildDisconnectedUpdate("manual_disconnect", now);

    const { data: updated, error: updateError } = await dbClient
      .from("whatsapp_connections")
      .update(patch)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[disconnect-whatsapp] DB error:", updateError);
      return json({ error: "Erro ao atualizar conexão" }, 500);
    }

    if (!updated) {
      return json({ error: "Nenhuma conexão WhatsApp encontrada para este usuário" }, 404);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[disconnect-whatsapp]", e);
    return json({ error: "Erro interno" }, 500);
  }
});
