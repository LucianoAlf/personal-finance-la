/**
 * EDGE FUNCTION: send-whatsapp-message
 * v8 - Alinhado à conexão canônica + resolução DB-first de token
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SendWhatsAppRequest {
  user_id?: string;
  phone_number?: string;
  /** Destino grupo WhatsApp (ex.: 5521...@g.us). Exige user_id para resolver a conexão. */
  chat_jid?: string;
  message_type?: string;
  content?: string;
}

export interface WhatsAppConnectionRow {
  user_id?: string;
  phone_number?: string | null;
  instance_token?: string | null;
  connected?: boolean | null;
  status?: string | null;
}

export interface UazapiEnvConfig {
  UAZAPI_BASE_URL?: string;
  UAZAPI_SERVER_URL?: string;
  UAZAPI_INSTANCE_TOKEN?: string;
  UAZAPI_TOKEN?: string;
  UAZAPI_API_KEY?: string;
}

function cleanPhoneNumber(phoneNumber?: string | null): string {
  return phoneNumber?.replace(/\D/g, "") ?? "";
}

function readUazapiEnv(): UazapiEnvConfig {
  return {
    UAZAPI_BASE_URL: Deno.env.get("UAZAPI_BASE_URL") ?? undefined,
    UAZAPI_SERVER_URL: Deno.env.get("UAZAPI_SERVER_URL") ?? undefined,
    UAZAPI_INSTANCE_TOKEN: Deno.env.get("UAZAPI_INSTANCE_TOKEN") ?? undefined,
    UAZAPI_TOKEN: Deno.env.get("UAZAPI_TOKEN") ?? undefined,
    UAZAPI_API_KEY: Deno.env.get("UAZAPI_API_KEY") ?? undefined,
  };
}

function readSupabaseEnv(): {
  supabaseUrl?: string;
  serviceRoleKey?: string;
} {
  return {
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? undefined,
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? undefined,
  };
}

export function resolveOutboundWhatsAppConfig(
  request: SendWhatsAppRequest,
  connection: WhatsAppConnectionRow | null | undefined,
  env: UazapiEnvConfig,
): { baseUrl: string; token: string; phoneNumber: string } {
  if (!connection) {
    throw new Error("WhatsApp connection not found");
  }

  if (connection.connected !== true || connection.status !== "connected") {
    throw new Error("WhatsApp connection is not ready");
  }

  const trimmedJid = request.chat_jid?.trim();
  if (trimmedJid) {
    if (!request.user_id?.trim()) {
      throw new Error("user_id is required when sending to chat_jid");
    }
    const phoneNumber = trimmedJid;
    const token = connection.instance_token ||
      env.UAZAPI_INSTANCE_TOKEN ||
      env.UAZAPI_TOKEN ||
      env.UAZAPI_API_KEY;
    if (!token?.trim()) {
      throw new Error("UAZAPI token missing");
    }
    const baseUrl = (
      env.UAZAPI_BASE_URL ||
      env.UAZAPI_SERVER_URL ||
      "https://api.uazapi.com"
    ).replace(/\/$/, "");
    return { baseUrl, token, phoneNumber };
  }

  const phoneNumber = cleanPhoneNumber(request.phone_number) ||
    cleanPhoneNumber(connection.phone_number);
  if (!phoneNumber) {
    throw new Error("phone_number is required");
  }

  const token = connection.instance_token ||
    env.UAZAPI_INSTANCE_TOKEN ||
    env.UAZAPI_TOKEN ||
    env.UAZAPI_API_KEY;
  if (!token?.trim()) {
    throw new Error("UAZAPI token missing");
  }

  const baseUrl = (
    env.UAZAPI_BASE_URL ||
    env.UAZAPI_SERVER_URL ||
    "https://api.uazapi.com"
  ).replace(/\/$/, "");

  return {
    baseUrl,
    token,
    phoneNumber,
  };
}

async function findCanonicalConnection(
  supabase: any,
  request: SendWhatsAppRequest,
): Promise<WhatsAppConnectionRow | null> {
  if (request.user_id) {
    const { data, error } = await supabase
      .from("whatsapp_connections")
      .select("user_id, phone_number, instance_token, connected, status")
      .eq("user_id", request.user_id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  const normalizedPhone = cleanPhoneNumber(request.phone_number);
  if (!normalizedPhone) {
    return null;
  }

  const { data, error } = await supabase
    .from("whatsapp_connections")
    .select("user_id, phone_number, instance_token, connected, status")
    .eq("phone_number", normalizedPhone)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // phone_number na tabela é o número da *instância* (linha do WhatsApp), não o do remetente.
  // Chamadas internas costumam mandar só o telefone de quem escreveu — aí a linha acima não acha nada.
  // Se existir exatamente uma conexão conectada, usamos ela (caso típico single-tenant / uma Ana por projeto).
  const { data: connectedList, error: listErr } = await supabase
    .from("whatsapp_connections")
    .select("user_id, phone_number, instance_token, connected, status")
    .eq("connected", true)
    .eq("status", "connected");

  if (listErr) throw listErr;
  if (connectedList?.length === 1) {
    return connectedList[0];
  }

  return null;
}

export async function handleRequest(req: Request): Promise<Response> {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  try {
    const { supabaseUrl, serviceRoleKey } = readSupabaseEnv();
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service credentials are not configured");
    }

    const request = await req.json() as SendWhatsAppRequest;
    const destinoLog =
      request.chat_jid?.trim() || request.phone_number || "(via conexão)";
    console.log("📤 Enviando mensagem WhatsApp");
    console.log("📱 Destino:", destinoLog);
    console.log("💬 Tipo:", request.message_type);
    console.log("📝 Preview:", request.content?.substring(0, 50) + "...");

    const content = request.content;
    if (!content) {
      throw new Error("content é obrigatório");
    }
    if (!request.user_id && !request.phone_number && !request.chat_jid?.trim()) {
      throw new Error("user_id ou phone_number ou chat_jid é obrigatório");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const connection = await findCanonicalConnection(supabase, request);
    const { baseUrl, token, phoneNumber } = resolveOutboundWhatsAppConfig(
      request,
      connection,
      readUazapiEnv(),
    );

    // UAZAPI POST /send/text: campo `number` aceita E.164 (só dígitos) ou JID completo.
    // Grupos WhatsApp: usar JID terminado em @g.us (ex.: 5521981278047-1555326211@g.us).
    console.log("🔄 Chamando UAZAPI...");
    console.log("📍 URL:", `${baseUrl}/send/text`);
    console.log("📞 Recipient (number):", phoneNumber);

    const response = await fetch(`${baseUrl}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: content,
        linkPreview: false,
      }),
    });
    const statusCode = response.status;
    console.log("📡 Status UAZAPI:", statusCode);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro UAZAPI:", errorText);
      let errorData: { message?: string; error?: string };
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {
          message: errorText,
        };
      }
      throw new Error(
        `UAZAPI ${statusCode}: ${errorData.message || errorData.error || errorText}`,
      );
    }
    const result = await response.json();
    console.log("✅ Resposta UAZAPI:", JSON.stringify(result, null, 2));
    const messageId = result.key?.id || result.messageId || result.id || "sent";
    console.log("✨ Mensagem enviada com sucesso! ID:", messageId);
    return new Response(JSON.stringify({
      success: true,
      message_id: messageId,
      phone: phoneNumber,
      uazapi_response: result,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Erro fatal:", err.message);
    console.error("📚 Stack:", err.stack);
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      details: err.stack,
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

if (import.meta.main) {
  serve(handleRequest);
}
