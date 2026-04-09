# Bidirectional Agenda with External Connectors — Design Spec

## Goal
Evolucionar a agenda do Personal Finance de **outbound-only** para **bidirecional** com conectores externos (TickTick e Google Calendar), preservando o app como fonte de verdade, mantendo ownership limpo entre domínios, e tornando a Ana Clara capaz de operar qualquer compromisso com reflexo automático nos conectores ativos do usuario.

## Foundational Premise
O app funciona 100% sem nenhum conector externo. TickTick e Google Calendar sao opcionais, por usuario, ativaveis na pagina de integracoes. Nenhuma funcionalidade de agenda, reminders ou Ana Clara pode depender de conector externo para existir.

## Builds On
- `docs/superpowers/specs/2026-04-08-calendar-agenda-v1-design.md` — dominio canonico, agenda unificada, TickTick outbound
- `docs/superpowers/specs/2026-04-08-calendar-recurrence-overrides-v1-design.md` — recorrencia, overrides, RPCs semanticas
- Migration `20260410000001_calendar_recurrence_overrides_v1.sql` — estado atual deployado
- `supabase/functions/calendar-sync-ticktick/` — worker outbound atual
- `supabase/migrations/20251110000003_create_integration_configs.sql` — tabela de configuracao

---

## Current State (as-built)

### What exists
- `calendar_events` com recorrencia (`daily`, `weekly`, `monthly`), overrides, RPCs semanticas
- `get_agenda_window` com CTEs canonigas + projecoes financeiras derivadas (`payable_bills`, `bill_reminders`, `financial_cycles`)
- `calendar_sync_jobs` queue com `upsert_event`, `delete_event`, `upsert_occurrence_override`, `cancel_occurrence`
- `calendar_external_event_links` com `sync_direction: 'outbound'`, constraints `UNIQUE(event_id, provider)` e `UNIQUE(provider, external_object_id)`
- Worker `calendar-sync-ticktick` outbound-only: cria/atualiza/deleta tasks no TickTick via Bearer token; occurrence-level e `skipped_unsupported`
- `integration_configs` com enum `integration_type` incluindo `ticktick` e `google_calendar`; colunas para credenciais de ambos
- `calendar_reminder_schedule` + dispatcher `calendar-dispatch-reminders` para eventos simples (nao recorrentes)
- Gate `isCalendarIntent` com `FINANCIAL_COUNTER_PATTERNS` separando dominio financeiro de agenda
- Frontend `IntegrationsSettings.tsx`: WhatsApp funcional; Google Calendar e TickTick como placeholders "Em planejamento"

### What does NOT exist
- Nenhum fluxo inbound (externo -> app)
- `calendar_sync_direction` enum so tem `'outbound'`
- Nenhuma API de leitura de projetos/listas/calendarios externos
- Nenhuma resolucao de conflitos bidirecional
- Nenhum mapeamento de projetos/listas para categorias/filtros
- Google Calendar: zero integracao (sem OAuth, sem API call, sem token management)
- Reminders para eventos recorrentes (deferido na V1)
- Ana Clara nao sabe remarcar via WhatsApp (placeholder "em breve")
- UI de integracao nao persiste nem valida credenciais reais

---

## Domain Ownership (canonical, nao muda)

### `payable_bills` — dominio financeiro
- Obrigacoes com valor, vencimento, status de pagamento
- Assinaturas (Netflix, Spotify, etc.), contas de servico, impostos, parcelamentos
- Recorrencia via `is_recurring` + `recurrence_config`; geracao fisica de rows filhas
- Projecao derivada read-only na agenda via `payable_bills_projection` CTE

### `calendar_events` — dominio de agenda
- Compromissos pessoais, reunioes, mentorias, tarefas, eventos
- Recorrencia via `calendar_event_recurrence_rules`; expansao virtual por janela
- Overrides via `calendar_event_occurrence_overrides`
- Sync externo via `calendar_sync_jobs` + `calendar_external_event_links`

### Regra de ownership para Ana Clara
- Mensagem com sinal financeiro (pagamento, vencimento, valor, servicos, assinaturas) -> `payable_bills`
- Mensagem com sinal de agenda (compromisso, reuniao, consulta, evento, mentoria) -> `calendar_events`
- Gate `isCalendarIntent` + `FINANCIAL_COUNTER_PATTERNS` ja implementada como guardrail

### Projecoes derivadas na agenda
- `payable_bills` aparece como `derived_projection` com `origin_type = 'payable_bill'` (read-only)
- `bill_reminders` aparece como `derived_projection` com `origin_type = 'bill_reminder'` (read-only)
- `financial_cycles` aparece como `derived_projection` com `origin_type = 'financial_cycle'` (read-only)
- Itens derivados NUNCA sao promovidos para `calendar_events`
- Itens derivados NUNCA sao sincronizados com conectores externos
- Essa regra permanece inalterada nesta spec

---

## Connector Architecture (modelo unificado)

### Principio: connector-agnostic core
Toda logica de sync deve ser abstrata em relacao ao provider. O app trabalha com:
- `calendar_sync_jobs.provider` (discriminador)
- `calendar_external_event_links.provider` (vinculo)
- `integration_configs.integration_type` (configuracao)

Cada provider tem um worker dedicado (`calendar-sync-ticktick`, `calendar-sync-google-calendar`), mas o enqueue, a fila, os links e a resolucao de conflitos sao compartilhados.

### Modelo de dados de conector

#### `integration_configs` (existente, expandir)
Colunas ja existentes para Google Calendar:
- `google_calendar_id` TEXT — ID do calendario primario selecionado pelo usuario
- `google_sync_frequency_minutes` INT DEFAULT 30

Colunas novas necessarias:
- `google_access_token_encrypted` TEXT — reusa `access_token_encrypted` existente
- `google_refresh_token_encrypted` TEXT — reusa `refresh_token_encrypted` existente
- `google_token_expires_at` TIMESTAMPTZ — para refresh proativo
- `ticktick_default_list_mappings` JSONB DEFAULT '{}' — mapeamento de listas para categorias/filtros
- `google_calendar_list_mappings` JSONB DEFAULT '{}' — mapeamento de calendarios para categorias/filtros
- `last_inbound_sync_at` TIMESTAMPTZ — ultima vez que puxou dados de la para ca
- `inbound_sync_cursor` TEXT — cursor/pageToken/syncToken para sync incremental

#### `calendar_sync_direction` enum (expandir)
Valor atual: `'outbound'`
Adicionar: `'inbound'`, `'bidirectional'`

#### `calendar_external_event_links` (expandir)
Colunas novas:
- `last_remote_updated_at` TIMESTAMPTZ — timestamp do item externo na ultima sincronizacao; essencial para deteccao de conflito
- `origin_type` TEXT NULLABLE — quando o link aponta para dominio financeiro em vez de agenda: `'payable_bill'`, `NULL` para agenda
- `origin_id` UUID NULLABLE — FK para `payable_bills.id` quando `origin_type = 'payable_bill'`; `NULL` quando `event_id` esta preenchido
- Regra: exatamente um de `event_id` ou `origin_id` deve ser NOT NULL (CHECK constraint)

Valores novos de `sync_status`:
- `'remote_deleted'` — item foi deletado no provider; link desativado, canonico local intacto

#### `calendar_sync_jobs` (expandir)
Novo `job_type` values:
- `inbound_upsert` — item criado/editado externamente precisa ser refletido no app (como `calendar_events`)
- `inbound_delete` — item deletado externamente; link desativado, canonico intacto
- `inbound_financial_routed` — item financeiro inbound roteado para `payable_bills` (com ou sem counterpart existente)
- `conflict_detected` — item editado em ambas as pontas desde o ultimo sync

---

## Conflict Resolution

### Estrategia: app-wins com preservacao de evidencia

Quando um item e editado em ambas as pontas entre dois ciclos de sync:

1. O inbound sync detecta que `last_remote_updated_at` do link e anterior ao `updated_at` do provider, E que `calendar_events.updated_at` tambem mudou desde `last_synced_at`
2. Em vez de silenciosamente sobrescrever, o sistema:
   - Mantém a versao do app (app-wins)
   - Registra um job `conflict_detected` com os detalhes de ambas as versoes em `calendar_sync_jobs.metadata` (JSONB a adicionar) ou coluna dedicada
   - Enfileira um outbound push para re-sincronizar o provider com a versao do app
3. Futuramente (V2+), pode-se surfacear conflitos na UI para resolucao manual

### Justificativa
- App e fonte de verdade (premissa fundamental)
- Conflitos reais sao raros em uso pessoal (usuario geralmente edita em um lado de cada vez)
- A alternativa "ultimo ganha" viola a premissa de app-is-truth
- A alternativa "flag de conflito bloqueante" impede o uso ate resolucao manual

### Caso especial: item criado externamente sem counterpart local
- Nao e conflito; e inbound puro
- O sync cria `calendar_events` com `source = 'external'`, `created_by = 'system'`
- O link e criado com `sync_direction = 'bidirectional'`

### Caso especial: item deletado externamente

**Decisao arquitetural: delete externo NUNCA apaga o canonico local.**

Essa e a unica interpretacao coerente com "app e fonte de verdade". Se o provider externo pudesse apagar dados canonicos, a premissa central seria condicional em vez de absoluta.

Comportamento quando o inbound sync detecta que um item foi deletado no provider:

1. **O link e desativado:** `calendar_external_event_links.sync_status` -> `'remote_deleted'` (novo valor de enum)
2. **O evento canonico local permanece intacto:** nenhum `deleted_at`, nenhum status change
3. **Um job informativo e registrado:** `calendar_sync_jobs` com `job_type = 'inbound_delete'` e metadata contendo provider, external_object_id, e timestamp da deteccao
4. **Outbound para esse link e suspenso:** o worker outbound ignora links com `sync_status = 'remote_deleted'` (nao tenta recriar no provider)
5. **O usuario pode agir manualmente:** na UI, o evento mostra badge "removido do [Provider]"; usuario pode deletar localmente se quiser, ou reconectar (re-push)

Consequencia: se o usuario deleta uma tarefa no TickTick, ela continua existindo na agenda do app. Isso e intencional — o app e a fonte de verdade.

Excecao controlada (V2, opcional): se no futuro o usuario quiser que deletes externos propaguem, isso pode ser uma preferencia explicita em `integration_configs.honor_remote_deletes: boolean DEFAULT false`. Fora de escopo na V1.

---

## Deduplication: External Items vs Existing Data

### External event vs existing `calendar_events`
- Ao importar, verificar `calendar_external_event_links` por `(provider, external_object_id)` — se ja existe, e update, nao insert
- Se nao existe link mas existe evento com mesmo `title` + `start_at` (+-5min) + `user_id`: criar link sem duplicar evento (merge heuristico, logado para auditoria)

### External event vs existing `payable_bills`

Ao importar um item externo cujo titulo bate no filtro `FINANCIAL_COUNTER_PATTERNS`, o inbound sync NAO cria `calendar_events`. Em vez disso, segue a trilha abaixo:

**Passo 1 — Buscar counterpart local:**
Verificar se ja existe `payable_bills` para o mesmo `user_id` com `description` similar (fuzzy match: lowercase + trim) e `due_date` proximo (+-3 dias). Se encontrar:
- Criar `calendar_external_event_links` apontando `event_id = NULL`, `origin_type = 'payable_bill'`, `origin_id = <bill_id>` (colunas novas no link, nullable)
- O item externo fica vinculado ao `payable_bill` existente e aparece na agenda como derivado (sem duplicar)
- Futuras edicoes externas atualizam metadata do link, mas NAO alteram o `payable_bill` (ownership financeiro preservado)

**Passo 2 — Sem counterpart local (item financeiro orfao):**
Se nao encontrar `payable_bill` correspondente, o item NAO e descartado. Em vez disso:
- Criar um `payable_bills` row com:
  - `description` extraida do titulo externo
  - `due_date` extraida de `start_at` do item externo
  - `status = 'pending'`
  - `bill_type = 'other'`
  - `is_recurring = false`
  - `source = 'external_import'` (coluna TEXT nova em `payable_bills`, default `'manual'`, adicionada na migration `20260411000001_bidirectional_sync_v1.sql`)
  - `amount = NULL` (nao temos valor; usuario pode completar depois)
- Criar `calendar_external_event_links` com `event_id = NULL`, `origin_type = 'payable_bill'`, `origin_id = <new_bill_id>`
- O item aparece na agenda como projecao financeira derivada (mesmo caminho que bills manuais)
- Clara pode futuramente perguntar ao usuario para completar valor/categoria

**Passo 3 — Auditoria:**
Em ambos os casos, logar em `calendar_sync_jobs` com `job_type = 'inbound_financial_routed'` e metadata contendo titulo original, provider, e se criou novo bill ou vinculou a existente.

**Regra fundamental:** skip silencioso NAO e permitido. Todo item financeiro inbound tem destino explicito: vinculo a bill existente ou criacao de bill orfao.

### External project/list vs categorias
- Cada lista/projeto/calendario externo mapeia para um `event_kind` ou tag no app
- Mapeamento armazenado em `integration_configs.ticktick_default_list_mappings` / `google_calendar_list_mappings`
- Formato: `{ "external_list_id": { "label": "Pessoal Alf", "event_kind": "personal", "sync_enabled": true } }`
- Listas nao mapeadas: sync habilitado com `event_kind = 'external'` por default

---

## Phase A: Inbound Sync

### Objetivo
Puxar tarefas/eventos de conectores externos para o dominio correto: itens de agenda vao para `calendar_events`, itens financeiros vao para `payable_bills`. Sem duplicar com dados ja existentes em nenhum dos dois dominios.

### TickTick Inbound
- **API:** `GET /open/v1/project/{projectId}/data` — retorna tarefas de um projeto
- **API:** `GET /open/v1/project` — lista projetos do usuario
- **Autenticacao:** Bearer token (ja existe em `integration_configs.ticktick_api_key_encrypted`)
- **Frequencia:** configuravel; default `google_sync_frequency_minutes` (reuso do campo) ou 30 min
- **Fluxo:**
  1. Worker `calendar-sync-ticktick` ganha branch inbound (alem do outbound existente)
  2. Para cada projeto mapeado com `sync_enabled: true`, busca tarefas
  3. Para cada tarefa, verifica dedup por `(provider, external_object_id)` em `calendar_external_event_links`
  4. Se link ja existe: compara `modifiedDate` com `last_remote_updated_at`; se diferente, aplica update + conflict detection
  5. Se link nao existe (item novo):
     a. Aplica filtro `FINANCIAL_COUNTER_PATTERNS` no titulo
     b. Se financeiro: segue trilha de roteamento financeiro (ver secao "External event vs existing payable_bills")
     c. Se nao financeiro: cria `calendar_events` com `source = 'external'` + link com `sync_direction = 'bidirectional'`
  6. Se item existia antes mas agora nao aparece na resposta: marca link como `remote_deleted`, canonico intacto
  7. Atualiza `last_inbound_sync_at`

### Google Calendar Inbound
- **API:** Google Calendar API v3 — `events.list` com `syncToken` para incremental
- **Autenticacao:** OAuth 2.0 com refresh token
- **Token management:** `access_token_encrypted` + `refresh_token_encrypted` + `google_token_expires_at`; refresh proativo quando `expires_at - now() < 5 min`
- **Frequencia:** `google_sync_frequency_minutes` (default 30)
- **Fluxo:**
  1. Novo worker `calendar-sync-google-calendar`
  2. Busca eventos com `syncToken` (incremental) ou full sync se primeiro acesso
  3. Para cada evento, mesmo fluxo de dedup + roteamento financeiro + create/update descrito no TickTick Inbound
  4. Mapeia `calendarId` para `event_kind` via `google_calendar_list_mappings`
  5. Recorrencia Google: na V1, importar como serie simples (template); nao importar RRULE completo
  6. Atualiza `syncToken` em `inbound_sync_cursor`

### Mapeamento de projetos/listas/calendarios
- Endpoint ou RPC para listar projetos/calendarios do provider: `list_external_projects(provider)`
- UI na pagina de integracoes para:
  - Ver projetos/calendarios detectados
  - Ativar/desativar sync por projeto
  - Mapear para `event_kind` ou tag
  - Definir como default para novos eventos criados no app

### Referencia: projetos TickTick do primeiro usuario
- Contas Pessoais (`67158c51db647de6536f46dc`)
- Pessoal Alf (`643c0518525047536b6594d0`) — default atual no worker
- Trabalho Alf (`643c0518525047536b6594d1`)
- Mentorias (`67fbc6398f08b12415f506c4`)
- Notas Alf (`643c0518525047536b6594cf`)

---

## Phase B: Bidirectional Sync

### Objetivo
Manter a agenda sincronizada nos dois sentidos: criar aqui espelha la, criar la espelha aqui, editar/remarcar/cancelar em qualquer ponta reflete na outra.

### Outbound (ja existe, expandir)
- Evento criado ou editado no app -> job `upsert_event` -> worker cria/atualiza no provider
- Evento cancelado no app -> job `delete_event` -> worker deleta no provider
- **Novo:** editar campos de `calendar_events` (titulo, descricao, horario) via `update_calendar_event` -> enqueue `upsert_event` para re-sync
- **Novo:** occurrence override (`reschedule` / `cancel`) -> para providers que suportam: enviar delta; para os que nao suportam: manter `skipped_unsupported`

### Inbound (novo, Phase A)
- Item criado externamente -> inbound sync detecta -> cria `calendar_events` + link
- Item editado externamente -> inbound sync detecta -> aplica update com conflict detection
- Item deletado externamente -> inbound sync detecta -> link desativado (`remote_deleted`), canonico local intacto

### Bidirectional state machine por link
Cada `calendar_external_event_links` row representa o estado do sync:

| Estado local | Estado remoto | Acao |
|-------------|---------------|------|
| Nao existe | Existe | Inbound create |
| Existe | Nao existe | Item deletado externamente; link -> `remote_deleted`, canonico intacto |
| Existe, nao mudou | Existe, mudou | Inbound update |
| Existe, mudou | Existe, nao mudou | Outbound push (ja funciona) |
| Existe, mudou | Existe, mudou | Conflict: app-wins, re-push, logar conflito |
| Existe | Nao existe (criado local) | Outbound create (ja funciona) |

"Mudou" = `updated_at` (local) ou `modifiedDate` (remoto) posterior a `last_synced_at` do link.

### Multi-connector

Um evento pode ter links para TickTick E Google Calendar simultaneamente. Cada link e independente (constraint `UNIQUE(event_id, provider)`). Outbound job e criado por provider ativo; se usuario tem ambos, dois jobs sao enfileirados.

#### Cross-provider dedup: decisao V1

**V1 NAO faz merge automatico cross-provider.** Se o mesmo compromisso existe no TickTick e no Google Calendar e ambos sao importados via inbound, o resultado na V1 e dois `calendar_events` separados, cada um com seu link.

Justificativa:
- Merge cross-provider requer heuristica de matching (titulo + horario + fuzzy) que gera falsos positivos
- Na V1 a maioria dos usuarios tera no maximo um conector ativo (TickTick OU Google Calendar, nao ambos)
- Forcar merge errado e pior que duplicidade visivel (usuario pode deletar o duplicado manualmente)

Mitigacao:
- Na UI de agenda, itens com `source = 'external'` mostram badge do provider de origem, facilitando identificacao visual
- Se usuario editar/deletar um dos dois, o outbound nao afeta o outro (links independentes)

Risco assumido: usuario com ambos os conectores ativos pode ver duplicatas de itens que existem nos dois providers. Documentado como limitacao V1.

#### V2: merge cross-provider
Na V2, implementar heuristica de merge:
- Ao importar item de provider B, verificar se existe `calendar_external_event_links` de provider A com titulo similar + `start_at` proximo (+-5min)
- Se match com alta confianca: criar segundo link apontando para o mesmo `calendar_events.id`
- Se ambiguo: criar separado (mesmo comportamento V1)
- Toda decisao de merge logada para auditoria

---

## Phase C: Reminders Universais via Clara

### Objetivo
Qualquer compromisso na agenda (canonico ou derivado) pode ter multiplos reminders entregues via WhatsApp, independente de conector externo.

### Escopo
- Expandir `set_calendar_event_reminders` para suportar eventos recorrentes (deferido na V1 de recorrencia)
- `calendar_reminder_schedule` passa a ser populada tambem para ocorrencias de series recorrentes (sliding window de N ocorrencias futuras)
- Reminders de projecoes financeiras derivadas que JA existem em `payable_bills`: operar via `bill_reminders` existentes (nao duplicar no dominio de calendario)
- Clara avisa com template natural: "Voce tem [titulo] amanha as [hora]. Posso remarcar?"

### Trilha de reminders por tipo de item na agenda

| Tipo de item | Dominio owner | Mecanismo de reminder | Clara pode lembrar? |
|-------------|--------------|----------------------|-------------------|
| `calendar_events` (criado internamente) | agenda | `calendar_event_reminders` + `calendar_reminder_schedule` | Sim |
| `calendar_events` com `source = 'external'` | agenda | Mesmo mecanismo: `calendar_event_reminders` + `calendar_reminder_schedule` | Sim |
| `payable_bills` (criado internamente) | financeiro | `bill_reminders` (existente) | Sim, via pipeline financeiro |
| `payable_bills` com `source = 'external_import'` | financeiro | `bill_reminders` (mesmo mecanismo que bills manuais) | Sim, via pipeline financeiro |
| Projecao derivada read-only | financeiro (origem) | O reminder pertence ao dominio de origem, nao ao calendario | Clara ja avisa via `send-bill-reminders` |

**Decisao chave:** item financeiro importado de conector externo (Phase A, Passo 2) vira `payable_bills` e portanto herda o mecanismo de `bill_reminders` automaticamente. NAO precisa de mecanismo novo no dominio de calendario.

**Item externo de agenda** (nao financeiro) importado como `calendar_events` com `source = 'external'`: suporta `calendar_event_reminders` normalmente. O usuario pode pedir "me lembra 1h antes" via Clara e o reminder funciona identicamente a um evento criado internamente.

**O que fica deferido:** Clara sugerir proativamente reminders para itens importados que ainda nao tem nenhum. Isso e polimento de UX, nao arquitetura.

### Multi-reminder
- "me lembra 1 dia antes as 9h e meia hora antes" -> duas linhas em `calendar_event_reminders` com offsets 1440 e 30
- Schedule populada com ambas para cada ocorrencia futura

### DND e preferencias
- Respeitar `notification_preferences.quiet_hours_start` / `quiet_hours_end`
- Se `fire_at` cai em DND: atrasar para proximo horario permitido ou pular (conforme preferencia)

### Worker
- `calendar-dispatch-reminders` ja existe para eventos simples
- Expandir para iterar `calendar_reminder_schedule` com ocorrencias recorrentes
- Repopulacao incremental: apos despachar um lote, verificar se series precisam de novas linhas futuras

---

## Phase D: Clara com Poder Total

### Objetivo
Ana Clara opera qualquer compromisso pelo WhatsApp com reflexo automatico nos conectores ativos.

### Capacidades novas
- **Criar compromisso pessoal** (ja funciona): refletir automaticamente nos conectores ativos do usuario
- **Criar com recorrencia:** "mentoria toda quarta as 14h" -> `create_calendar_event` + `set_calendar_event_recurrence` + outbound jobs
- **Remarcar** (hoje placeholder): "remarca o dentista para sexta as 10h" -> usar `reschedule_calendar_occurrence` ou update do evento + outbound
- **Cancelar ocorrencia**: "cancela a reuniao de amanha" -> `cancel_calendar_occurrence` + outbound
- **Listar com contexto enriquecido**: agenda mostra origem (TickTick, Google, interno, financeiro) e permite acao por voz
- **Configrar reminders por voz**: "me avisa 2h antes de cada reuniao" -> `set_calendar_event_reminders`

### Roteamento expandido de Ana Clara
- `isCalendarIntent` + `FINANCIAL_COUNTER_PATTERNS` continuam como gate primaria
- Dentro do handler de calendario:
  - `parseCalendarIntent` precisa reconhecer recorrencia ("toda semana", "todo dia", "a cada 2 semanas")
  - `parseCalendarIntent` precisa reconhecer remarcacao real ("remarca X para Y")
  - Para intents complexos que o regex nao resolve: escalar para NLP (GPT-4) com schema de intent de agenda
- Handler de calendario passa a chamar `set_calendar_event_recurrence` quando detectar padrao recorrente
- Reflexo automatico: RPCs ja enfileiram `calendar_sync_jobs`; nenhuma logica extra no handler

### Ownership na entrada
| Frase | Dominio | Destino |
|-------|---------|---------|
| "tenho dentista amanha as 14h" | agenda | `calendar_events` |
| "mentoria toda quarta" | agenda | `calendar_events` + recorrencia |
| "me lembra de pagar a luz dia 10" | financeiro | `payable_bills` |
| "netflix 55 reais dia 17" | financeiro | `payable_bills` |
| "cancelar compromisso" | agenda | `set_calendar_event_status` |
| "pagar o aluguel" | financeiro | `mark_bill_as_paid` |

---

## Google Calendar: OAuth Flow

### Token lifecycle
1. Usuario clica "Conectar Google Calendar" na UI
2. Frontend redireciona para Google OAuth consent (`calendar.events` + `calendar.readonly` scopes)
3. Callback recebe `authorization_code`
4. Backend (edge function `google-calendar-oauth-callback`) troca code por `access_token` + `refresh_token`
5. Tokens sao encriptados (`enc1:`) e armazenados em `integration_configs`
6. Status muda para `connected`

### Refresh
- Antes de cada API call, verificar `google_token_expires_at`
- Se expirado ou proximo (< 5 min): refresh via Google Token endpoint
- Atualizar `access_token_encrypted` e `google_token_expires_at`
- Se refresh falhar (token revogado): status -> `error`, logar, notificar usuario

### Scopes
- `https://www.googleapis.com/auth/calendar.events` (leitura/escrita de eventos)
- `https://www.googleapis.com/auth/calendar.readonly` (leitura de lista de calendarios)

---

## Testing Strategy

### Unit tests
- `isCalendarIntent` com frases bidirecioanis (ex: "sincronizar agenda", "importar do ticktick") nao deve gatear financeiro
- Conflict detection: dado dois timestamps (local `updated_at` e remote `modifiedDate`) e `last_synced_at`, determinar corretamente: no-change, inbound-update, outbound-push, conflict
- Financial dedup filter: dado titulo de item externo, classificar corretamente se e financeiro
- Token refresh logic: dado `expires_at` e `now()`, determinar se precisa refresh

### Integration tests (DB)
- Inbound create (agenda): inserir evento via RPC simulando inbound -> verificar `calendar_events` + link criados
- Inbound create (financeiro com counterpart): item "Aluguel dia 10" quando `payable_bills` ja existe -> verificar link criado com `origin_type = 'payable_bill'`, nenhum `calendar_events` novo
- Inbound create (financeiro orfao): item "IPTU 2026" sem counterpart -> verificar `payable_bills` criado com `source = 'external_import'` + link com `origin_type = 'payable_bill'`
- Inbound update: alterar `last_remote_updated_at` -> verificar que update e aplicado
- Outbound after inbound: criar evento externamente, editar localmente -> verificar que outbound job e enfileirado
- Conflict: editar em ambas as pontas -> verificar app-wins + conflito logado + re-push enfileirado
- Delete externo: deletar no provider -> verificar link `sync_status = 'remote_deleted'`, evento canonico intacto
- Multi-connector V1: mesmo compromisso em dois providers -> verificar dois `calendar_events` separados (sem merge)
- Reminder para item externo de agenda: criar `calendar_event_reminders` para `source = 'external'` -> verificar `calendar_reminder_schedule` populado
- Reminder para bill importado: bill com `source = 'external_import'` -> verificar que `bill_reminders` funciona normalmente

### Smoke (remoto)
- Criar evento no app -> verificar que aparece no TickTick
- Criar tarefa no TickTick -> verificar que aparece na agenda do app apos inbound sync
- Editar titulo no TickTick -> verificar que atualiza na agenda
- Deletar no TickTick -> verificar link `remote_deleted`, evento local intacto
- Conflict: editar em ambas as pontas -> verificar app-wins
- Item financeiro no TickTick (ex: lista "Contas Pessoais") -> verificar que vira `payable_bills`, nao `calendar_events`

### Regression
- Agenda funciona identicamente sem nenhum conector ativo
- Projecoes financeiras derivadas nao sao afetadas
- `payable_bills` recebe APENAS itens financeiros importados (nunca eventos de agenda)
- `calendar_events` recebe APENAS itens de agenda importados (nunca itens financeiros)
- Clara nao cria `calendar_events` para frases financeiras
- Delete externo nao apaga canonico local em nenhum caso

---

## Risks and Trade-offs

### R1: TickTick Open API tem rate limits nao documentados
- **Mitigacao:** batch limit (ja 20/ciclo), backoff exponencial (ja implementado), monitorar 429s
- **Fallback:** se bloqueado, jobs ficam pendentes e retentam no proximo ciclo

### R2: Google Calendar OAuth requer dominio verificado para produção
- **Mitigacao:** usar "Testing" mode durante desenvolvimento; solicitar verificacao quando pronto para prod
- **Trade-off:** durante testing mode, limite de 100 usuarios de teste

### R3: Conflito bidirecional pode gerar loop de sync
- **Mitigacao:** `payload_hash` no link; se o outbound push gera um hash identico ao remoto, o proximo inbound nao detecta mudanca
- **Mitigacao adicional:** cooldown de 60s entre inbound e outbound para o mesmo link

### R4: Items financeiros no Google Calendar/TickTick podem ir para dominio errado
- **Mitigacao:** filtro `FINANCIAL_COUNTER_PATTERNS` no inbound sync roteia para `payable_bills` em vez de `calendar_events`
- **Risco residual:** falsos positivos (ex: evento "Almoço Luz" roteia para bills erroneamente)
- **Mitigacao:** usuario pode mover manualmente bill importado para agenda (V2), ou deletar o bill e criar evento
- **Trade-off aceito na V1:** preferimos rotear errado para bills (usuario ve e corrige) do que criar `calendar_events` duplicando obrigacao financeira

### R7: Merge cross-provider nao existe na V1
- **Impacto:** usuario com TickTick + Google Calendar ativos pode ver duplicatas de itens que existem em ambos
- **Mitigacao:** badge de provider na UI ajuda identificacao; usuario pode deletar duplicado
- **Probabilidade:** baixa na V1 (maioria dos usuarios tera um conector, nao dois)
- **V2:** heuristica de merge cross-provider resolve

### R8: Bills criados por inbound podem ter dados incompletos
- **Impacto:** `payable_bills` criado com `amount = NULL` por falta de valor no item externo
- **Mitigacao:** UI mostra badge "importado — completar dados"; Clara pode perguntar valor
- **Aceitavel na V1:** melhor ter bill incompleto visivel do que skip silencioso

### R5: Recorrencia entre providers tem semantica divergente (mantido)
- **Mitigacao V1:** nao importar RRULE complexo; tratar como evento simples ou serie template
- **Mitigacao V2:** parser de RRULE -> `calendar_event_recurrence_rules` com mapeamento controlado

### R6: Worker inbound pode ser lento com muitos projetos/calendarios (mantido)
- **Mitigacao:** processar um provider/projeto por invocacao; round-robin entre usuarios
- **Mitigacao:** `inbound_sync_cursor` para sync incremental (evitar full scan)

---

## V1 vs V2 Phase Recommendation

### V1 (corte recomendado para primeira entrega)
- **Phase A parcial:** inbound TickTick (projetos mapeados, sync incremental, dedup)
- **Phase B parcial:** outbound ja funciona; inbound + conflict detection basico (app-wins)
- **Phase C parcial:** reminders para eventos recorrentes (sliding window)
- **Phase D parcial:** Clara cria com recorrencia + remarca de verdade (sai do placeholder)

### V2 (segunda onda)
- Google Calendar completo (OAuth + inbound + outbound)
- UI de mapeamento de projetos/calendarios
- Conflict resolution surfaceado na UI
- Occurrence-level sync para TickTick e Google Calendar
- RRULE import/export completo
- Clara com NLP escalado para intents complexos de agenda

### Justificativa do corte
- TickTick ja tem credenciais no sistema e worker parcial; menor distancia para bidirecional
- Google Calendar requer OAuth completo (mais infra); pode entrar em paralelo mas nao bloqueia V1
- Reminders recorrentes sao a funcionalidade mais pedida apos recorrencia da agenda
- Clara com remarcacao real elimina o placeholder que o usuario ja ve

---

## Files Likely Touched (delta estimado)

| Path | Responsabilidade |
|------|-----------------|
| `supabase/migrations/2026XXXX_bidirectional_sync_v1.sql` | Expandir enums, colunas, possiveis novas funcoes |
| `supabase/functions/calendar-sync-ticktick/index.ts` | Adicionar branch inbound |
| `supabase/functions/calendar-sync-ticktick/ticktick-mapping.ts` | Mapeamento inbound (TickTick task -> calendar_events) |
| `supabase/functions/calendar-sync-google-calendar/index.ts` | Novo worker (V2) |
| `supabase/functions/_shared/integration-token.ts` | Google token refresh |
| `supabase/functions/_shared/google-calendar-api.ts` | Client para Google Calendar API |
| `supabase/functions/process-whatsapp-message/calendar-intent-parser.ts` | Reconhecer recorrencia e remarcacao real |
| `supabase/functions/process-whatsapp-message/calendar-handler.ts` | Chamar RPCs de recorrencia e remarcacao |
| `src/lib/calendar-domain.ts` | Wrappers ja existem; possiveis novos para inbound config |
| `src/components/settings/IntegrationsSettings.tsx` | Sair do placeholder; persistencia real |
| `supabase/migrations/20260410000001_*.sql` | Referencia (nao alterar; nova migration incrementa) |

---

## Glossary

| Termo | Significado |
|-------|-------------|
| **Canonico** | Dado owned pelo app; fonte de verdade |
| **Derivado** | Projecao read-only de outro dominio (ex: `payable_bills` na agenda) |
| **Link** | Vinculo entre evento canonico e item externo |
| **Inbound** | Dados fluindo de provider externo para o app |
| **Outbound** | Dados fluindo do app para provider externo |
| **Conflict** | Item editado em ambas as pontas entre dois ciclos de sync |
| **App-wins** | Em conflito, a versao do app prevalece |
| **Provider** | TickTick ou Google Calendar |
| **Connector** | Worker + mapeamento + token management para um provider |
| **Occurrence** | Instancia temporal de evento recorrente |
| **Override** | Excecao pontual persistida para uma ocorrencia |
