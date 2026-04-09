# Agenda + TickTick Closure V1 — Design Spec

## Goal
Fechar a agenda do app como ferramenta operacional real, com bidirecionalidade funcional com TickTick e paridade minima de UI/UX para que o usuario nao precise depender do TickTick como agenda primaria. O app continua sendo a fonte de verdade.

## Problem Statement
A agenda existe no app, o schema bidirecional esta deployado, mas o uso real ainda nao funciona:
- Itens do TickTick nao aparecem automaticamente na agenda do app
- O modal de criacao e basico demais (sem recorrencia, sem lembretes, sem categoria)
- A view semanal nao mostra duracao real dos eventos
- Nao ha separacao visual por categoria/lista
- A Clara nao consegue operar reminders pelo WhatsApp de forma equivalente ao TickTick
- O ciclo live TickTick -> app -> TickTick nunca foi validado end-to-end

## Builds On
- `2026-04-08-calendar-agenda-v1-design.md` — dominio canonico, agenda unificada
- `2026-04-08-calendar-recurrence-overrides-v1-design.md` — recorrencia, overrides, RPCs
- `2026-04-09-bidirectional-agenda-external-connectors-design.md` — schema bidirecional, inbound mapping, financial routing
- Tasks 1-9 da implementacao bidirecional — migrations aplicadas, worker inbound implementado, reminders recorrentes corrigidos

## Foundational Premises
1. O app e a fonte de verdade. TickTick e conector opcional.
2. A agenda funciona 100% sem conector externo.
3. Nao estamos copiando o TickTick. Estamos aproximando a agenda do fluxo operacional real.
4. Google Calendar nao bloqueia esta V1; entra como conector irmao no futuro.
5. Ownership entre `calendar_events` e `payable_bills` permanece inalterado.

---

## Part A: TickTick Bidirectional Real

### A.1 O que a API do TickTick entrega

Campos por task (fonte: TickTick Open API v1):

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | Identificador da task |
| `projectId` | string | Projeto/lista |
| `title` | string | Titulo |
| `content` | string | Conteudo/corpo |
| `desc` | string | Descricao do checklist |
| `isAllDay` | boolean | Dia inteiro |
| `startDate` | ISO datetime | Inicio |
| `dueDate` | ISO datetime | Vencimento |
| `timeZone` | string | Ex: `America/Sao_Paulo` |
| `repeatFlag` | string | RRULE. Ex: `RRULE:FREQ=DAILY;INTERVAL=1` |
| `reminders` | string[] | Triggers iCal. Ex: `["TRIGGER:P0DT9H0M0S", "TRIGGER:PT0S"]` |
| `priority` | int | 0=None, 1=Low, 3=Medium, 5=High |
| `status` | int | 0=Normal, 2=Completed |
| `completedTime` | ISO datetime | Quando foi concluida |
| `items` | array | Subtasks |
| `sortOrder` | int | Ordem |

Campos por project:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | string | Identificador do projeto |
| `name` | string | Nome (ex: "Mentorias", "Contas Pessoais") |
| `color` | string | Cor hex (ex: `#F18181`) |
| `kind` | string | `TASK` ou `NOTE` |
| `viewMode` | string | `list`, `kanban`, `timeline` |

Limitacao critica da API:
- `GET /open/v1/project/{projectId}/data` retorna apenas tasks **nao concluidas** (undone). Tasks completadas nao aparecem.
- Nao ha campo `modifiedDate` na API oficial. Deteccao de mudanca precisa ser por comparacao de snapshot (hash de campos relevantes) em vez de timestamp incremental.
- Nao ha endpoint de webhook/push. Toda sincronizacao e poll-based.
- Nao ha endpoint para editar uma unica ocorrencia de serie recorrente. Occurrence-level sync permanece `skipped_unsupported`.

### A.2 Mapeamento TickTick -> Dominio Canonico

#### Tasks de agenda -> `calendar_events`

| TickTick | App | Notas |
|----------|-----|-------|
| `title` | `title` | Direto |
| `content` + `desc` | `description` | Concatenar se ambos presentes |
| `startDate` | `start_at` | Converter timezone |
| `dueDate` | `end_at` | Se `startDate` e `dueDate` diferentes |
| `isAllDay` | `all_day` | Direto |
| `timeZone` | `timezone` | Direto |
| `priority` | `metadata.priority` | Mapear: 0->null, 1->low, 3->medium, 5->high |
| `status` | `status` | 0->scheduled, 2->completed |
| `projectId` | `event_kind` | Via `ticktick_default_list_mappings` |
| `repeatFlag` | `calendar_event_recurrence_rules` | Parse RRULE (V1: FREQ + INTERVAL + BYDAY/BYMONTHDAY) |
| `reminders` | `calendar_event_reminders` | Parse TRIGGER (ver secao A.3) |
| `items` | `metadata.subtasks` | Armazenar em metadata; nao criar entidade separada na V1 |

#### Tasks financeiras -> `payable_bills`
Mantido: filtro `FINANCIAL_COUNTER_PATTERNS` no titulo. Se match -> rota para `payable_bills` (ja implementado em Tasks 1-3).

### A.3 Mapeamento de Reminders (TickTick <-> App)

#### Semantica de reminder: relativo vs absoluto

Esta frente precisa distinguir dois tipos de reminder no produto:

1. **Reminder relativo por offset**
   - Ex.: "30 min antes", "1 hora antes", "1 dia antes"
   - Significa sempre `evento.start_at - offset`
   - E o unico formato que o TickTick Open API representa com seguranca via `TRIGGER`

2. **Reminder absoluto ancorado em horario civil**
   - Ex.: "1 dia antes as 09:00"
   - Nao significa apenas "1440 minutos antes"
   - Exemplo real:
     - evento: 15:00
     - reminder desejado: 1 dia antes as 09:00
     - offset de 1440 minutos entregaria 1 dia antes as 15:00, que e semanticamente diferente

#### Decisao explicita de V1

**A V1 suporta plenamente apenas reminders relativos por offset.**

Consequencias:
- `TRIGGER` do TickTick mapeia corretamente apenas para reminder relativo
- O app pode continuar exibindo UI preparada para horarios absolutos, mas **nao promete espelhamento fiel com TickTick para esse caso na V1**
- Se o usuario configurar reminder absoluto no app, ele deve ser tratado como **reminder nativo do sistema**, entregue pela Clara/WhatsApp, sem round-trip fiel para o TickTick

#### Inbound: TRIGGER -> `calendar_event_reminders`

Formato TickTick: `TRIGGER:PnDTnHnMnS` (duracao ISO 8601 antes do evento)

Parsing:
- `TRIGGER:PT0S` -> 0 minutos antes (no horario do evento)
- `TRIGGER:P0DT9H0M0S` -> 540 minutos antes (9 horas antes)
- `TRIGGER:P1DT0H0M0S` -> 1440 minutos antes (1 dia antes, no mesmo horario do evento)
- `TRIGGER:PT30M0S` -> 30 minutos antes
- `TRIGGER:PT1H0M0S` -> 60 minutos antes

Mapeamento V1:
- cada TRIGGER vira uma row em `calendar_event_reminders` com `remind_offset_minutes` calculado
- reminders importados do TickTick entram no app como **relativos**
- a V1 nao infere nem reconstrui um reminder absoluto do tipo "1 dia antes as 09:00" a partir de TRIGGER relativo

#### Outbound: `calendar_event_reminders` -> TRIGGER

Reverso direto para reminders relativos:
- `remind_offset_minutes` -> `TRIGGER:P{days}DT{hours}H{minutes}M0S`

Regra de espelhamento outbound:
- reminders relativos -> espelhar para TickTick normalmente
- reminders absolutos nativos do app -> **nao** espelhar como TRIGGER relativo, para evitar mentir sobre a hora real do lembrete

#### Regra V1
- Inbound: importar todos os TRIGGER validos como reminders relativos do app
- Outbound: ao criar/editar task no TickTick, enviar apenas reminders relativos do app como array de TRIGGER
- Ao importar, chamar `set_calendar_event_reminders` para o evento criado
- Para eventos recorrentes importados, `calendar_populate_recurring_reminder_schedule` e chamada automaticamente (ja implementado na Task 6)

#### Honestidade de paridade na V1

**A V1 nao entrega paridade total com o caso de uso "1 dia antes as 09:00" quando o item precisa espelhar fielmente para o TickTick.**

O que a V1 garante:
- reminders relativos equivalentes entre app e TickTick
- reminders absolutos nativos do app funcionando no proprio sistema / Clara

O que a V1 nao garante:
- round-trip fiel de reminders absolutos entre app e TickTick

### A.4 Mapeamento de Recorrencia (TickTick <-> App)

#### Inbound: `repeatFlag` -> `calendar_event_recurrence_rules`

Parsing de RRULE na V1:

| RRULE Param | App Field | Suportado V1 |
|-------------|-----------|-------------|
| `FREQ=DAILY` | `frequency = 'daily'` | Sim |
| `FREQ=WEEKLY` | `frequency = 'weekly'` | Sim |
| `FREQ=MONTHLY` | `frequency = 'monthly'` | Sim |
| `FREQ=YEARLY` | `frequency = 'yearly'` | Nao (deferido) |
| `INTERVAL=N` | `interval_value = N` | Sim |
| `BYDAY=MO,WE,FR` | `by_weekday = ['MO','WE','FR']` | Sim |
| `BYMONTHDAY=15` | `by_monthday = [15]` | Sim |
| `UNTIL=...` | `until_at` | Sim |
| `COUNT=N` | `count_limit = N` | Sim |

RRULEs nao suportadas na V1:
- `FREQ=YEARLY`
- `BYSETPOS`
- `BYHOUR`, `BYMINUTE`
- Regras compostas complexas

Tratamento: se o RRULE tiver parametros nao suportados, importar como evento simples (sem recorrencia) e logar `rrule_unsupported_v1` no metadata do link.

#### Outbound: `calendar_event_recurrence_rules` -> `repeatFlag`

Construir RRULE string a partir dos campos do app. Exemplo:
- `frequency=monthly, interval_value=1, by_monthday=[15]` -> `RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15`

### A.5 Mapeamento de Projetos/Listas

Projetos do primeiro usuario (referencia real):

| Projeto TickTick | ID | Categoria no App |
|------------------|----|-----------------|
| Contas Pessoais | `67158c51db647de6536f46dc` | `contas` (financial filter) |
| Pessoal Alf | `643c0518525047536b6594d0` | `personal` |
| Trabalho Alf | `643c0518525047536b6594d1` | `work` |
| Mentorias | `67fbc6398f08b12415f506c4` | `mentoring` |
| Notas Alf | `643c0518525047536b6594cf` | `notes` (sync disabled por default) |

Armazenamento: `integration_configs.ticktick_default_list_mappings` (JSONB, ja existe).

Formato:
```json
{
  "67158c51db647de6536f46dc": { "label": "Contas Pessoais", "event_kind": "financial", "sync_enabled": true, "color": "#F18181" },
  "643c0518525047536b6594d0": { "label": "Pessoal Alf", "event_kind": "personal", "sync_enabled": true, "color": "#4A90D9" },
  "643c0518525047536b6594d1": { "label": "Trabalho Alf", "event_kind": "work", "sync_enabled": true, "color": "#7B68EE" },
  "67fbc6398f08b12415f506c4": { "label": "Mentorias", "event_kind": "mentoring", "sync_enabled": true, "color": "#F5A623" },
  "643c0518525047536b6594cf": { "label": "Notas Alf", "event_kind": "notes", "sync_enabled": false }
}
```

### A.6 Ciclo Bidirecional Funcional Real

O que precisa funcionar end-to-end:

| Acao | Fluxo | Estado atual | O que falta |
|------|-------|-------------|------------|
| Criar no TickTick | Inbound -> `calendar_events` + link | Worker implementado (Task 3) | Ciclo live nunca validado; reminders/recorrencia inbound nao implementados |
| Criar no app | Outbound -> task no TickTick | Funciona para eventos simples | Precisa enviar reminders e repeatFlag |
| Editar no TickTick | Inbound detecta mudanca -> update local | Implementado via snapshot comparison | Precisa testar live |
| Editar no app | Outbound update -> TickTick | Funciona | Precisa incluir reminders/repeatFlag no payload |
| Deletar no TickTick | Link -> `remote_deleted`, canonico intacto | Implementado | Precisa testar live |
| Deletar no app | Outbound delete -> TickTick | Funciona | OK |
| Conflito | App-wins, re-push, logar | Implementado | Precisa testar live |

### A.7 Gaps Concretos para Fechar

1. **Inbound: parse e persistir `repeatFlag`** como `calendar_event_recurrence_rules` ao criar evento
2. **Inbound: parse e persistir `reminders`** como `calendar_event_reminders` ao criar evento
3. **Inbound: parse `priority`** e armazenar em metadata
4. **Outbound: incluir `repeatFlag`** no payload do `buildTickTickPayload`
5. **Outbound: incluir `reminders`** no payload do `buildTickTickPayload`
6. **Outbound: incluir `priority`** no payload do `buildTickTickPayload`
7. **Validacao live end-to-end** do ciclo completo (criar la -> aparece aqui; criar aqui -> aparece la; editar; deletar; conflito)
8. **Deteccao de mudanca sem `modifiedDate`**: usar hash de campos relevantes (`title + startDate + dueDate + repeatFlag + reminders + priority + status`) comparado com `external_payload_hash` no link
9. **UI de mapeamento de projetos** na pagina de integracoes (primeira configuracao)

### A.8 Limitacoes Reais da V1

- TickTick API retorna apenas tasks nao concluidas; tasks completadas nao sincronizam inbound
- Sem webhook; polling a cada N minutos (default 10)
- Occurrence-level sync permanece `skipped_unsupported` (API nao permite editar instancia individual de serie)
- `FREQ=YEARLY` nao suportado; importado como evento simples
- Subtasks armazenadas em metadata; sem entidade propria
- Merge cross-provider (TickTick + Google Calendar) permanece fora da V1

---

## Part B: Paridade Funcional Minima da UI

### B.1 Categorias/Listas com Separacao Visual

O app precisa de um sistema de categorias que mapeie diretamente para `event_kind` e para os projetos do TickTick.

Categorias V1 fixas (expandiveis futuramente):

| Categoria | `event_kind` | Cor | Icone |
|-----------|-------------|-----|-------|
| Pessoal | `personal` | Azul | User |
| Trabalho | `work` | Roxo | Briefcase |
| Mentorias | `mentoring` | Laranja | GraduationCap |
| Contas | `financial` | Vermelho/Rosa | DollarSign |
| Externo | `external` | Cinza | Globe |

Comportamento:
- Sidebar da agenda mostra checkboxes por categoria (como o TickTick mostra listas)
- Eventos ganham cor de borda/fundo baseada na categoria
- Filtro por categoria funciona em todas as views (mes, semana, dia)
- Eventos importados herdam a categoria do mapeamento do projeto TickTick

### B.2 View Semanal com Blocos de Tempo Reais

Estado atual: a WeekView mostra chips de evento dentro do slot de hora, mas sem representacao de duracao real. Um evento de 09:00-12:00 aparece igual a um de 09:00-09:30.

Evolucao necessaria:
- Eventos com horario definido devem ocupar altura proporcional a duracao
- Evento de 09:00-12:00 ocupa 3 slots verticais
- Eventos all-day ficam no topo da coluna, acima da grade horaria
- Overlapping events devem ser posicionados lado a lado (column layout)
- Now indicator (bolinha vermelha) ja existe e funciona

### B.3 Comportamento de Clique

Estado atual:
- Clicar num dia no MonthView muda para DayView (`handleSelectDay` seta `view = 'day'`)
- Clicar num item abre o AgendaItemSheet (correto)

Evolucao:
- Clicar num **dia** no MonthView **nao** deve trocar para DayView automaticamente
- Clicar num **dia** deve abrir o modal de criacao com a data pre-preenchida
- Clicar num **item** continua abrindo o detalhe/sheet (correto, manter)
- Trocar de view (Mes/Semana/Dia) so por acao explicita do usuario no ToggleGroup

### B.4 Modal de Criacao/Edicao Expandido

Estado atual do `CreateEventDialog`: titulo, descricao, data, hora inicio/fim, dia inteiro, local.

#### Decisao de produto: ownership na criacao

**A V1 usa dois fluxos distintos desde o inicio, com escolha explicita de tipo antes da edicao dos campos.**

Regra:
- `+ Novo` abre um chooser inicial de tipo
- O usuario escolhe:
  - `Compromisso de agenda`
  - `Obrigacao financeira`
- A partir dessa escolha, o app abre o modal apropriado

Motivo:
- evita ambiguidade de ownership no momento do salvamento
- evita um modal unico inchado com campos conflitantes
- mantem a fronteira entre `calendar_events` e `payable_bills` visivel desde a primeira decisao do usuario

Fluxo de produto:
1. Usuario clica em `+ Novo`
2. App pergunta `O que voce quer criar?`
3. Se escolher `Compromisso de agenda` -> abre modal de agenda
4. Se escolher `Obrigacao financeira` -> abre modal financeiro

#### Wireframe textual — Chooser inicial

```text
+----------------------------------------------------------------------------------+
| O que voce quer criar?                                                     [X]   |
|----------------------------------------------------------------------------------|
| (•) Compromisso de agenda                                                        |
|     Reuniao, mentoria, tarefa, evento pessoal ou de trabalho                     |
|                                                                                  |
| ( ) Obrigacao financeira                                                         |
|     Conta, assinatura, parcela, vencimento, cobranca                             |
|                                                                                  |
|                                                  [Cancelar] [Continuar]          |
+----------------------------------------------------------------------------------+
```

O modal de agenda precisa ganhar:

#### Campos novos

1. **Categoria/Lista** — select com as categorias de agenda V1 (`personal`, `work`, `mentoring`). `financial` nao aparece aqui; existe apenas no fluxo/modal de Obrigacao financeira. `external` pode aparecer como estado importado (read-only), mas nao como opcao manual de criacao.
2. **Recorrencia** — selector com presets + custom
3. **Lembretes multiplos** — lista dinamica de offsets
4. **Status de sync** — badge informativo (quando vinculado ao TickTick)
5. **Prioridade** — selector (nenhuma, baixa, media, alta)

#### Wireframe textual — Modal de Compromisso (criacao/edicao)

```text
+--------------------------------------------------------------------------------------------------+
| [CalendarDays] Novo Compromisso                                                           [X]    |
|--------------------------------------------------------------------------------------------------|
| TIPO                                                                                             |
| [ Compromisso de agenda ]                                                                        |
|                                                                                                  |
| TITULO                                                                                           |
| [ Mentoria com Fabiola____________________________________________ ]                             |
|                                                                                                  |
| DESCRICAO                                                                                        |
| [________________________________________________________________]                               |
|                                                                                                  |
| CATEGORIA                               PRIORIDADE                                               |
| [ Mentorias v ]                         [ Nenhuma v ]                                            |
|                                                                                                  |
| DATA                                                                                             |
| [ 15/04/2026 ]                                                                                   |
|                                                                                                  |
|    [ ] Dia inteiro                                                                               |
|                                                                                                  |
| INICIO              FIM                                                                          |
| [ 09 ] : [ 00 ]    [ 11 ] : [ 00 ]                                                              |
|                                                                                                  |
| LOCAL                                                                                            |
| [ Google Meet________________________________________________ ]                                  |
|                                                                                                  |
| RECORRENCIA                                                                                      |
| [ Nenhuma v ]                                                                                    |
|   Opcoes: Nenhuma | Diaria | Semanal | Mensal | Personalizada...                                |
|                                                                                                  |
| LEMBRETES                                                                                        |
| [1] 1 dia antes, 09:00                                                [x remover]               |
| [2] 30 min antes do evento                                            [x remover]               |
| [ + Adicionar lembrete ]                                                                         |
| Obs.: na V1, apenas lembretes relativos espelham fielmente para TickTick                         |
|                                                                                                  |
| SYNC                                                                                             |
| [TickTick] Sincronizado em Mentorias                                  (somente leitura)          |
|                                                                                                  |
|                                                             [Cancelar] [Criar Compromisso]       |
+--------------------------------------------------------------------------------------------------+
```

#### Wireframe textual — Recorrencia expandida

```text
+---------------------------------------------------------------+
| RECORRENCIA                                                   |
|---------------------------------------------------------------|
| Repetir:      [ Mensal v ]                                    |
| A cada:       [ 1 ] mes(es)                                   |
|                                                               |
| (o) No dia 15 de cada mes                                     |
| ( ) Na segunda terca do mes                                   |
|                                                               |
| Termina:      [ Nunca v ]                                     |
|   Opcoes: Nunca | Em data... | Apos N ocorrencias             |
|                                                               |
| Resumo: "Mensal no dia 15, sem fim"                           |
+---------------------------------------------------------------+
```

#### Wireframe textual — Lembretes expandido

```text
+--------------------------------------------------------------------------------+
| LEMBRETES                                                                      |
|--------------------------------------------------------------------------------|
| Tipo de reminder:                                                             |
| (•) Relativo ao evento                                                        |
| ( ) Absoluto em horario fixo                                                  |
|                                                                                |
| 1. [ 1 dia antes v ]       as [ 09:00 ]                     [remover]         |
|    status: absoluto nativo do app (nao espelha fielmente para TickTick)       |
| 2. [ 30 min antes v ]      horario do evento                [remover]         |
|    status: relativo, espelhavel para TickTick                                 |
| 3. [ 1 hora antes v ]      horario do evento                [remover]         |
|    status: relativo, espelhavel para TickTick                                 |
|                                                                                |
| [ + Adicionar lembrete ]                                                       |
|                                                                                |
| Opcoes de offset relativo:                                                     |
|   No horario | 5 min | 15 min | 30 min | 1 hora | 2 horas | 1 dia | 2 dias   |
+--------------------------------------------------------------------------------+
```

### B.5 Modal de Item Financeiro

Para itens com `origin_type = 'payable_bill'`, o modal mantem formato diferenciado:

```text
+--------------------------------------------------------------------------------------------------+
| [DollarSign] Conta a Pagar                                                                [X]    |
|--------------------------------------------------------------------------------------------------|
| DESCRICAO                                                                                        |
| Conta de Luz Home                                                                                |
|                                                                                                  |
| VALOR                              VENCIMENTO                                                    |
| R$ 320,00                          09/04/2026                                                    |
|                                                                                                  |
| STATUS                                                                                           |
| [Pendente]                                                                                       |
|                                                                                                  |
| ORIGEM                                                                                           |
| [Financeiro] -> payable_bills                                                                    |
| [Lock] Somente leitura na agenda — editar em Contas a Pagar                                     |
|                                                                                                  |
| SYNC                                                                                             |
| [TickTick] Vinculado em Contas Pessoais                                                          |
|                                                                                                  |
|                                                             [Fechar] [Ver em Contas a Pagar]     |
+--------------------------------------------------------------------------------------------------+
```

### B.6 Tela Principal da Agenda

```text
+--------------------------------------------------------------------------------------------------------------------+
| [CalendarDays] Agenda                                                                               [+ Novo Evento]|
| abril de 2026                                                                                                      |
+--------------------------------------------------------------------------------------------------------------------+
| [Mes] [Semana] [Dia]                                                  [< ] abril 2026 [> ]  [Hoje]  [Filtros v]   |
+--------------------------------------------------------------------------------------------------------------------+
|                                                                                                                    |
|  MINI-CALENDARIO (lateral)     |  AREA PRINCIPAL (semana como default)                                             |
|                                |                                                                                   |
|  abril 2026                    |        DOM     SEG     TER     QUA     QUI     SEX     SAB                        |
|  D  S  T  Q  Q  S  S          |         5       6       7       8      [9]      10      11                        |
|           1  2  3  4           |  ----+-------+-------+-------+-------+-------+-------+-------                    |
|  5  6  7  8 [9] 10 11         |  all |       |       |       |       |       | Netflix| Fim de                    |
|  12 13 14 15 16 17 18         |  day |       |       |       |       |       | Aluguel| semana                    |
|  19 20 21 22 23 24 25         |  ----+-------+-------+-------+-------+-------+-------+-------                    |
|  26 27 28 29 30               |  09h | Almoco|       |Parcela|       |C.Luz  |Pl.Saude|                           |
|                                |      | Pascoa|       | BYD   |       | Home  |PG Creuza                          |
|  CATEGORIAS                    |      |       |       |       |       |09-10h |Condo   |                           |
|  [x] Pessoal                   |  10h |10-12h |       |       |       |       |Colegio |                           |
|  [x] Trabalho                  |      |       |       |       |       |       |2a Parc.|                           |
|  [x] Mentorias                 |  11h |       |       |       |       |       |        |                           |
|  [x] Contas                    |  12h |       |       |       |       |       |        |                           |
|  [ ] Externo                   |  ... |       |       |       |       |       |        |                           |
|                                |                                                                                   |
+--------------------------------------------------------------------------------------------------------------------+
| Legenda visual: [azul]=pessoal  [roxo]=trabalho  [laranja]=mentoria  [rosa]=contas  [cinza]=externo               |
+--------------------------------------------------------------------------------------------------------------------+
```

Regras de comportamento:
- **Clique em item** -> abre sheet/modal de detalhe/edicao
- **Clique em slot vazio** -> abre modal de criacao com data/hora pre-preenchidas
- **Clique em dia no mini-calendario** -> move o anchor, nao troca de view
- **Troca de view** -> so por acao explicita no ToggleGroup
- **Semana** e a view default de operacao
- **Dia** serve para agenda densa de horarios
- **Mes** serve para visao geral

### B.7 Cores e Badges por Tipo

| Tipo | Cor de borda/fundo | Badge | Comportamento |
|------|-------------------|-------|--------------|
| Pessoal (`personal`) | Azul | `Pessoal` | Editavel |
| Trabalho (`work`) | Roxo | `Trabalho` | Editavel |
| Mentorias (`mentoring`) | Laranja | `Mentoria` | Editavel |
| Contas/Financeiro (`financial`) | Rosa/Vermelho | `Conta` | Read-only (link para contas a pagar) |
| Externo (`external`) | Cinza | `Externo` + nome do provider | Editavel (se canonico importado) |
| Recorrente | Icone de repeat no badge | `Recorrente` | Acoes por ocorrencia |

Sync status badges (informativos, nao dominam a UI):
- `Sincronizado` — verde discreto
- `Pendente` — amarelo discreto
- `Removido do TickTick` — cinza com strike

---

## Part C: Reminders Universais

### C.1 Estado Atual
- `calendar_event_reminders` + `calendar_reminder_schedule` funcionam para eventos simples e recorrentes (Task 6)
- `calendar_populate_recurring_reminder_schedule` e override-aware (Task 6)
- `calendar-dispatch-reminders` pula ocorrencias canceladas e usa horario remarcado (Task 6)
- Reminders financeiros continuam em `bill_reminders` (pipeline separado, inalterado)

### C.2 O que Falta

1. **UI de lembretes no modal**: adicionar/remover lembretes com offset presets
2. **Inbound de reminders do TickTick**: parse TRIGGER -> `calendar_event_reminders` (secao A.3)
3. **Outbound de reminders para TickTick**: `calendar_event_reminders` -> TRIGGER no payload (secao A.3)
4. **Clara configura reminders por WhatsApp**: "me lembra 1h antes" -> chamar `set_calendar_event_reminders` (handler parcialmente pronto)
5. **Classificar reminder como relativo vs absoluto** no dominio/UI para deixar claro o que espelha ou nao para TickTick

### C.3 Equivalencia Funcional com TickTick

| Funcionalidade TickTick | App V1 | Notas |
|------------------------|--------|-------|
| Multiplos reminders por task | Sim | Via `calendar_event_reminders` (N rows por evento) |
| Reminder por TRIGGER offset | Sim | Converte de/para TRIGGER iCal |
| Reminder absoluto tipo "1 dia antes as 09:00" com round-trip fiel | Nao V1 | Funciona apenas como reminder nativo do app/Clara |
| Reminder em serie recorrente | Sim | Via `calendar_populate_recurring_reminder_schedule` |
| Reminder respeitando override | Sim | `coalesce(override_start_at, original_start_at)` |
| Reminder pula ocorrencia cancelada | Sim | `is_cancelled` check no populate + dispatch |
| Entrega via push notification | Nao V1 | App V1 entrega via WhatsApp (Clara) |
| Entrega via som/vibra no app | Nao V1 | Deferido |

### C.4 Trilha de Reminders por Tipo de Item

| Item | Mecanismo | Clara avisa? |
|------|-----------|-------------|
| `calendar_events` (interno) | `calendar_event_reminders` + schedule | Sim |
| `calendar_events` (importado, `source=external`) | Mesmo mecanismo | Sim |
| `payable_bills` (interno) | `bill_reminders` | Sim, via pipeline financeiro |
| `payable_bills` (importado, `source=external_import`) | `bill_reminders` | Sim, via pipeline financeiro |
| Projecao derivada | Reminder pertence ao dominio de origem | Clara ja avisa via `send-bill-reminders` |

---

## Part D: Clara com Poder Operacional

### D.1 Estado Atual
- Clara cria eventos com recorrencia (Task 5)
- Clara remarca eventos/ocorrencias (Task 5)
- Clara configura reminders (parcial)
- Clara nao sabe qual categoria/lista usar
- Clara nao envia informacao de sync

### D.2 Evolucao V1

| Capacidade | Como |
|-----------|------|
| Criar com categoria | Inferir de palavras-chave: "mentoria" -> `mentoring`, "reuniao de trabalho" -> `work` |
| Criar com reminder | "me lembra 1h antes" -> `set_calendar_event_reminders` apos criacao |
| Listar com contexto | "minha agenda" mostra origem e categoria |
| Remarcar com reflexo | Ja funciona; outbound job e automatico |
| Cancelar com reflexo | Ja funciona; outbound job e automatico |
| Reflexo automatico no TickTick | RPCs ja enfileiram `calendar_sync_jobs`; nenhuma logica extra |

### D.3 Ownership na Entrada (inalterado)

| Frase | Dominio | Destino |
|-------|---------|---------|
| "tenho dentista amanha as 14h" | agenda | `calendar_events` |
| "mentoria toda quarta" | agenda | `calendar_events` + recorrencia |
| "me lembra de pagar a luz dia 10" | financeiro | `payable_bills` |
| "netflix 55 reais dia 17" | financeiro | `payable_bills` |

---

## Decisions Summary

### Ownership
- `payable_bills` para obrigacoes financeiras (inalterado)
- `calendar_events` para compromissos pessoais/trabalho/mentorias (inalterado)
- Financeiros do TickTick (lista "Contas Pessoais") vao para `payable_bills` (ja implementado)
- Clara usa `FINANCIAL_COUNTER_PATTERNS` + `isCalendarIntent` como gate (inalterado)
- Criacao na UI com escolha explicita de tipo antes do modal: `Compromisso de agenda` ou `Obrigacao financeira`

### Bidirecionalidade
- Inbound: parse completo de reminders relativos, recorrencia e prioridade
- Outbound: payload completo com reminders relativos, repeatFlag e prioridade
- Deteccao de mudanca: hash-based (sem `modifiedDate` na API)
- Delete externo: link desativado, canonico intacto (ja implementado)
- Conflito: app-wins (ja implementado)
- Conclusao feita no TickTick nao tem espelhamento inbound fiel na V1

### UI
- Semana como view default
- Modal expandido com categoria, recorrencia, lembretes, prioridade
- Clique em item abre detalhe; clique em dia abre criacao
- Blocos de tempo proporcionais na WeekView
- Categorias com cores e checkboxes de filtro
- Fluxo de criacao com chooser inicial de ownership/modal

### V1 vs V2
Ver secao abaixo.

---

## V1 Scope (o que entra agora)

### Backend/Sync
- [ ] Parse e persist `repeatFlag` (RRULE) no inbound
- [ ] Parse e persist `reminders` (TRIGGER) no inbound
- [ ] Parse e persist `priority` no inbound
- [ ] Incluir `repeatFlag`, `reminders`, `priority` no outbound payload
- [ ] Hash-based change detection (substituir timestamp-based)
- [ ] Validacao live end-to-end do ciclo TickTick <-> app
- [ ] Declarar no contrato/backend o tipo de reminder: relativo (espelhavel) vs absoluto (nativo do app)
- [ ] Nao prometer espelhamento inbound fiel de `completed` feito no TickTick

### UI/Frontend
- [ ] Chooser inicial de tipo: `Compromisso de agenda` vs `Obrigacao financeira`
- [ ] Modal expandido: categoria, recorrencia, lembretes, prioridade
- [ ] WeekView com blocos de tempo proporcionais a duracao
- [ ] Categorias com cores e filtro por checkbox
- [ ] Clique em dia abre criacao (nao troca para DayView)
- [ ] Mini-calendario lateral na pagina da agenda
- [ ] Badges de sync discretos
- [ ] AgendaItemSheet expandido com reminders, recorrencia, sync status
- [ ] Sinalizar visualmente se um lembrete e relativo (espelhavel) ou absoluto (somente app)

### Clara
- [ ] Inferencia de categoria na criacao
- [ ] "me lembra X antes" funcional
- [ ] "me lembra 1 dia antes as 09:00" tratado como reminder absoluto nativo do app, nao como espelho fiel TickTick

---

## V2 Scope (fica para depois)

- Google Calendar (OAuth + inbound + outbound)
- UI de mapeamento de projetos/listas na pagina de integracoes
- Merge cross-provider
- Occurrence-level sync externo
- RRULE complexas (BYSETPOS, YEARLY)
- Espelhamento fiel de reminders absolutos tipo "1 dia antes as 09:00" para conectores externos
- Espelhamento inbound fiel de conclusao feita diretamente no TickTick (se a API passar a suportar ou houver estrategia segura)
- Subtasks como entidade propria
- Push notifications no app
- Clara com NLP escalado para intents complexos
- Drag-and-drop de eventos na agenda
- Tags/etiquetas alem de categorias fixas
- Conflict surfacing na UI

---

## Risks and Trade-offs

### R1: TickTick API nao tem `modifiedDate`
- **Impacto:** deteccao de mudanca por hash e mais custosa (precisa comparar todos os campos)
- **Mitigacao:** guardar `external_payload_hash` no link; comparar hash do snapshot atual com hash armazenado
- **Trade-off aceito:** mais processamento por ciclo, mas correto

### R2: API retorna apenas tasks nao concluidas
- **Impacto:** a V1 nao garante espelhamento inbound fiel de conclusao feita no TickTick; completar la nao equivale a ver `status=completed` aqui
- **Decisao de corte V1:** isso fica fora da promessa funcional da V1, nao apenas como risco lateral
- **Mitigacao V1:** outbound de `status=completed` do app para TickTick funciona; no inbound, ausencia continua sendo tratada com muito cuidado e nunca deleta o canonico local
- **Comunicacao honesta:** a V1 e bidirecional real para criar/editar/deletar-vinculo, mas nao para refletir conclusao feita diretamente no TickTick com fidelidade total

### R3: reminder absoluto vs reminder relativo
- **Impacto:** "1 dia antes as 09:00" nao e semanticamente equivalente a `TRIGGER:P1DT0H0M0S` para eventos em horarios diferentes
- **Decisao de corte V1:** round-trip fiel de reminders absolutos com TickTick fica fora da V1
- **Mitigacao V1:** reminders absolutos continuam funcionando como lembrete nativo do app / Clara; reminders relativos espelham normalmente para TickTick
- **Comunicacao honesta:** a V1 entrega paridade forte para reminders relativos, nao paridade total para reminders absolutos

### R4: RRULE complexas nao suportadas
- **Impacto:** eventos com recorrencia complexa no TickTick (ex: "terceira quarta de cada mes") importam como evento simples
- **Mitigacao:** logar no metadata do link para auditoria; usuario vê que nao tem recorrencia e pode configurar manualmente
- **Probabilidade:** baixa (maioria dos usuarios usa recorrencia simples)

### R5: Ambiguidade de linguagem mensal vs ownership (aberto, do radar)
- **Contexto:** "todo mes" pode ser financeiro ou agenda
- **Status:** aceito como risco operacional; `FINANCIAL_COUNTER_PATTERNS` e a gate primaria
- **V2:** escalar para NLP quando ambiguo

### R6: `remote_deleted` por ausencia parcial no inbound sync (aberto, do radar)
- **Contexto:** se um projeto TickTick falha no fetch mas outros nao, tasks daquele projeto podem ser falsamente marcadas como `remote_deleted`
- **Mitigacao existente:** flag `anyProjectDataFetchSucceeded`; se nenhum fetch funcionar, pula o passo de `remote_deleted`
- **Risco residual:** fetch parcial (alguns projetos ok, outros nao) pode gerar falsos

### R7: `db push --linked` global bloqueado (aberto, do radar)
- **Impacto:** novas migrations precisam de workaround cirurgico
- **Status:** operacional, nao funcional; nao bloqueia esta spec

---

## Testing Strategy

### Unit tests
- Parse de TRIGGER -> offset_minutes e reverso
- Classificacao de reminder relativo vs absoluto
- Parse de RRULE -> `calendar_event_recurrence_rules` fields e reverso
- Hash de task fields para change detection
- Mapeamento de priority (0/1/3/5 <-> null/low/medium/high)

### Integration tests (DB)
- Inbound com recorrencia: task com `repeatFlag` cria `calendar_event_recurrence_rules`
- Inbound com reminders: task com `reminders` cria `calendar_event_reminders` + popula schedule
- Outbound com recorrencia: evento recorrente gera task com `repeatFlag` correto
- Outbound com reminders relativos: evento com reminders relativos gera task com `reminders` array correto
- Reminder absoluto no app: permanece funcional no schedule/Clara, mas nao vira TRIGGER enganoso no TickTick
- Round-trip: criar no app -> outbound -> simular inbound do mesmo item -> nao duplicar

### Smoke (remoto)
- Criar tarefa no TickTick com recorrencia e reminders -> verificar que aparece na agenda com recorrencia e reminders corretos
- Criar evento no app com recorrencia e lembretes relativos -> verificar que aparece no TickTick com repeatFlag e reminders
- Criar evento no app com lembrete absoluto ("1 dia antes as 09:00") -> verificar que o lembrete funciona no app/Clara e que a UI sinaliza que nao ha espelhamento fiel para TickTick
- Editar titulo no TickTick -> verificar update na agenda
- Completar tarefa no TickTick -> verificar explicitamente que a V1 nao reflete `completed` com fidelidade total e que o canonico local nao e apagado

### Frontend tests
- Chooser inicial de tipo abre o modal correto para agenda vs financeiro
- Modal: campos de categoria, recorrencia e lembretes renderizam e persistem
- WeekView: evento de 2h ocupa altura proporcional
- Clique em dia no MonthView abre modal de criacao (nao troca para DayView)
- Filtro por categoria funciona
