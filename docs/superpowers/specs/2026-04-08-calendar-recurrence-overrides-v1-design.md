# Calendar Recurrence And Overrides V1 Design

## Goal
Fechar a próxima frente estrutural da Agenda V1 com recorrência persistida, materialização por janela, occurrence overrides pontuais e leitura correta em `get_agenda_window`, sem abrir Google Calendar nem polimento conversacional da Ana Clara.

## Scope
Inclui:

- recorrência persistida em `calendar_event_recurrence_rules`
- materialização virtual de ocorrências por janela
- identity estável por `occurrence_key`
- overrides persistidos em `calendar_event_occurrence_overrides`
- RPCs semânticas para remarcação e cancelamento de ocorrência específica
- leitura correta disso em `get_agenda_window`
- comportamento explícito de TickTick V1 para occurrence-level sync como `skipped_unsupported`

Não inclui:

- Google Calendar
- UX final/polimento de UI
- polimento textual da Ana Clara
- geração física massiva de ocorrências
- occurrence-level sync externo completo
- recorrência anual nesta etapa

## Confirmed Scope
Frequências suportadas nesta etapa:

- `daily`
- `weekly`
- `monthly`

`yearly` fica deferido.

## Architectural Decision
Usar a abordagem 2: helpers e superfícies semânticas no banco, com `get_agenda_window` como fachada única de leitura por janela.

Motivos:

- mantém o domínio canônico centralizado no banco
- preserva um contrato único para UI e Ana Clara
- isola mutações semânticas de leitura e sync
- permite manter TickTick occurrence-level explicitamente fora do escopo operacional da V1

## Canonical Model

### Series Template
- `calendar_events.start_at` e `calendar_events.end_at` continuam representando o template base da série.
- O evento canônico não é duplicado por ocorrência.
- A série continua sendo owned por `calendar_events`.

### Recurrence Rule
- `calendar_event_recurrence_rules` guarda a regra de recorrência da série.
- Continua valendo a constraint `one_rule_per_event`.
- Nesta etapa:
  - `daily`: usa `interval_value`
  - `weekly`: usa `interval_value` e opcionalmente `by_weekday`
  - `monthly`: usa `interval_value` e `by_monthday` conforme a semântica mensal abaixo
- `starts_at`, `until_at`, `count_limit` e `timezone` limitam a expansão.

#### Monthly semantics (V1, explícito)
- **Dia do mês efetivo:** se `by_monthday` estiver vazio ou nulo, usar o **dia civil** do template `calendar_events.start_at` interpretado no `timezone` da série (regra ou evento, conforme implementação única documentada na RPC; o dia deve ser o mesmo que o usuário vê no compromisso base).
- **Meses sem esse dia:** se o mês não tiver o dia pedido (ex.: 31 em abril, 30 em fevereiro em anos não bissextos), **não** materializar ocorrência naquele mês — a instância é **skipped** para aquele mês. **Proibido** fazer clamp para o último dia do mês nesta V1.
- **Lista `by_monthday` com vários valores:** se no futuro a coluna suportar múltiplos dias, cada candidato obedece à mesma regra de skip por mês; nesta etapa priorizar um único dia efetivo alinhado ao comportamento acima (um elemento ou o fallback do `start_at`).

### Occurrence Identity
- `occurrence_key` permanece a identidade estável da instância.
- Formato: `event_id:original_start_at_iso`.
- `original_start_at` é sempre derivado da projeção da série base, antes de qualquer override.
- Regras de override e sync occurrence-level devem sempre ancorar no `original_start_at`.

### Occurrence Override
- `calendar_event_occurrence_overrides` continua sendo a única persistência de exceções pontuais.
- Cada linha representa somente uma instância específica da série.
- Casos suportados:
  - remarcação de uma ocorrência
  - cancelamento de uma ocorrência
  - ajuste pontual de `title` e `description`
- A série base não é alterada destrutivamente para representar exceções.

### Policy: overrides vs mudança estrutural da série (V1, conservadora)
Overrides ancoram em `occurrence_key` / `original_start_at` derivados da **projeção da série no momento em que foram criados**. Qualquer mudança estrutural que invalide ou torne ambígua essa âncora **não** pode ser silenciosamente “consertada” por migração automática nesta fase.

**Definição de mudança estrutural** (qualquer uma dispara a política abaixo quando aplicável):
- alterar `frequency`, `interval_value`, `by_weekday`, `by_monthday` (incluindo de não-vazio para vazio ou o inverso), `starts_at`, `until_at`, `count_limit` ou `timezone` da regra;
- **remover** a linha de `calendar_event_recurrence_rules` (série deixa de ser recorrente);
- alterar `calendar_events.start_at` ou `calendar_events.end_at` enquanto existir regra de recorrência para o mesmo `event_id` (o template base mudou).

**Regra V1:**
- Se existir **pelo menos uma** linha em `calendar_event_occurrence_overrides` para esse `event_id`, então:
  - `set_calendar_event_recurrence` (e qualquer RPC que altere o template `start_at`/`end_at` do evento recorrente) deve **falhar** com erro explícito (ex.: `occurrence_overrides_block_structural_change`), **salvo** se o cliente tiver executado antes um passo **explícito** de limpeza de overrides para esse evento (RPC dedicada tipo `delete_calendar_occurrence_overrides_for_event` ou parâmetro booleano único e documentado tipo `p_confirm_drop_overrides` que **apaga** todas as overrides daquele evento em mesma transação antes de aplicar a mudança).
- **Não** implementar nesta V1: reancorar overrides, heurísticas de “match” entre ocorrências antigas e novas, nem migração automática de `occurrence_key`.
- Se **não** houver overrides: permitir alterar ou remover a regra normalmente. Ao **remover** a regra, o evento passa a ser tratado como **evento simples**; o template vigente continua sendo `calendar_events.start_at` / `calendar_events.end_at` **após** a operação (sem duplicar evento físico).

## Read Model

### Window Materialization
`get_agenda_window(p_user_id, p_from, p_to)` deve:

1. continuar retornando eventos simples não recorrentes como hoje
2. expandir apenas ocorrências de eventos recorrentes dentro da janela pedida
3. aplicar overrides por `occurrence_key`
4. esconder instâncias canceladas
5. exibir instâncias remarcadas em `override_start_at` / `override_end_at`
6. continuar combinando projeções financeiras derivadas
7. respeitar rigorosamente `p_from` / `p_to`

Não haverá materialização aberta nem geração para fora da janela.

### Output Contract
Para ocorrências recorrentes materializadas, `get_agenda_window` continua devolvendo um `agenda_item` canônico, mas com metadata suficiente para ações futuras:

- `event_id`
- `occurrence_key`
- `is_recurring`
- `original_start_at`
- `override_id` quando existir
- `series_frequency` quando útil

`origin_id` pode continuar sendo o `event_id`. A identidade real da instância na timeline fica em `dedup_key` e metadata.

### Deduplication
- eventos simples usam `ce:<event_id>`
- ocorrências recorrentes usam `ceo:<occurrence_key>`
- projeções financeiras mantêm a deduplicação existente

## Semantic Surfaces

### 1. Set Event Recurrence
Criar uma superfície semântica para regra da série, por exemplo:

- `set_calendar_event_recurrence(...)`

Responsabilidades:

- criar, substituir ou remover a regra de recorrência de um evento
- **aplicar a política conservadora de overrides** (secção *Policy: overrides vs mudança estrutural*): bloquear mudança estrutural com overrides existentes, exceto após limpeza explícita documentada
- validar ownership por usuário
- aceitar `p_user_id` para service role / WhatsApp quando necessário
- ser idempotente quando a regra final já estiver aplicada
- não gerar ocorrências físicas

### 2. Reschedule Occurrence
Criar RPC semântica para remarcação pontual, por exemplo:

- `reschedule_calendar_occurrence(...)`

Responsabilidades:

- receber `event_id`
- receber `occurrence_key` ou `original_start_at` como âncora semântica
- persistir/upsertar o override correspondente
- preencher `override_start_at` e `override_end_at`
- preservar a série original
- ser idempotente quando reexecutada com o mesmo alvo e mesmo resultado

### 3. Cancel Occurrence
Criar RPC semântica para cancelamento pontual, por exemplo:

- `cancel_calendar_occurrence(...)`

Responsabilidades:

- criar/upsertar override com `is_cancelled = true`
- manter `original_start_at` e `occurrence_key` estáveis
- não alterar destrutivamente o evento base
- ser idempotente quando reexecutada

## Reminders em eventos recorrentes (V1, explícito)
Política **conservadora** para esta frente:

- **Evento simples** (sem linha em `calendar_event_recurrence_rules` para o `event_id`): `set_calendar_event_reminders` e `calendar_reminder_schedule` comportam-se como hoje — totalmente suportados.
- **Evento recorrente** (existe regra em `calendar_event_recurrence_rules`): **não** suportar nesta V1 reminders operacionais que disparem por ocorrência materializada (sem `calendar_reminder_schedule` coerente multi-ocorrência, sem “próxima ocorrência só” como meio-termo).
- Implementação recomendada: `set_calendar_event_reminders` deve **rejeitar** com erro explícito (ex.: `recurring_reminders_not_supported_v1`) quando o `event_id` tiver recorrência ativa.
- Ao **introduzir** recorrência num evento que já possua `calendar_event_reminders` e/ou linhas em `calendar_reminder_schedule`, `set_calendar_event_recurrence` deve **falhar** ou exigir o mesmo tipo de **limpeza explícita** usada para overrides (transação única documentada), para não deixar schedule órfão ou semântica incoerente.
- **Deferido** para fase posterior: população/repopulação de `calendar_reminder_schedule` alinhada a múltiplas ocorrências, `occurrence_key` por instância recorrente, e integração com overrides de horário.

Objetivo: evitar comportamento **meio-suportado** que pareça funcionar na UI mas gere inconsistência silenciosa entre agenda, lembretes e workers.

## TickTick V1 Decision

### Event Level
- evento simples continua com sync outbound normal
- série recorrente pode continuar usando o fluxo de evento/série somente se isso permanecer semanticamente seguro

### Occurrence Level
- jobs com `occurrence_override_id` e `job_type` occurrence-level continuam existindo como contrato futuro
- worker `calendar-sync-ticktick` continua marcando:
  - `upsert_occurrence_override` => `skipped_unsupported`
  - `cancel_occurrence` => `skipped_unsupported`

Essa é a decisão prática da V1: o domínio interno suporta override por ocorrência, mas o conector externo não tenta projetar isso de forma artificial.

## UI And Ana Clara Integration
- UI não deve fazer `update` direto em `calendar_events` para representar exceções.
- UI pode continuar simples, mas o domínio e o read model já ficam prontos para ações occurrence-level.
- Ana Clara pode passar a usar as RPCs semânticas novas quando a intenção já for reconhecida.
- Não há exigência de polimento conversacional nesta etapa.

## Main Flows

### Create recurring event
- cliente cria `calendar_events`
- cliente define `calendar_event_recurrence_rules`
- leitura futura materializa instâncias por janela

### Read recurring agenda window
- cliente informa `from` e `to`
- sistema expande ocorrências elegíveis das séries suportadas
- sistema aplica overrides persistidos
- sistema retorna a timeline canônica final

### Reschedule one occurrence
- cliente informa a instância alvo
- sistema persiste/upserta override
- leitura futura passa a refletir a nova data/hora
- se existir job de sync occurrence-level, worker TickTick marca `skipped_unsupported`

### Cancel one occurrence
- cliente informa a instância alvo
- sistema persiste/upserta override cancelado
- leitura futura oculta a ocorrência
- a série permanece intacta

## Testing Strategy

### Domain tests
- materialização `daily` por janela
- materialização `weekly` por janela com `by_weekday`
- materialização `monthly` por janela com `by_monthday` vazio (fallback ao dia de `start_at`)
- monthly: mês sem o dia pedido **não** gera ocorrência (skip), sem clamp para último dia
- respeito a `until_at` e `count_limit`
- estabilidade de `occurrence_key`
- `set_calendar_event_recurrence` bloqueada quando existem overrides, salvo limpeza explícita
- remoção de regra sem overrides: evento passa a simples com template atual
- idempotência de `set_calendar_event_recurrence`
- idempotência de `reschedule_calendar_occurrence`
- idempotência de `cancel_calendar_occurrence`
- `set_calendar_event_reminders` rejeita evento com recorrência ativa

### Read model tests
- `get_agenda_window` inclui ocorrências recorrentes dentro da janela
- `get_agenda_window` não extrapola fora da janela
- override remarcado substitui a instância base
- ocorrência cancelada não aparece
- deduplicação financeira continua intacta

### Integration tests
- remarcação de uma ocorrência não altera a série inteira
- cancelamento de uma ocorrência não cancela o evento base
- jobs occurrence-level para TickTick são marcados `skipped_unsupported`

## Deferred After This Stage
- `yearly`
- UX completa de edição de recorrência na UI
- reconhecimento conversacional mais rico para remarcação/cancelamento por ocorrência
- reminders operacionais por ocorrência em séries recorrentes (`calendar_reminder_schedule` multi-instância, alinhado a overrides)
- sync externo de instância individual
