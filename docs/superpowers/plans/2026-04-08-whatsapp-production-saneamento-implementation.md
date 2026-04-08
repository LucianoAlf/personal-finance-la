# WhatsApp Production Saneamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the WhatsApp integration in production by standardizing one canonical connection model, fixing broken runtime paths, making the Integrations UI read real backend truth, and validating the flow on the newly released number before deprecating legacy state.

**Architecture:** Treat `public.whatsapp_connections` as the canonical runtime table for connection state, keep `public.whatsapp_messages` as the canonical message/history/stats source, and keep `public.whatsapp_quick_commands` as the canonical commands source. First fix operational consistency in edge functions and SQL jobs, then align the frontend, then run live validation, and only after that deprecate `public.whatsapp_connection_status`.

**Tech Stack:** React, TypeScript, TanStack Query/Supabase client patterns already present in hooks, Supabase Edge Functions (Deno), Postgres SQL migrations/functions, Vitest for frontend tests, Deno tests for shared edge-function helpers.

---

## File Structure

**Create:**
- `supabase/functions/_shared/whatsapp-connection-state.ts` - one pure module that maps provider events into canonical `whatsapp_connections` updates
- `supabase/functions/_shared/whatsapp-connection-state.test.ts` - Deno regression tests for connection-state mapping
- `supabase/functions/disconnect-whatsapp/index.ts` - canonical backend disconnect endpoint so the UI stops doing DB-only optimistic disconnect
- `src/hooks/useWhatsAppCommands.ts` - loads `whatsapp_quick_commands` for the Integrations tab
- `src/components/whatsapp/WhatsAppCommands.tsx` - DB-backed commands tab renderer
- `src/hooks/__tests__/useWhatsAppMessages.test.ts` - focused stats/history correctness tests
- `src/components/settings/__tests__/integrations-whatsapp.test.tsx` - UI integration tests for WhatsApp state ownership and commands/statistics rendering
- `supabase/migrations/20260408110000_align_whatsapp_runtime.sql` - SQL function alignment and legacy-freezing migration

**Modify:**
- `supabase/functions/webhook-uazapi/index.ts`
- `supabase/functions/generate-qr-code/index.ts`
- `supabase/functions/send-proactive-notifications/index.ts`
- `supabase/functions/send-investment-summary/index.ts`
- `supabase/functions/send-opportunity-notification/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `src/hooks/useWhatsAppConnection.ts`
- `src/hooks/useWhatsAppMessages.ts`
- `src/components/settings/IntegrationsSettings.tsx`
- `src/components/whatsapp/QRCodeModal.tsx`
- `src/components/whatsapp/WhatsAppStats.tsx`
- `src/components/whatsapp/MessageHistory.tsx`
- `src/types/whatsapp.types.ts`

**Inspect during implementation:**
- `supabase/functions/process-whatsapp-message/index.ts`
- `supabase/functions/process-whatsapp-message/utils.ts`
- `supabase/functions/process-whatsapp-message/button-sender.ts`
- `supabase/functions/process-whatsapp-message/audio-handler.ts`
- `supabase/functions/process-whatsapp-message/image-reader.ts`

---

## Task 1: Freeze the Canonical WhatsApp Connection Contract

**Files:**
- Create: `supabase/functions/_shared/whatsapp-connection-state.ts`
- Create: `supabase/functions/_shared/whatsapp-connection-state.test.ts`
- Modify: `src/types/whatsapp.types.ts`
- Test: `supabase/functions/_shared/whatsapp-connection-state.test.ts`

- [ ] **Step 1: Write the failing Deno tests for canonical connection mapping**

```ts
// supabase/functions/_shared/whatsapp-connection-state.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildConnectedUpdate,
  buildDisconnectedUpdate,
  buildConnectingUpdate,
} from "./whatsapp-connection-state.ts";

Deno.test("buildConnectedUpdate maps provider open event into canonical fields", () => {
  assertEquals(buildConnectedUpdate("5521998250178"), {
    connected: true,
    logged_in: true,
    status: "connected",
    phone_number: "5521998250178",
  });
});

Deno.test("buildDisconnectedUpdate maps provider close event into canonical fields", () => {
  const update = buildDisconnectedUpdate("connection_closed");
  assertEquals(update.connected, false);
  assertEquals(update.logged_in, false);
  assertEquals(update.status, "disconnected");
  assertEquals(update.last_disconnect_reason, "connection_closed");
});

Deno.test("buildConnectingUpdate resets QR flow to transitional canonical state", () => {
  assertEquals(buildConnectingUpdate(), {
    connected: false,
    logged_in: false,
    status: "connecting",
  });
});
```

- [ ] **Step 2: Run the Deno tests and confirm they fail**

Run: `deno test supabase/functions/_shared/whatsapp-connection-state.test.ts`

Expected: FAIL with module-not-found or exported symbol errors for `buildConnectedUpdate`, `buildDisconnectedUpdate`, and `buildConnectingUpdate`.

- [ ] **Step 3: Implement the pure canonical state helper**

```ts
// supabase/functions/_shared/whatsapp-connection-state.ts
export type CanonicalConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface CanonicalConnectionUpdate {
  connected?: boolean;
  logged_in?: boolean;
  status?: CanonicalConnectionStatus;
  phone_number?: string | null;
  qr_code?: string | null;
  qr_code_expires_at?: string | null;
  last_disconnect?: string | null;
  last_disconnect_reason?: string | null;
  updated_at?: string;
}

export function buildConnectingUpdate(now = new Date().toISOString()): CanonicalConnectionUpdate {
  return {
    connected: false,
    logged_in: false,
    status: "connecting",
    updated_at: now,
  };
}

export function buildConnectedUpdate(
  phoneNumber: string | null,
  now = new Date().toISOString(),
): CanonicalConnectionUpdate {
  return {
    connected: true,
    logged_in: true,
    status: "connected",
    phone_number: phoneNumber,
    qr_code: null,
    qr_code_expires_at: null,
    updated_at: now,
  };
}

export function buildDisconnectedUpdate(
  reason: string | null,
  now = new Date().toISOString(),
): CanonicalConnectionUpdate {
  return {
    connected: false,
    logged_in: false,
    status: "disconnected",
    last_disconnect: now,
    last_disconnect_reason: reason,
    updated_at: now,
  };
}
```

- [ ] **Step 4: Align the shared frontend type with the canonical shape**

```ts
// src/types/whatsapp.types.ts
export interface WhatsAppConnectionStatus {
  id: string;
  user_id: string;
  instance_id: string;
  instance_token: string;
  status: "disconnected" | "connecting" | "connected" | "error";
  connected: boolean;
  logged_in: boolean;
  phone_number: string | null;
  qr_code: string | null;
  qr_code_expires_at: string | null;
  last_disconnect: string | null;
  last_disconnect_reason: string | null;
  updated_at: string;
}
```

- [ ] **Step 5: Re-run the Deno tests and confirm they pass**

Run: `deno test supabase/functions/_shared/whatsapp-connection-state.test.ts`

Expected: PASS with 3 passing tests.

---

## Task 2: Fix Runtime Writers to Use Only Canonical `whatsapp_connections` Fields

**Files:**
- Modify: `supabase/functions/webhook-uazapi/index.ts`
- Modify: `supabase/functions/generate-qr-code/index.ts`
- Modify: `supabase/functions/send-proactive-notifications/index.ts`
- Modify: `supabase/functions/send-investment-summary/index.ts`
- Modify: `supabase/functions/send-opportunity-notification/index.ts`
- Modify: `supabase/functions/send-whatsapp-message/index.ts`
- Test: `supabase/functions/_shared/whatsapp-connection-state.test.ts`

- [ ] **Step 1: Make the webhook consume the shared canonical state helper**

```ts
// supabase/functions/webhook-uazapi/index.ts
import {
  buildConnectedUpdate,
  buildDisconnectedUpdate,
} from "../_shared/whatsapp-connection-state.ts";

const eventType = payload.EventType || payload.event;
const isConnected = payload.status === "open" || eventType === "qr_scanned" || eventType === "connection";
const phoneNumber = payload.chat?.phone || payload.phone || null;

const updateData = isConnected
  ? buildConnectedUpdate(phoneNumber)
  : buildDisconnectedUpdate(payload.status || eventType || "unknown");

const { error } = await supabase
  .from("whatsapp_connections")
  .update(updateData)
  .eq("user_id", connection.user_id);
```

- [ ] **Step 2: Replace the QR generator’s manual transitional update with the shared helper**

```ts
// supabase/functions/generate-qr-code/index.ts
import { buildConnectingUpdate } from "../_shared/whatsapp-connection-state.ts";

const { error: updateError } = await supabase
  .from("whatsapp_connections")
  .update({
    ...buildConnectingUpdate(),
    qr_code: qrPayload,
    qr_code_expires_at: expiresAt,
  })
  .eq("user_id", userId);
```

- [ ] **Step 3: Standardize the “ready to send” query across outbound edge functions**

```ts
// use this query shape consistently in send-proactive-notifications, send-investment-summary,
// send-opportunity-notification, and any similar sender
const { data: connection } = await supabase
  .from("whatsapp_connections")
  .select("phone_number, instance_token, connected, logged_in, status")
  .eq("user_id", userId)
  .single();

if (!connection?.connected || connection.status !== "connected") {
  throw new Error("WhatsApp não está conectado");
}
```

- [ ] **Step 4: Standardize token/base URL resolution for all outbound senders**

```ts
function resolveUazapiRuntime(connection?: { instance_token?: string | null }) {
  const baseUrl = (Deno.env.get("UAZAPI_BASE_URL") || Deno.env.get("UAZAPI_SERVER_URL") || "https://api.uazapi.com").replace(/\/$/, "");
  const token = connection?.instance_token || Deno.env.get("UAZAPI_INSTANCE_TOKEN") || Deno.env.get("UAZAPI_TOKEN") || Deno.env.get("UAZAPI_API_KEY");

  if (!token) throw new Error("UAZAPI token não configurado");

  return { baseUrl, token };
}
```

- [ ] **Step 5: Run the focused Deno tests again**

Run: `deno test supabase/functions/_shared/whatsapp-connection-state.test.ts`

Expected: PASS. No test should reference `is_connected`, `connected_at`, or `disconnected_at`.

---

## Task 3: Move Disconnect/Reconnect to a Real Backend Contract

**Files:**
- Create: `supabase/functions/disconnect-whatsapp/index.ts`
- Modify: `src/hooks/useWhatsAppConnection.ts`
- Test: `src/components/settings/__tests__/integrations-whatsapp.test.tsx`

- [ ] **Step 1: Write the failing frontend test for disconnect behavior**

```tsx
// src/components/settings/__tests__/integrations-whatsapp.test.tsx
it("disconnects through the backend and refreshes canonical row", async () => {
  vi.spyOn(supabase.functions, "invoke").mockResolvedValueOnce({
    data: { success: true },
    error: null,
  } as any);

  // render IntegrationsSettings with connected WhatsApp state,
  // click "Desconectar", assert invoke("disconnect-whatsapp") was called
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`

Expected: FAIL because the hook still performs a direct `.from('whatsapp_connections').update(...)`.

- [ ] **Step 3: Create a backend disconnect function**

```ts
// supabase/functions/disconnect-whatsapp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { buildDisconnectedUpdate } from "../_shared/whatsapp-connection-state.ts";

serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });

  const { error } = await supabase
    .from("whatsapp_connections")
    .update(buildDisconnectedUpdate("manual_disconnect"))
    .eq("user_id", user.id);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

- [ ] **Step 4: Update the hook to call the new function and refresh canonical state**

```ts
// src/hooks/useWhatsAppConnection.ts
const { error: functionError } = await supabase.functions.invoke("disconnect-whatsapp");
if (functionError) throw functionError;

setQrCode(null);
setQrCodeExpiry(null);
await fetchConnection();
```

- [ ] **Step 5: Re-run the focused frontend test**

Run: `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`

Expected: PASS for the disconnect contract test.

---

## Task 4: Make the Connection State Single-Owned in the Frontend

**Files:**
- Modify: `src/components/settings/IntegrationsSettings.tsx`
- Modify: `src/components/whatsapp/QRCodeModal.tsx`
- Modify: `src/hooks/useWhatsAppConnection.ts`
- Test: `src/components/settings/__tests__/integrations-whatsapp.test.tsx`

- [ ] **Step 1: Add the failing test for QR modal shared ownership**

```tsx
it("reuses parent WhatsApp state instead of opening a second connection hook in the QR modal", async () => {
  // render settings, click "Reconectar", assert generate-qr-code is invoked once
  // and the modal receives qrCode via props rather than its own hook.
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`

Expected: FAIL because `QRCodeModal` still owns a second `useWhatsAppConnection()` call.

- [ ] **Step 3: Pass canonical WhatsApp state into the modal**

```tsx
// src/components/settings/IntegrationsSettings.tsx
<QRCodeModal
  open={showQRCode}
  onOpenChange={setShowQRCode}
  qrCode={qrCode}
  qrCodeExpiry={qrCodeExpiry}
  isLoading={isLoading}
  error={error}
  onRefresh={refreshQRCode}
/>
```

```tsx
// src/components/whatsapp/QRCodeModal.tsx
interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string | null;
  qrCodeExpiry: Date | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}
```

- [ ] **Step 4: Remove the duplicate hook call from `QRCodeModal`**

```tsx
// delete this pattern from QRCodeModal
const { qrCode, qrCodeExpiry, refreshQRCode, isLoading, error } = useWhatsAppConnection();
```

- [ ] **Step 5: Re-run the focused frontend test**

Run: `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`

Expected: PASS for the “single ownership” QR test.

---

## Task 5: Back the Commands Tab With `whatsapp_quick_commands`

**Files:**
- Create: `src/hooks/useWhatsAppCommands.ts`
- Create: `src/components/whatsapp/WhatsAppCommands.tsx`
- Modify: `src/components/settings/IntegrationsSettings.tsx`
- Test: `src/components/settings/__tests__/integrations-whatsapp.test.tsx`

- [ ] **Step 1: Write the failing UI test for commands**

```tsx
it("renders commands from whatsapp_quick_commands instead of a hardcoded list", async () => {
  vi.spyOn(supabase, "from").mockReturnValue(/* mocked query chain returning DB commands */ as any);

  // render commands tab, assert "saldo" and "relatório" come from query results
  // and no static literal array is required by the component.
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`

Expected: FAIL because `IntegrationsSettings.tsx` still renders the hardcoded commands array.

- [ ] **Step 3: Implement the commands hook**

```ts
// src/hooks/useWhatsAppCommands.ts
export function useWhatsAppCommands() {
  const [commands, setCommands] = useState<WhatsAppQuickCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("whatsapp_quick_commands")
      .select("command, aliases, description, example, category, is_active, usage_count")
      .eq("is_active", true)
      .order("command", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw error;
        setCommands(data || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { commands, isLoading };
}
```

- [ ] **Step 4: Replace the static commands tab with a DB-backed component**

```tsx
// src/components/whatsapp/WhatsAppCommands.tsx
const { commands, isLoading } = useWhatsAppCommands();

if (isLoading) return <p>Carregando comandos...</p>;
if (!commands.length) return <p>Nenhum comando ativo cadastrado.</p>;

return commands.map((command) => (
  <div key={command.command}>
    <strong>{command.command}</strong>
    <p>{command.description}</p>
    <code>{command.example}</code>
  </div>
));
```

- [ ] **Step 5: Re-run the commands test**

Run: `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`

Expected: PASS for the DB-backed commands rendering test.

---

## Task 6: Make Statistics and History Honest

**Files:**
- Modify: `src/hooks/useWhatsAppMessages.ts`
- Modify: `src/components/whatsapp/WhatsAppStats.tsx`
- Modify: `src/components/whatsapp/MessageHistory.tsx`
- Create: `src/hooks/__tests__/useWhatsAppMessages.test.ts`

- [ ] **Step 1: Write the failing stats/history tests**

```ts
// src/hooks/__tests__/useWhatsAppMessages.test.ts
it("orders history by received_at descending", async () => {
  // mock three messages with different received_at values
  // assert newest message becomes first
});

it("computes last message from ordered received_at values, not raw array position", async () => {
  // assert lastMessageAt matches latest received_at
});

it("does not label quick_command intent itself as the most used command", async () => {
  // assert quick command stats come from command metadata, not the literal intent string
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `pnpm test -- src/hooks/__tests__/useWhatsAppMessages.test.ts`

Expected: FAIL on ordering and on `most_used_commands` semantics.

- [ ] **Step 3: Fix history ordering and last-message calculation**

```ts
// src/hooks/useWhatsAppMessages.ts
const { data: messagesData } = await supabase
  .from("whatsapp_messages")
  .select("processing_status, intent, direction, message_type, created_at, received_at, metadata")
  .eq("user_id", userId)
  .order("received_at", { ascending: false });

const lastMessage = messagesData?.[0] ?? null;
const lastMessageAt = lastMessage?.received_at ? new Date(lastMessage.received_at) : null;
```

- [ ] **Step 4: Replace misleading command stats with metadata-backed attribution**

```ts
const commandCounts = (messagesData || [])
  .filter((m) => m.intent === "quick_command")
  .map((m) => String(m.metadata?.command ?? "unknown"))
  .filter((command) => command !== "unknown")
  .reduce((acc, command) => {
    acc[command] = (acc[command] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
```

- [ ] **Step 5: Keep response-time honest until enough data exists**

```ts
const responseDurations = (messagesData || [])
  .filter((m) => m.response_sent_at && m.received_at)
  .map((m) => new Date(m.response_sent_at!).getTime() - new Date(m.received_at).getTime())
  .filter((ms) => ms >= 0);

const avgResponseTimeSeconds = responseDurations.length
  ? Math.round(responseDurations.reduce((sum, ms) => sum + ms, 0) / responseDurations.length / 1000)
  : null;
```

- [ ] **Step 6: Re-run the stats/history tests**

Run: `pnpm test -- src/hooks/__tests__/useWhatsAppMessages.test.ts`

Expected: PASS for ordering, latest-message, and command-attribution tests.

---

## Task 7: Align SQL Runtime and Freeze Legacy Table

**Files:**
- Create: `supabase/migrations/20260408110000_align_whatsapp_runtime.sql`
- Test: SQL verification commands via MCP/CLI after migration application

- [ ] **Step 1: Create the non-destructive runtime-alignment migration**

```sql
-- supabase/migrations/20260408110000_align_whatsapp_runtime.sql
create or replace function public.send_proactive_whatsapp_notifications()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user record;
begin
  for v_user in
    select user_id, phone_number, instance_token
    from public.whatsapp_connections
    where connected = true
      and status = 'connected'
  loop
    -- existing send logic preserved here
    null;
  end loop;

  return jsonb_build_object('success', true);
end;
$$;
```

- [ ] **Step 2: Add an audit query to prove the legacy table is out of the runtime path before drop**

```bash
# Code references
Get-ChildItem "supabase/functions","src" -Recurse -Include *.ts,*.tsx |
  Select-String "whatsapp_connection_status" |
  ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }
```

```sql
-- Database function references
select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosrc ilike '%whatsapp_connection_status%';
```

Expected:
- the PowerShell search returns only migrations/docs or no runtime code references
- the SQL query returns zero rows before the drop migration is created

- [ ] **Step 3: Verify the non-destructive migration only**

Run: `supabase db push`

Expected: the alignment migration applies cleanly; `whatsapp_connection_status` still exists; runtime remains unchanged except for the aligned SQL function behavior.

---

## Task 8: Live Validation on the New Number and Safe Legacy Removal

**Files:**
- Create: `supabase/migrations/20260408113000_drop_whatsapp_connection_status.sql`
- Modify: `docs/superpowers/specs/2026-04-08-whatsapp-production-saneamento-design.md` only if implementation reveals design drift
- Modify: deployment checklist / release notes as needed

- [ ] **Step 1: Validate connection flow on the newly released number**

Manual checklist:
- open `Configurações > Integrações`
- click `Reconectar`
- confirm QR is generated once
- scan QR with the new number
- confirm `whatsapp_connections.connected = true`
- confirm `whatsapp_connections.status = 'connected'`

- [ ] **Step 2: Validate message persistence**

Manual checklist:
- send a plain text inbound message from the new number
- confirm a row appears in `public.whatsapp_messages`
- confirm `processing_status` moves out of `pending`
- confirm the message appears in `Histórico`

- [ ] **Step 3: Validate statistics**

Manual checklist:
- confirm total messages increments
- confirm latest message timestamp matches the actual message
- confirm no bogus “quick_command” literal appears as most-used command

- [ ] **Step 4: Validate commands**

Manual checklist:
- send `saldo`
- confirm `execute-quick-command` path runs
- confirm DB-backed `Comandos` tab still matches active commands in `whatsapp_quick_commands`

- [ ] **Step 5: Only after all checks pass, apply legacy removal**

```sql
-- supabase/migrations/20260408113000_drop_whatsapp_connection_status.sql
drop table if exists public.whatsapp_connection_status;
```

Run: `supabase db push`

Expected: the drop migration applies, `whatsapp_connection_status` is gone, and no runtime path fails afterward.

---

## Verification Matrix

Run this before claiming completion:

- `deno test supabase/functions/_shared/whatsapp-connection-state.test.ts`
- `pnpm test -- src/hooks/__tests__/useWhatsAppMessages.test.ts`
- `pnpm test -- src/components/settings/__tests__/integrations-whatsapp.test.tsx`
- `pnpm build`

Then run DB/runtime verification:

- confirm one canonical row in `public.whatsapp_connections`
- confirm no new writes to `public.whatsapp_connection_status`
- confirm `public.whatsapp_quick_commands` backs the Commands tab
- confirm `public.whatsapp_messages` is updated by live traffic

---

## Spec Coverage Check

- Canonical connection table: covered by Tasks 1, 2, 7, and 8.
- Canonical status fields: covered by Tasks 1 and 2.
- Disconnect/reconnect backed by real backend state: covered by Task 3.
- Honest UI for commands/stats/history/QR ownership: covered by Tasks 4, 5, and 6.
- Live validation on the new number: covered by Task 8.
- Safe deprecation of `whatsapp_connection_status`: covered by Tasks 7 and 8.
