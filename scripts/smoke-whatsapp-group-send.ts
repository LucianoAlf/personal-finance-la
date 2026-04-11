#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Smoke: chama send-whatsapp-message com chat_jid do grupo (UAZAPI /send/text).
 *
 * Uso (na raiz do repo, com secrets no ambiente):
 *   $env:SUPABASE_URL="https://sbnpmhmvcspwcyjhftlw.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   $env:SMOKE_WHATSAPP_USER_ID="68dc8ee5-a710-4116-8f18-af9ac3e8ed36"   # opcional
 *   deno run --allow-net --allow-env scripts/smoke-whatsapp-group-send.ts "Ping grupo Ana Clara"
 *
 * Sucesso: HTTP 200 e JSON com success:true — a mensagem deve aparecer no grupo WhatsApp.
 */

const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const userId =
  Deno.env.get("SMOKE_WHATSAPP_USER_ID") ??
  "68dc8ee5-a710-4116-8f18-af9ac3e8ed36";
const chatJid =
  Deno.env.get("SMOKE_GROUP_JID") ?? "5521981278047-1555326211@g.us";

const text = Deno.args.join(" ").trim() || "Smoke test: Ana Clara grupo (envio via send-whatsapp-message).";

if (!url || !key) {
  console.error(
    "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (service role, não anon).",
  );
  Deno.exit(1);
}

const endpoint = `${url.replace(/\/$/, "")}/functions/v1/send-whatsapp-message`;
const body = {
  user_id: userId,
  chat_jid: chatJid,
  message_type: "text",
  content: text,
};

console.log("POST", endpoint);
console.log("Body:", JSON.stringify({ ...body, content: text.slice(0, 80) + (text.length > 80 ? "…" : "") }));

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify(body),
});

const raw = await res.text();
console.log("Status:", res.status);
try {
  console.log("Response:", JSON.stringify(JSON.parse(raw), null, 2));
} catch {
  console.log("Response (raw):", raw);
}

if (!res.ok) Deno.exit(1);
