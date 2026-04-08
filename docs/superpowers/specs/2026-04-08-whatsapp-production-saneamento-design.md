# WhatsApp Production Saneamento Design

## Goal
Levar a integração de WhatsApp para um estado confiável de produção, com uma única fonte de verdade para conexão, sem drift entre frontend, edge functions, jobs SQL e tabelas legadas, e com a aba `Integrações` refletindo apenas o que o sistema realmente sabe e executa.

## Scope
Esta etapa cobre somente o domínio WhatsApp dentro de `Configurações > Integrações`, incluindo:

- estado de conexão
- fluxo connect / reconnect / disconnect
- QR Code
- estatísticas
- histórico
- comandos rápidos
- persistência em banco
- jobs e funções SQL relacionados ao envio de mensagens

Esta etapa **não** implementa Google Calendar nem TickTick.

Esta etapa também **não** redesenha a arquitetura geral de integrações em `integration_configs`; o objetivo aqui é estabilizar o que já existe em produção para WhatsApp antes de qualquer consolidação maior.

## Current Reality From Audit

### Produção hoje
- `public.whatsapp_connections` existe e está atualizada com a conexão real atual.
- `public.whatsapp_connection_status` existe, mas contém estado legado divergente.
- `public.whatsapp_messages` existe, está ligada ao frontend, mas ainda não contém tráfego real.
- `public.whatsapp_quick_commands` existe, está populada com 8 comandos ativos e já é usada por backend.
- `public.integration_configs` existe, mas está vazia e não participa do fluxo real do WhatsApp.

### Código vivo hoje
- O frontend usa `whatsapp_connections` em `src/hooks/useWhatsAppConnection.ts`.
- O frontend usa `whatsapp_messages` em `src/hooks/useWhatsAppMessages.ts`.
- As edge functions principais usam `whatsapp_connections`:
  - `generate-qr-code`
  - `webhook-uazapi`
  - `send-proactive-notifications`
  - `send-investment-summary`
  - `send-opportunity-notification`
- Os comandos rápidos reais vêm de `whatsapp_quick_commands` em `execute-quick-command`.
- Existe lógica adicional no banco via `public.send_proactive_whatsapp_notifications()` que também usa `whatsapp_connections`.

### Problemas confirmados
1. Existem **duas tabelas de conexão** com estados divergentes.
2. O `webhook-uazapi` tenta atualizar colunas que **não existem** em `whatsapp_connections`:
   - `is_connected`
   - `connected_at`
   - `disconnected_at`
3. A aba `Comandos` do frontend é estática e não usa `whatsapp_quick_commands`.
4. A aba `Estatísticas` usa dados reais, mas:
   - calcula `most_used_commands` a partir de `intent`, não de comandos reais
   - usa `messagesData?.[0]` sem ordenação explícita para “última mensagem”
   - deixa `avg_response_time_seconds` fixo em `0`
5. `IntegrationsSettings` e `QRCodeModal` mantêm estado duplicado via hooks separados.
6. Existem diferenças de configuração e fallback de UAZAPI entre functions.

## Design Principles

### 1. Preserve what already works
O saneamento deve assumir que o número hoje conectado é o ativo de produção e que qualquer migração que arrisque perder esse estado é incorreta.

### 2. One canonical write path per concern
Cada domínio do WhatsApp deve ter uma única fonte de verdade:

- conexão: `whatsapp_connections`
- mensagens e processamento: `whatsapp_messages`
- comandos disponíveis: `whatsapp_quick_commands`

### 3. Remove legacy by migration, not by assumption
`whatsapp_connection_status` não deve ser simplesmente ignorada. Ela precisa ser:

- auditada
- congelada
- migrada ou explicitamente descontinuada
- removida do caminho operacional

### 4. UI must reflect backend truth
A aba `Integrações` deve parar de misturar dados reais com listas decorativas onde já existe backend.

### 5. Rollout must be reversible
Qualquer mudança deve permitir:

- detectar regressão rápido
- reverter sem perder o vínculo com a instância atual
- preservar QR, telefone e status funcional

## Architecture Decision

### Canonical connection table
Adotar `public.whatsapp_connections` como a tabela canônica do estado de conexão WhatsApp.

### Canonical status fields
Padronizar os seguintes campos em `whatsapp_connections`:

- `connected: boolean` => verdade principal de conectividade operacional
- `status: text` => estado legível e derivado para UI e troubleshooting (`disconnected`, `connecting`, `connected`, `error`)
- `logged_in: boolean` => campo auxiliar de sessão/provedor, não substitui `connected`
- `phone_number: text` => número atualmente vinculado
- `qr_code: text`
- `qr_code_expires_at: timestamptz`
- `last_disconnect: timestamptz`
- `last_disconnect_reason: text`
- `instance_id: text`
- `instance_token: text`

### Non-canonical legacy table
`public.whatsapp_connection_status` passa a ser tratada como legado:

- não recebe novas leituras do frontend
- não recebe novas leituras das edge functions
- não recebe novas gravações após rollout
- permanece temporariamente apenas para compatibilidade e rollback até a remoção final

### Out of scope for this stage
`integration_configs` não será a base do WhatsApp nesta etapa. Misturar a estabilização do WhatsApp com a plataforma geral de integrações aumentaria risco sem ganho imediato.

## Canonical Runtime Model

### Connection state contract
Todo consumidor de conexão WhatsApp deve assumir o seguinte contrato:

```ts
interface CanonicalWhatsAppConnection {
  user_id: string;
  instance_id: string;
  instance_token: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
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

Rules:
- `connected = true` means the instance is usable for sending/receiving.
- `status` is descriptive, but `connected` is the boolean gate used by jobs.
- `logged_in` can help explain provider state, but must never replace `connected`.
- `phone_number` is informational and operational.

### Message state contract
`whatsapp_messages` remains canonical for:

- inbound/outbound history
- processing lifecycle
- message type
- recognized intent
- response metadata
- user-facing history and stats

### Commands contract
`whatsapp_quick_commands` is canonical for:

- command list shown in `Integrações`
- aliases
- description/example
- activation status
- usage metrics

The frontend must read this table or a backend projection of it, not a static list.

## Component-Level Design

### Frontend

#### `useWhatsAppConnection`
Responsibilities:
- load canonical row from `whatsapp_connections`
- subscribe to realtime updates for that row
- expose `connect`, `disconnect`, `refreshConnection`
- expose `qrCode`, `qrCodeExpiry`, `connection`, `isConnected`, `status`, `error`, `isLoading`

Required change:
- `disconnect` must stop being a DB-only local mutation if backend/provider teardown is required
- it must call a backend operation that expresses real disconnect intent, then reconcile local state from canonical row

#### `QRCodeModal`
Responsibilities:
- display QR and expiry
- request refresh through parent/shared state

Required change:
- stop owning a second `useWhatsAppConnection` instance
- consume parent/shared canonical state

#### `IntegrationsSettings`
Responsibilities:
- render status card from canonical connection state
- render `Estatísticas`, `Histórico`, and `Comandos` tabs from backend truth

Required change:
- read commands from real source
- surface honest empty states when `whatsapp_messages` has no rows
- stop duplicating hook calls that cause redundant queries and connection attempts

#### `useWhatsAppMessages`
Responsibilities:
- fetch ordered history from `whatsapp_messages`
- compute stats from ordered and semantically correct source data

Required change:
- order latest message correctly
- compute `most_used_commands` from real command attribution, not just `intent === quick_command`
- compute response-time metric from real timestamps when possible

### Backend

#### `generate-qr-code`
Responsibilities:
- create or refresh QR
- update canonical row in `whatsapp_connections`
- set transitional state such as `status = connecting`, `connected = false`

#### `webhook-uazapi`
Responsibilities:
- resolve connection/user reliably
- update canonical row using canonical columns only
- insert inbound records into `whatsapp_messages`
- trigger processing

Required change:
- stop writing `is_connected`, `connected_at`, `disconnected_at` to `whatsapp_connections`
- map webhook events into canonical fields:
  - on connection/open => `connected = true`, `status = connected`, `logged_in = true`
  - on disconnect/close => `connected = false`, `status = disconnected`, `logged_in = false`, `last_disconnect`, `last_disconnect_reason`

#### outbound/scheduled functions
Functions that consume connection status must read canonical fields from `whatsapp_connections` consistently, including:

- `send-proactive-notifications`
- `send-investment-summary`
- `send-opportunity-notification`
- `send-whatsapp-message`
- any remaining WhatsApp schedulers or SQL jobs

Required change:
- use the same criteria for “ready to send”
- normalize token/base URL resolution strategy

### Database / SQL

#### `public.send_proactive_whatsapp_notifications()`
This function is part of the production runtime and must be included in the migration design.

Required change:
- keep it aligned with canonical connection fields
- remove hardcoded token fallback if not acceptable for production
- ensure it does not silently diverge from edge-function behavior

#### Legacy table handling
`whatsapp_connection_status` should go through staged deprecation:

1. freeze writes
2. confirm no active consumers remain
3. optionally backfill/copy audit data if needed
4. remove obsolete references
5. drop table only after verification window

## Migration Strategy

### Phase A: Stabilize before schema change
No destructive migration yet.

Actions:
- map every consumer of `whatsapp_connections`
- fix `webhook-uazapi` to target valid columns
- align scheduled functions and SQL function with canonical semantics
- add observability/logging where needed

Success criteria:
- no runtime path writes invalid columns
- all active code paths read the same connection table and same boolean status

### Phase B: Make the UI honest
Actions:
- connect `Comandos` tab to `whatsapp_quick_commands`
- correct `Estatísticas`
- correct “última mensagem” ordering
- share WhatsApp connection state between settings page and QR modal

Success criteria:
- no static commands list remains
- no misleading “most used command” metric remains
- QR/connect flow does not duplicate hooks or requests

### Phase C: Validate on the new number
Once the new number is released:

1. connect
2. confirm `whatsapp_connections` state transition
3. send inbound message
4. confirm row in `whatsapp_messages`
5. confirm processing path
6. confirm stats update
7. confirm history update
8. confirm quick command execution

Success criteria:
- canonical row updates correctly through the live flow
- history/stats prove the real pipeline

### Phase D: Decommission legacy connection table
Only after the live validation succeeds:

- verify no code paths or DB functions consume `whatsapp_connection_status`
- archive or back up any needed legacy data
- remove legacy references
- drop table in controlled migration

## Rollout Safety

### Required safeguards
- no dropping of legacy table before live validation on the new number
- no schema changes that remove currently working columns from `whatsapp_connections`
- no provider token strategy change without explicit verification

### Rollback strategy
If canonical rollout causes regression:
- keep `whatsapp_connections` row intact
- revert edge function versions
- revert frontend to prior known-good build
- preserve message and command tables untouched
- do not re-enable `whatsapp_connection_status` writes unless a controlled fallback is explicitly designed

## Testing Strategy

### Database verification
- confirm single live row in `whatsapp_connections` for the target user
- confirm no new writes land in `whatsapp_connection_status`
- confirm `whatsapp_messages` inserts and updates through real traffic
- confirm command reads come from `whatsapp_quick_commands`

### Edge function verification
- `generate-qr-code`
- `webhook-uazapi`
- `process-whatsapp-message`
- `send-whatsapp-message`
- `send-proactive-notifications`
- `send-investment-summary`
- `send-opportunity-notification`

### Frontend verification
- status card reflects canonical row
- reconnect opens valid QR flow
- disconnect reflects backend truth
- stats render empty state honestly before traffic
- history orders newest first
- commands tab matches DB-backed commands

### Live operational verification
When number is released:
- scan QR
- confirm status transition
- send message
- confirm message persistence
- confirm response path
- confirm command execution

## File and System Surfaces Expected To Change

### Frontend
- `src/hooks/useWhatsAppConnection.ts`
- `src/hooks/useWhatsAppMessages.ts`
- `src/components/settings/IntegrationsSettings.tsx`
- `src/components/whatsapp/QRCodeModal.tsx`
- `src/components/whatsapp/WhatsAppStats.tsx`
- `src/components/whatsapp/MessageHistory.tsx`
- possibly `src/types/whatsapp.types.ts`

### Edge Functions
- `supabase/functions/generate-qr-code/index.ts`
- `supabase/functions/webhook-uazapi/index.ts`
- `supabase/functions/send-proactive-notifications/index.ts`
- `supabase/functions/send-investment-summary/index.ts`
- `supabase/functions/send-opportunity-notification/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- possibly shared WhatsApp helpers under `process-whatsapp-message`

### Database
- new migration(s) for canonical cleanup
- possible SQL migration updating `public.send_proactive_whatsapp_notifications()`
- eventual deprecation/drop migration for `whatsapp_connection_status`

## Explicit Non-Goals
- move WhatsApp into `integration_configs`
- implement Google Calendar
- implement TickTick
- redesign the entire integrations domain
- refactor unrelated notification systems

## Acceptance Criteria
This stage is complete only when all of the following are true:

- There is one canonical WhatsApp connection table in operational use.
- All active frontend and backend consumers use the same table and same boolean connection field.
- No active edge function writes invalid/nonexistent connection columns.
- `disconnect` and `reconnect` reflect real backend/provider state, not only optimistic DB mutation.
- `Comandos` is sourced from `whatsapp_quick_commands`.
- `Estatísticas` no longer shows misleading derived command data and has correct latest-message ordering.
- `QRCodeModal` and `IntegrationsSettings` no longer duplicate connection state ownership.
- Live testing on the new number proves:
  - connect
  - inbound message persistence
  - history update
  - stats update
  - quick command execution
- `whatsapp_connection_status` is removed from the operational path and is safe to deprecate.

## Recommendation
Proceed with a staged migration whose first deliverable is **operational consistency**, not schema deletion.

The most important first move is to fix and align runtime paths around `whatsapp_connections`, especially `webhook-uazapi`, before any destructive cleanup.
