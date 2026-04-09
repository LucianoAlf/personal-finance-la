# Calendar / Agenda V1 Design

## Goal
Construir a primeira versão do módulo de calendário/agenda do Personal Finance com um domínio interno canônico, leitura unificada de compromissos pessoais e financeiros, lembretes integrados ao stack atual de notificações, suporte inicial a comandos conversacionais da Ana Clara e sync outbound com TickTick sem transformar o provedor externo em fonte de verdade.

## Scope
Esta etapa cobre:

- domínio canônico de calendário para eventos internos
- timeline unificada por janela temporal
- projeções derivadas de domínios financeiros existentes
- reminders/notificações de eventos canônicos
- integração outbound com TickTick
- contrato de leitura e mutação para UI futura e Ana Clara

Esta etapa nao cobre:

- UI completa de calendário por dia/semana/mês
- sync bidirecional com TickTick
- integração com Google Calendar
- promoção automática de itens derivados para eventos canônicos
- consolidação completa dos dispatchers legados de lembretes financeiros

## Current Reality From Audit

### Integrations and configuration
- `public.integration_configs` existe para credenciais, status e metadados de integrações externas como `whatsapp`, `google_calendar` e `ticktick`.
- O frontend atual não usa `integration_configs` como fonte operacional do WhatsApp.
- `src/components/settings/IntegrationsSettings.tsx` mostra Google Calendar e TickTick apenas como placeholders.

### WhatsApp and Ana Clara runtime
- O runtime real de WhatsApp hoje passa por `whatsapp_connections`, `webhook-uazapi`, `process-whatsapp-message` e `send-whatsapp-message`.
- `process-whatsapp-message` já atua como orquestrador conversacional para múltiplos domínios e é o ponto correto para encaixar comandos de agenda.
- A saída de mensagens já possui um caminho canônico reutilizável via `send-whatsapp-message`.

### Notifications and scheduling
- Preferências de notificação já vivem em `notification_preferences`.
- Existem jobs e edge functions ativos para lembretes e notificações proativas, inclusive `send-bill-reminders` e `send-proactive-notifications`.
- O sistema já possui dados temporais relevantes em `payable_bills`, `bill_reminders` e `financial_cycles`.

### Architectural pattern observed
- O projeto funciona melhor quando separa dado de negócio canônico de configuração de integração.
- O ajuste recente do WhatsApp reforça o padrão de "tabela canônica por domínio" e "configuração externa separada".
- Esse padrão deve ser mantido para calendário/agenda.

## Product Decisions Confirmed

### Canonical ownership
- O calendário interno do app é a fonte única de verdade para eventos canônicos.
- TickTick entra apenas como espelho outbound de eventos internos elegíveis.
- Item derivado nao vira evento canônico automaticamente em nenhuma leitura, sync ou comando conversacional.

### Derived financial items
- A V1 deve exibir itens financeiros derivados de domínios existentes na timeline.
- Esses itens entram como projeções read-only ou com deep link para edição na origem.
- A agenda nao pode criar um segundo lugar de edição para vencimentos de contas, lembretes financeiros ou ciclos.

### Occurrence strategy
- Em eventos recorrentes, `start_at` e `end_at` representam o template base da série.
- Ocorrências futuras sao materializadas em leitura a partir do evento + regra de recorrência.
- Apenas exceções pontuais são persistidas.

## Design Principles

### 1. One canonical domain for agenda
Eventos nativos da agenda pertencem ao domínio de calendário. Eles nao devem ser armazenados em `integration_configs`, TickTick ou tabelas legadas de notificações.

### 2. Strict separation of concerns
Devem existir fronteiras explícitas entre:

- evento canônico
- ocorrência
- lembrete/notificação
- projeção derivada
- espelho externo

### 3. Window-based read model
Toda leitura de agenda deve operar por janela:

- `from`
- `to`
- `timezone`

Nao haverá leitura "aberta" ou expansão ilimitada de recorrência.

### 4. External connectors never own business data
TickTick e futuros provedores externos recebem dados a partir do domínio canônico e nunca definem o que existe na agenda interna.

### 5. Authorization is always user-scoped
Toda mutação e leitura de agenda, via UI ou Ana Clara, deve operar com autorização explícita por `user_id`, alinhada ao usuário autenticado ou à conexão WhatsApp resolvida.

### 6. Delivery is not the domain
Lembretes e envios são derivados da agenda, mas não substituem o modelo do compromisso.

## Domain Model

### 1. Canonical event
Tabela principal: `calendar_events`

Representa o compromisso nativo do app.

Campos principais:

- `id`
- `user_id`
- `title`
- `description`
- `event_kind`
- `domain_type`
- `start_at`
- `end_at`
- `all_day`
- `timezone`
- `status`
- `location_text`
- `source`
- `created_by`
- `sync_eligible`
- `metadata`
- `created_at`
- `updated_at`
- `deleted_at`

Regras:

- `source` começa como `internal`.
- `created_by` deve aceitar pelo menos `user`, `ana_clara` e `system`.
- `status` começa com enum inicial: `scheduled`, `confirmed`, `cancelled`, `completed`.
- Eventos recorrentes usam `start_at`/`end_at` como template base da série.

### Sync eligibility (replaces sync_policy + ticktick_sync_enabled)

A versão anterior da spec carregava dois campos redundantes (`sync_policy` e `ticktick_sync_enabled`) que podiam divergir sem regra de precedência. A V1 consolida isso em um único campo:

- `sync_eligible: boolean` (default `true` para event_kind elegíveis, `false` para os demais).

Regra de decisão do worker de sync:

1. evento deve ter `sync_eligible = true`
2. evento deve ter `status` diferente de `cancelled`
3. evento deve ter `deleted_at IS NULL`
4. deve existir uma row ativa em `integration_configs` para o provider e o `user_id`

Se todas as condições passam, o evento é elegível para sync outbound. O worker resolve o provider e o projeto/lista destino a partir de `integration_configs`, nao a partir do evento.

Isso elimina a ambiguidade de dois campos e centraliza a decisão de "para onde" no conector.

### 2. Recurrence rule
Tabela: `calendar_event_recurrence_rules`

Guarda a regra da série sem persistir todas as ocorrências futuras.

Campos principais:

- `id`
- `event_id`
- `frequency`
- `interval`
- `by_weekday`
- `by_monthday`
- `starts_at`
- `until_at`
- `count_limit`
- `timezone`
- `created_at`
- `updated_at`

### 3. Occurrence override
Tabela: `calendar_event_occurrence_overrides`

Persistida apenas para exceções pontuais.

Campos principais:

- `id`
- `event_id`
- `occurrence_key`
- `original_start_at`
- `override_start_at`
- `override_end_at`
- `status`
- `title_override`
- `description_override`
- `is_cancelled`
- `created_at`
- `updated_at`

Regras:

- `occurrence_key` é a identidade estável da ocorrência dentro da série.
- Ocorrência normal é materializada em leitura e nao ocupa linha própria.
- Override só existe para remarcação, cancelamento ou ajuste pontual de uma instância.

### 4. Event reminder
Tabela: `calendar_event_reminders`

Representa a intenção do lembrete, não o envio.

Campos principais:

- `id`
- `event_id`
- `reminder_kind`
- `remind_offset_minutes`
- `channel_policy`
- `enabled`
- `created_at`
- `updated_at`

Regras:

- `reminder_kind` começa simples, por exemplo `default`, `prep`, `deadline`.
- Reminder define "quando".
- `notification_preferences` continua definindo canais ativos, DND e parte das regras de entrega.

### 5. External mirror link
Tabela: `calendar_external_event_links`

Separa explicitamente espelho externo de projeção derivada.

Campos principais:

- `id`
- `event_id`
- `provider`
- `provider_account_id`
- `external_object_id`
- `external_list_id`
- `external_parent_id`
- `external_series_id`
- `sync_direction`
- `sync_status`
- `last_synced_at`
- `last_error`
- `external_payload_hash`
- `created_at`
- `updated_at`

Constraints:

- `UNIQUE(event_id, provider)` para garantir no máximo um vínculo por evento por provedor
- `UNIQUE(provider, external_object_id)` para garantir que o mesmo objeto externo nao seja vinculado a dois eventos internos

Regras:

- Uma linha aqui significa somente que um evento canônico possui vínculo de sync com provedor externo.
- Isso nao cria item novo na timeline.
- Isso nao representa item derivado.

### 6. Unified agenda read model
A V1 deve preferir uma view, RPC ou query service que una:

- eventos canônicos materializados para a janela
- projeções de `payable_bills`
- projeções de `bill_reminders`
- projeções de `financial_cycles`

Cada item retornado para agenda deve trazer:

- `agenda_item_type`
- `origin_type`
- `origin_id`
- `dedup_key`
- `display_start_at`
- `display_end_at`
- `title`
- `subtitle`
- `status`
- `badge`
- `edit_route`
- `is_read_only`
- `supports_reschedule`
- `supports_complete`

Capacidades mínimas por tipo:

- evento canônico: `is_read_only = false`, `supports_reschedule = true`, `supports_complete = true`
- projeção derivada: `is_read_only = true`, `supports_reschedule = false`, `supports_complete = false`

#### Deduplication of derived financial projections

As três fontes derivadas podem representar o mesmo compromisso financeiro de formas diferentes. Sem regra de precedência, a agenda mostraria linhas duplicadas para o mesmo vencimento e a Ana Clara narraria repetido.

Regras de deduplicação:

1. **`dedup_key`**: cada projeção derivada deve produzir uma chave de deduplicação estável composta por `origin_type` + `origin_id` + data normalizada.
   - `payable_bill`: `pb:{bill_id}:{due_date}`
   - `bill_reminder`: `br:{bill_id}:{reminder_date}`
   - `financial_cycle`: `fc:{cycle_id}:{projected_date}`

2. **Precedência quando `bill_id` coincide**: quando uma `payable_bill` e um `bill_reminder` apontam para o mesmo `bill_id` e a mesma data, o read model deve manter apenas a projeção de `payable_bills` e suprimir a de `bill_reminders`. Motivo: a conta a pagar é a entidade canônica desse domínio e o reminder é derivado dela.

3. **`financial_cycles` nunca colide com bills**: ciclos financeiros representam marcos diferentes de contas a pagar. Eles entram com `dedup_key` próprio e nao precisam de regra de supressão cruzada com bills.

4. **Implementação**: a deduplicação deve acontecer no read model (view/RPC), nao no frontend. O contrato garante que itens com `dedup_key` duplicado já foram resolvidos antes de chegar ao consumidor.

## Taxonomy: What Each Thing Means

### Canonical event
Compromisso criado e possuído pelo domínio de calendário.

### Occurrence
Instância temporal de um evento, normalmente materializada em leitura.

### Reminder / notification
Intenção de entrega vinculada a uma ocorrência do evento canônico.

### Derived projection
Item lido de outro domínio interno, como `payable_bills`, `bill_reminders` ou `financial_cycles`.

### External mirror
Representação externa de um evento canônico em TickTick ou provedor futuro.

## TickTick Architecture

### Role in V1
TickTick será somente um conector outbound.

### Eligibility rules
Podem ser elegíveis para sync na V1:

- eventos canônicos `personal`
- eventos canônicos `task_like`
- eventos canônicos `financial_manual`

Nao são elegíveis:

- projeções derivadas de `payable_bills`
- projeções derivadas de `bill_reminders`
- projeções derivadas de `financial_cycles`
- itens somente operacionais
- eventos cancelados ou soft-deleted

### Recurrence and overrides
- A implementação inicial deve priorizar eventos nao recorrentes.
- Recorrência simples pode ser suportada se a API do TickTick se mostrar estável.
- Exceções pontuais só devem ser sincronizadas quando houver `occurrence_override` persistido e suporte seguro no conector.

### Outbound sync queue / job mechanism
A V1 deve usar uma fila persistida em banco para sync outbound, em vez de sync síncrono dentro do comando conversacional ou da UI.

Tabela recomendada: `calendar_sync_jobs`

Campos mínimos:

- `id`
- `user_id`
- `event_id`
- `occurrence_override_id` (nullable)
- `occurrence_key` (nullable)
- `provider`
- `job_type`
- `idempotency_key`
- `payload_hash`
- `status`
- `attempt_count`
- `run_after`
- `last_error`
- `created_at`
- `updated_at`

Enums e constraints:

- `status`: `pending`, `processing`, `succeeded`, `failed`, `skipped_unsupported`
- `UNIQUE(idempotency_key)` para garantir deduplicação de jobs

Tipos mínimos de job:

- `upsert_event`
- `upsert_occurrence_override`
- `cancel_occurrence`
- `delete_event`

#### Occurrence-level sync identity

Para que o worker consiga sincronizar "só o compromisso de amanhã" em vez da série inteira, o job deve carregar a identidade da ocorrência quando aplicável:

- `occurrence_override_id`: referencia a row em `calendar_event_occurrence_overrides` quando o job nasceu de uma exceção persistida.
- `occurrence_key`: a identidade estável da ocorrência dentro da série (ex.: `event_id:2026-04-15T09:00:00-03:00`), usada pelo conector para localizar o item externo correspondente.

Se ambos forem `NULL`, o job diz respeito ao evento/série como um todo.

Se `occurrence_override_id` for preenchido, o worker deve:

1. ler o override para obter os dados remarcados/cancelados
2. usar `occurrence_key` + `external_series_id` (de `calendar_external_event_links`) para identificar a instância no provedor externo
3. criar ou atualizar apenas aquela instância, sem tocar na série

Se o provedor externo nao suportar edição de instância individual, o worker deve marcar o job como `skipped_unsupported` em vez de falhar com retry infinito.

#### V1 sync scope for recurrence

Na V1, o sync outbound de exceções pontuais é **best-effort**:

- eventos nao recorrentes: sync completo obrigatório
- série recorrente inteira: sync do template se a API suportar
- override pontual: sync tentado; fallback para `skipped_unsupported` se o conector nao conseguir editar instância individual

Fluxo:

- mutação em `calendar_events` ou `calendar_event_occurrence_overrides` cria ou atualiza job de sync pendente
- worker/edge function periódica busca jobs vencidos
- conector resolve credenciais em `integration_configs`
- sucesso atualiza `calendar_external_event_links`
- falha marca retry com backoff

Regras:

- o job de sync nunca bloqueia a criação/edição do evento canônico
- o evento interno permanece válido mesmo com falha de sync externo

## Authorization Model

### UI flows
- Toda leitura e escrita deve filtrar por `user_id`.
- O usuário autenticado só enxerga e altera seus próprios `calendar_events`, reminders, overrides e links externos.

### Ana Clara flows
- Em comandos via WhatsApp, o `user_id` deve ser resolvido a partir da conexão/mensagem, como já ocorre em `webhook-uazapi` e `process-whatsapp-message`.
- Toda operação posterior de calendário deve carregar esse `user_id` como escopo obrigatório.

### Derived items
- Projeções derivadas só podem ser retornadas quando o item de origem pertencer ao mesmo `user_id`.

## Idempotency Requirements

### Conversational commands
Comandos de agenda vindos da Ana Clara devem ser idempotentes frente a retries e duplicação de webhook.

Requisitos:

- usar `message_id`/`whatsapp_message_id` como parte do controle de deduplicação
- operações de criação devem aceitar uma `idempotency_key`
- reprocessar a mesma mensagem nao deve criar eventos duplicados

### Outbound TickTick sync
Jobs de sync devem ser idempotentes.

Requisitos:

- `calendar_sync_jobs.idempotency_key` deve ser único por intenção lógica de sync
- `payload_hash` deve permitir short-circuit quando nada mudou
- upsert repetido deve convergir no mesmo vínculo externo

### Reminder dispatch
Envio de lembretes também deve ser idempotente.

Requisitos:

- a entrega deve ser deduplicada por ocorrência + reminder + canal
- retries nao podem gerar múltiplos envios em caso de sucesso já registrado
- logs de entrega precisam permitir auditoria e replay seguro

## Read Contract: Agenda Window

Toda leitura de agenda opera obrigatoriamente por:

- `from`
- `to`
- `timezone`

Regras:

- a expansão de recorrência ocorre apenas dentro da janela
- projeções derivadas também são recortadas pela mesma janela
- UI e Ana Clara consomem o mesmo contrato temporal

Benefícios:

- controle de performance
- previsibilidade de resposta
- consistência entre visualização humana e consulta conversacional

## How Ana Clara Connects

### Position in the architecture
A Ana Clara é cliente do domínio de calendário.

Ela pode:

- criar eventos canônicos
- consultar agenda por janela
- remarcar evento canônico
- cancelar evento canônico
- configurar lembretes de evento canônico

Ela nao pode:

- editar projeção derivada diretamente
- promover item derivado para evento canônico automaticamente
- usar TickTick como backend primário

### Conversational entry point
O ponto de entrada continua sendo `process-whatsapp-message`.

O design recomendado é adicionar um módulo dedicado de agenda, por exemplo:

- `calendar-handler`
- `calendar-intent-parser`
- `calendar-response-templates`

Fluxo:

- `process-whatsapp-message` detecta intenção de agenda
- encaminha para o handler de calendário
- o handler usa o domínio canônico
- o handler agenda reminders e jobs outbound quando necessário
- a resposta volta para o pipeline atual de WhatsApp

## Reminders and Notification Delivery

### Separation of responsibilities
- `calendar_event_reminders` guarda a intenção do lembrete
- `notification_preferences` segue guardando preferências de canal, DND e cadência
- o dispatcher resolve o envio final

### Reminder worker
A V1 deve ter um dispatcher dedicado para reminders de eventos canônicos, separado da origem de `bill_reminders`.

Função sugerida:

- `calendar-dispatch-reminders`

Responsabilidades:

- buscar ocorrências com reminder devido dentro da janela operacional
- aplicar DND e preferências
- produzir envios por canal
- registrar log de entrega
- garantir idempotência

#### How the worker finds "what fires now" without expanding all recurrence

Como as ocorrências recorrentes sao materializadas em leitura (nao pré-geradas), o worker precisa de uma estratégia eficiente para encontrar reminders devidos sem expandir séries inteiras a cada execução.

Estratégia recomendada: **next-fire tracking table** (`calendar_reminder_schedule`).

Campos mínimos:

- `id`
- `event_id`
- `reminder_id`
- `occurrence_key`
- `fire_at` (timestamptz, quando o lembrete deve ser entregue)
- `delivery_status` (`pending`, `sent`, `failed`, `skipped`)
- `delivered_at`
- `channel`
- `idempotency_key`
- `created_at`

Enums e constraints:

- `channel`: `whatsapp`, `email`, `push` (alinhado com `bill_reminders.channel` e `notification_preferences`)
- `delivery_status`: `pending`, `sent`, `failed`, `skipped`
- `UNIQUE(idempotency_key)` para garantir que retries nao gerem linhas duplicadas
- `UNIQUE(reminder_id, occurrence_key, channel)` para garantir que cada combinação reminder + ocorrência + canal tenha no máximo uma linha pendente

Fluxo:

1. quando um evento canônico com reminders é criado ou alterado, o sistema calcula as próximas N ocorrências (ex.: N=5 ou horizonte de 30 dias) e popula `calendar_reminder_schedule` com os `fire_at` correspondentes.
2. o cron do worker faz apenas `SELECT ... WHERE fire_at <= now() AND delivery_status = 'pending'`. Isso é uma query indexada simples, sem expansão de recorrência em runtime.
3. após processar um lote, o worker verifica se as séries recorrentes precisam de novas linhas futuras e as repopula incrementalmente (sliding window).
4. overrides persistidos recalculam as linhas afetadas na schedule.
5. cancelamento de ocorrência marca as linhas correspondentes como `skipped`.

Benefícios:

- o cron nunca precisa expandir recorrência
- a query de "o que vence agora" é O(pending_rows), nao O(all_series * window)
- a idempotência fica natural: cada linha tem `idempotency_key` única

Custo:

- mais uma tabela para manter sincronizada
- a repopulação incremental precisa ser confiável

Alternativa considerada e descartada: expandir recorrência a cada rodada do cron. Isso funciona para poucos eventos, mas se torna gargalo com dezenas de séries e janelas longas.

### Relationship with legacy jobs
- `send-bill-reminders` continua responsável por `bill_reminders`
- `send-proactive-notifications` continua responsável por alertas proativos existentes
- lembretes de eventos canônicos do calendário nao dependem dessas tabelas legadas

## Edge Functions and Jobs

### 1. Calendar command surface
Deve existir uma camada de mutação semântica para UI e Ana Clara.

Operações mínimas:

- `create_calendar_event`
- `update_calendar_event`
- `reschedule_calendar_occurrence`
- `cancel_calendar_event_or_occurrence`
- `set_event_reminders`
- `list_agenda_items`

### 2. TickTick sync worker
Função sugerida:

- `calendar-sync-ticktick`

Responsabilidades:

- consumir `calendar_sync_jobs`
- resolver credenciais em `integration_configs`
- criar/atualizar/excluir espelhos externos
- atualizar `calendar_external_event_links`
- registrar retry e erro

### 3. Reminder worker
Função sugerida:

- `calendar-dispatch-reminders`

Responsabilidades:

- query `calendar_reminder_schedule WHERE fire_at <= now() AND delivery_status = 'pending'`
- aplicar DND e `notification_preferences`
- deduplica por `idempotency_key`
- enviar via WhatsApp inicialmente
- atualizar `delivery_status` e `delivered_at`
- repopular incrementalmente a schedule para séries recorrentes

### 4. Agenda window read path
Pode ser implementado como:

- RPC do Supabase
- view + query service
- edge function de agregação

A decisão técnica deve preservar o contrato único por janela.

## Main Flows

### 1. Create canonical event
- usuário ou Ana Clara envia intenção de criar compromisso
- sistema cria `calendar_events`
- opcionalmente cria `calendar_event_recurrence_rules`
- opcionalmente cria `calendar_event_reminders`
- se reminders existem, popula `calendar_reminder_schedule` para as próximas N ocorrências
- se elegível, cria ou atualiza `calendar_sync_jobs`

### 2. Read agenda window
- cliente informa `from`, `to`, `timezone`
- sistema materializa ocorrências dos eventos canônicos dentro da janela
- aplica `calendar_event_occurrence_overrides`
- junta projeções derivadas internas
- devolve timeline unificada com capacidades de ação

### 3. Reminder delivery
- worker queries `calendar_reminder_schedule WHERE fire_at <= now() AND delivery_status = 'pending'`
- aplica `notification_preferences` e DND
- deduplica por `idempotency_key`
- envia via `send-whatsapp-message` ou outro canal futuro
- atualiza `delivery_status` e `delivered_at`
- após o lote, repopula incrementalmente a schedule para séries recorrentes que precisam de novas linhas futuras

### 4. Reschedule canonical occurrence
- usuário ou Ana Clara pede remarcação de uma instância
- sistema grava `calendar_event_occurrence_overrides`
- sistema recalcula linhas afetadas em `calendar_reminder_schedule`
- leitura futura da janela passa a refletir a nova instância
- se elegível, gera job outbound de sync com `occurrence_override_id` e `occurrence_key` preenchidos

### 5. Interact with derived item
- item derivado aparece na timeline
- usuário pode consultar detalhes
- ação de editar redireciona para a origem
- o sistema nao cria `calendar_event` automaticamente

### 6. TickTick outbound sync
- worker consome `calendar_sync_jobs`
- aplica idempotência via `idempotency_key` e `payload_hash`
- se `occurrence_override_id` presente, tenta sync da instância individual; se provedor nao suporta, marca `skipped_unsupported`
- se sync é do evento/série, faz upsert/delete no TickTick
- persiste ou atualiza `calendar_external_event_links`

## V1 Scope Definition

### Included
- domínio canônico de calendário
- eventos canônicos simples
- recorrência com materialização em leitura
- overrides pontuais persistidos
- reminders de eventos canônicos com next-fire tracking (`calendar_reminder_schedule`)
- leitura unificada por janela com deduplicação de projeções financeiras
- projeções derivadas read-only de `payable_bills`, `bill_reminders` e `financial_cycles`
- sync outbound com TickTick para eventos elegíveis (occurrence-level best-effort)
- integração conversacional inicial com Ana Clara

### Deferred
- UI completa de calendário dia/semana/mês
- bidirectional sync com TickTick
- Google Calendar
- Open Finance e MyPlug
- consolidação total dos dispatchers existentes
- promoção manual assistida de item derivado para evento canônico

## Testing Strategy

### Domain tests
- criação e edição de eventos canônicos
- materialização de recorrência por janela
- aplicação de occurrence overrides
- elegibilidade de sync com `sync_eligible` e regras de status/deleted_at
- populacao e repopulacao incremental de `calendar_reminder_schedule`

### Integration tests
- timeline unificada misturando canônicos e derivados
- deduplicação de projeções financeiras quando `payable_bill` e `bill_reminder` apontam para o mesmo `bill_id` e data
- enqueue e consumo de `calendar_sync_jobs` com e sem `occurrence_override_id`
- sync de override pontual marca `skipped_unsupported` quando provedor nao suporta instância individual
- envio idempotente de reminders via `calendar_reminder_schedule`
- comando conversacional de criação sem duplicar evento em retries

### Regression tests
- derived item continua read-only
- derived item nunca é promovido automaticamente
- falha de TickTick nao afeta agenda canônica
- janela `from`/`to` sempre limita a leitura
- timeline nao mostra linhas duplicadas para o mesmo vencimento financeiro

## Recommended Phase Evolution

### Phase 1: Internal domain + TickTick
- tabelas canônicas (`calendar_events`, `calendar_event_recurrence_rules`, `calendar_event_occurrence_overrides`, `calendar_event_reminders`, `calendar_reminder_schedule`, `calendar_external_event_links`, `calendar_sync_jobs`)
- agenda window read model com deduplicação de projeções financeiras
- reminders de eventos canônicos via next-fire tracking
- sync outbound TickTick com occurrence-level identity
- comandos conversacionais iniciais

### Phase 2: Calendar UI
- página própria de calendário
- visões dia, semana e mês
- ações visuais sobre eventos canônicos
- navegação para origem dos derivados

### Phase 3: Google Calendar
- novo conector externo
- reaproveitamento do mesmo modelo canônico e da mesma fila outbound

### Phase 4: Ana Clara automations
- criação mais inteligente por texto e áudio
- remarcação e consulta avançadas
- automações orientadas a contexto financeiro e pessoal

## Recommendation
Seguir com o calendário como domínio canônico interno, mantendo `integration_configs` apenas para conectores externos e usando TickTick como espelho outbound resiliente. A V1 deve unificar leitura temporal do app sem criar conflito de ownership: o que é do calendário vive no calendário; o que é de outro domínio aparece como projeção derivada read-only; o que é externo entra apenas como mirror link de sync.
