# Agenda Mobile — Design Doc

**Status:** Approved — ready for implementation plan
**Created:** 2026-04-21
**Author:** Luciano + Claude (brainstorming session)
**Parent spec:** [2026-04-19-mobile-first-responsive-redesign.md](./2026-04-19-mobile-first-responsive-redesign.md) — §6.3 Agenda

---

## 1. Problema

A Agenda (`/agenda`) é a página mais densa visualmente do Finance LA. Hoje ela foi desenhada desktop-first:

- `MonthView` usa `grid-cols-7` com chips de evento horizontais. Em 375px cada célula tem ~50px de largura — os chips ficam cortados (“Parcela B…”, “TESTE_AL…”, “Cartão Pã…”).
- `WeekView` tem 7 colunas × 18 horas de timeline — inviável em uma tela estreita.
- `DayView` é o único minimamente usável, mas o header, o toggle e os filtros ocupam 3 linhas antes do conteúdo.
- `AgendaItemSheet` e `CreateEventDialog` são Radix Dialogs (modais centrados) — mesmo padrão que derrubou o app em Cartões. Precisam virar `ResponsiveDialog` (full-screen no mobile).

**Objetivo:** redesenhar o mobile mantendo os 3 modos (Mês / Semana / Dia) com view mode persistido, sem alterar a lógica de negócio, os tipos, os hooks ou o desktop.

### Fora de escopo

- Mudança nos tipos `AgendaItem`, `CalendarEvent`, etc. (`src/types/calendar.types.ts`)
- Mudança no hook `useCalendarAgenda` ou na RPC `get_agenda_window`
- Mudança no `CreateEventDialog` além de envelopar em `ResponsiveDialog`
- Mudança no desktop (≥ 1024px) — pixel-idêntico ao atual
- Drag-to-reschedule (não existe hoje, não é objetivo)
- Mudança em `TickTick sync` ou providers externos
- Novos tipos de evento, cores ou categorias
- PWA / offline

---

## 2. Decisões fundantes (aprovadas em brainstorming visual)

| # | Decisão | Escolhido | Justificativa |
|---|---|---|---|
| Q1 | Estrutura macro no mobile | **Opção C — Strip/Grid superior + lista embaixo** | Padrão Google/Samsung Calendar. Permite manter 3 modos com navegação por polegar. |
| Q2 | Modos mantidos | **Mês, Semana, Dia** (os 3) | User quer escolher e a escolha persiste. |
| Q3 | Persistência do modo | **localStorage** (`agenda-view-mode`) | Escolha sobrevive a reload. Default `month` no primeiro acesso. |
| Q4 | Mês mobile: chips ou pontinhos? | **Pontinhos coloridos** (1 por categoria, máx 3) | Chips cortados são inúteis em 375px. Pontinhos comunicam "há evento" sem mentir. |
| Q5 | Modo Semana no mobile | **Strip de 7 dias deslizável + lista do dia tocado** | A timeline horária × 7 colunas é impossível em 375px. Strip + lista é o padrão nativo. |
| Q6 | Modo Dia no mobile | **Timeline horária vertical** (a existente, adaptada) | Já funciona; só precisa de header compacto e linha de "agora". |
| Q7 | AgendaItemSheet | **Migrar para `ResponsiveDialog`** | Mesma lição do Cartões — Radix Dialog puro travou o app mobile. |
| Q8 | CreateEventDialog | **Migrar para `ResponsiveDialog`** | Mesma razão. |
| Q9 | CalendarFilters no mobile | **Ícone no header → bottom sheet** | 4 linhas de filtros ocupavam metade da viewport. |
| Q10 | Indicador de "hoje" | **Bolinha azul preenchida** no strip e no grid | Contraste claro contra dia selecionado (azul translúcido). |
| Q11 | Botão "Novo Evento" no mobile | **Ícone "+" no header** (label escondido no mobile) | O FAB global "+" não cobre eventos (só despesa/receita/cartão/transferência/conta a pagar). Mantemos o botão existente de `CalendarPage`, só trocamos "Novo Evento" por um ícone "+" em viewports < sm. Fluxo idêntico: `handleHeaderNew` → `OwnershipPageChooserDialog` → `CreateEventDialog`. |
| Q12 | Swipe para navegar meses/semanas | **Opcional (não-MVP)** | MVP só exige botões prev/next (‹ ›) e tap em "Hoje". Swipe gesture é melhoria futura. |

---

## 3. Arquitetura

### 3.1 Árvore de arquivos

#### Novos

```
src/components/calendar/
  MonthGridMobile.tsx              # Grade 7×6 com pontinhos (não chips)
  MonthGridMobile.test.tsx
  WeekStrip.tsx                    # Strip horizontal 7 dias, swipeable
  WeekStrip.test.tsx
  DayViewMobile.tsx                # Timeline compacta para mobile
  DayViewMobile.test.tsx
  AgendaDayList.tsx                # Lista de AgendaItem agrupada por dia
  AgendaDayList.test.tsx
  CalendarFiltersSheet.tsx         # Bottom sheet wrapper para CalendarFilters
  CalendarFiltersSheet.test.tsx

src/hooks/
  useAgendaViewMode.ts             # Persistência do modo em localStorage
  __tests__/useAgendaViewMode.test.ts
```

#### Modificados

```
src/pages/
  CalendarPage.tsx                 # Dual render: desktop (MonthView/WeekView/DayView) + mobile (novos)
  CalendarPage.layout.test.tsx     # Cobre ambos os paths

src/components/calendar/
  AgendaItemSheet.tsx              # ResponsiveDialog em vez de Radix Dialog puro
  AgendaItemSheet.test.tsx         # Ajusta assertions para ResponsiveDialog
  CreateEventDialog.tsx            # ResponsiveDialog
  CreateEventDialog.test.tsx       # Ajusta assertions
  OwnershipChooser.tsx (OwnershipPageChooserDialog) # ResponsiveDialog
```

#### Preservados (zero mudança)

```
src/components/calendar/
  MonthView.tsx                    # Desktop only (lg:block)
  WeekView.tsx                     # Desktop only
  DayView.tsx                      # Desktop only
  CalendarFilters.tsx              # Reusado dentro de CalendarFiltersSheet no mobile e na página no desktop
  calendar-utils.ts
  AgendaHoverTooltip.tsx

src/hooks/
  useCalendarAgenda.ts             # RPC, query key, staleTime — nada muda
  useDividendCalendar.ts

src/types/calendar.types.ts        # Tipos intactos
```

### 3.2 Regras de visibilidade

| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| `MonthGridMobile` | visível quando `view === 'month'` | `hidden` |
| `MonthView` (existente) | `hidden` | visível quando `view === 'month'` |
| `WeekStrip` | visível quando `view === 'week'` | `hidden` |
| `WeekView` (existente) | `hidden` | visível quando `view === 'week'` |
| `DayViewMobile` | visível quando `view === 'day'` | `hidden` |
| `DayView` (existente) | `hidden` | visível quando `view === 'day'` |
| `AgendaDayList` | visível nos modos `month` e `week` mobile | `hidden` |
| `CalendarFilters` (inline) | `hidden` | visível |
| `CalendarFiltersSheet` | acionado pelo ícone no header | `hidden` |
| Botão "Novo Evento" no header | vira ícone "+" (label oculto) | label completo "Novo Evento" |
| FAB "+" global | inalterado — não cria evento | sem FAB |

### 3.3 Estado da página

Todos os estados existentes de `CalendarPage` são preservados. Acrescentos:

```ts
// Persistido em localStorage
const [view, setView] = useAgendaViewMode('month');

// Novo — dia em foco dentro da semana/mês
const [focusedDay, setFocusedDay] = useState<Date>(() => new Date());

// Novo — bottom sheet de filtros aberto
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
```

`focusedDay`:
- No modo **Mês**: dia clicado na grade; controla qual lista aparece abaixo. Default = hoje.
- No modo **Semana**: dia selecionado no strip. Default = hoje.
- No modo **Dia**: igual ao `anchor`.

A navegação prev/next no header continua mexendo em `anchor` (pula mês/semana/dia inteiros). Clicar num dia da grade/strip muda `focusedDay` sem mexer em `anchor` — a menos que o dia esteja fora da janela atual, aí `anchor` também atualiza.

### 3.4 Hook `useAgendaViewMode`

```ts
export type CalendarViewMode = 'month' | 'week' | 'day';

const STORAGE_KEY = 'agenda-view-mode';

export function useAgendaViewMode(defaultMode: CalendarViewMode = 'month') {
  const [mode, setMode] = useState<CalendarViewMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'month' || stored === 'week' || stored === 'day') return stored;
    return defaultMode;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return [mode, setMode] as const;
}
```

Testes cobrem: default na ausência de valor; leitura de valor válido; fallback em valor inválido; SSR guard.

---

## 4. Wireframes aprovados

Os wireframes abaixo foram aprovados pelo usuário via Visual Companion (sessão 12988-1776787531).

### 4.1 Modo Mês (default)

```
+-----------------------------+
| ≡  Agenda       [Hoje] ⊙    |  header 56px (⊙ = filtros)
|       ‹ Abril · 2026 ›      |  nav row
|  Mês | Semana | Dia         |  tab row (aba ativa underline)
+=============================+
|  D  S  T  Q  Q  S  S        |  7 colunas
| ··  ··  1  2  3∘  4  5•∘    |  pontinhos indicam categoria:
|  6  7• 8• 9  10•∘ 11 12     |  • azul = evento calendário
| 13 14• 15•∘ 16 17 18 19     |  ∘ laranja = conta/fatura
| 20 [21]• 22• 23• 24 25∘ 26  |  ◦ verde = externo (TickTick etc)
| 27 28 29 30•  1•  2  3      |  até 3 pontinhos por dia
+=============================+
| Hoje, Ter 21 abr · 2        |  seção do dia em foco
| ● Tiradentes                |  evento 1
|   Todo o dia · Feriado      |
| ○ Cartão Nubank             |  evento 2
|   R$ 1.243,00 · Conta       |
+=============================+
|  🏠 📋 🤖 🧾 ☰              |  bottom nav
+-----------------------------+
```

**Interações:**
- Tap num dia → muda `focusedDay`, lista abaixo atualiza (sem mudar mês).
- Tap num dia de outro mês (linha superior/inferior) → muda `anchor` para aquele mês e `focusedDay` para o dia clicado.
- Tap num evento → abre `AgendaItemSheet` (full-screen no mobile).
- Navegação entre meses: botões `‹ ›` no header. Swipe é melhoria futura (Q12).

### 4.2 Modo Semana

```
+-----------------------------+
| ≡  Agenda       [Hoje] ⊙    |
|       ‹ 19 – 25 abr ›       |
|  Mês | Semana | Dia         |
+=============================+
|  D  S  T  Q  Q  S  S        |  labels dia da semana
| 19 20 [21] 22 23 24 [25]    |  strip swipeable
|  ·  ·  ●  •  •  ·  ∘        |  pontinho abaixo do número
+=============================+
| Sex, 25 abr · 3 contas      |
| ○ Gás Natural               |
|   R$ 89,00 · Conta · 🔒     |  🔒 = somente leitura
| ○ Internet Claro            |
|   R$ 149,90 · Conta · 🔒    |
| ● Cartão C6                 |
|   Fatura · R$ 287,00        |
+=============================+
| ← Deslize a faixa p/ navegar|  dica visível no primeiro acesso
+=============================+
|  🏠 📋 🤖 🧾 ☰              |
+-----------------------------+
```

**Interações:**
- Tap num dia do strip → muda `focusedDay`, lista abaixo atualiza.
- Navegação entre semanas: botões `‹ ›` no header. O strip sempre reflete a semana de `anchor`.
- Tap em "Hoje" no header → `anchor` e `focusedDay` = hoje.

### 4.3 Modo Dia

```
+-----------------------------+
| ≡  Agenda       [Hoje] ⊙    |
|     ‹ Ter, 21 de abril ›    |
|  Mês | Semana | Dia         |
+=============================+
| ● Tiradentes · Todo o dia   |  all-day events (se houver)
+=============================+
|  8 |                        |
|  9 |                        |
| 10 | ┌ Reunião c/ cliente ┐ |  evento posicionado
| 11 | │  10:00 – 11:00       │|
|    | └──────────────────────┘|
| 12 |                        |
|─13─|────● agora              |  linha vermelha = agora
| 14 |                        |
| 15 | ┌ Análise financeira ┐ |
|    | │  15:00 – 16:30      │|
| 16 | └──────────────────────┘|
+=============================+
|  🏠 📋 🤖 🧾 ☰              |
+-----------------------------+
```

**Interações:**
- Scroll vertical → navega pelas horas (auto-scroll para hora atual ao abrir).
- Tap numa hora vazia → fluxo completo `OwnershipPageChooserDialog` → `CreateEventDialog` com prefill do slot horário (igual desktop).
- Tap num evento → `AgendaItemSheet`.
- Navegação entre dias: botões `‹ ›` no header.

### 4.4 Detalhe do evento (AgendaItemSheet)

```
+-----------------------------+
| ≡  Agenda       [Hoje]      |  header permanece atrás do sheet
|     ‹ Semana 19–25 abr ›    |
|  Mês | Semana | Dia         |
+=============================+
|  (conteúdo escurecido)      |  overlay bg-black/55
+-----------------------------+
|         ───                 |  drag handle
|  🔒 Somente leitura         |
|  2ª Parcela — Dívida Ativa  |  título
|  Paga                       |  subtítulo
|  ─────────────────          |
|  🕐 Sex, 10 Abr · 00:00–23:59|
|  💰 R$ 0,00                 |
|  🏷 Projeção de conta/fatura |
|    — edite em Contas a Pagar|
|  ─────────────────          |
|  [ ↗ Ir para Contas a Pagar]|  CTA primário
+-----------------------------+
```

No mobile o sheet ocupa `max-h-[80dvh]` e cola no bottom. No desktop renderiza como Radix Dialog centralizado (inalterado). Este é exatamente o padrão do `ResponsiveDialog` que já implementamos em Cartões.

### 4.5 Filtros (bottom sheet)

```
+-----------------------------+
| ≡  Agenda       [Hoje] ⊙ ← ativo
|     ‹ Abril · 2026 ›        |
|  Mês | Semana | Dia         |
+=============================+
|  (grade escurecida)         |
|  ─────────────────          |
|  Filtros         Redefinir  |
|                             |
|  CATEGORIA                  |
|  [Eventos ✓] [Contas ✓]     |
|  [Lembretes ✓] [Externo ✓]  |
|                             |
|  INTERATIVIDADE             |
|  [Todos] [Editáveis] [RO]   |
|                             |
|  ☐ Só acionáveis            |
+-----------------------------+
```

Reusa o `CalendarFilters` existente por dentro — apenas empacota num `ResponsiveDialog` para virar sheet no mobile.

---

## 5. Componentes novos — contratos

### 5.1 `MonthGridMobile`

```tsx
interface MonthGridMobileProps {
  anchor: Date;                                 // mês exibido
  items: AgendaItem[];                          // itens pré-filtrados
  focusedDay: Date;
  onDayFocus: (day: Date) => void;              // clicar num dia
  onMonthChange: (newAnchor: Date) => void;     // disparado ao clicar num dia fora do mês atual
  isLoading?: boolean;
}
```

- Renderiza 7×6 grid (semanas que cobrem o mês).
- Cada célula: número do dia + até 3 pontinhos coloridos.
- Cor do pontinho deriva da categoria via `getAgendaItemFilterCategory` (já existe).
- Dia de hoje: número sobre círculo azul sólido.
- `focusedDay`: número sobre círculo azul translúcido + borda.
- Dias de outro mês: número em cinza escuro.

### 5.2 `WeekStrip`

```tsx
interface WeekStripProps {
  anchor: Date;                                 // qualquer dia da semana exibida
  items: AgendaItem[];
  focusedDay: Date;
  onDayFocus: (day: Date) => void;
}
```

- 7 células uniformes correspondendo à semana de `anchor`. Sem scroll interno: a navegação entre semanas é pelos botões prev/next do header (MVP).
- Cada célula: label (D/S/T…) + número + pontinho se houver evento.
- Hoje: círculo azul sólido no número.
- `focusedDay`: círculo azul translúcido.

### 5.3 `DayViewMobile`

```tsx
interface DayViewMobileProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading?: boolean;
  onItemClick: (item: AgendaItem) => void;
  onEmptySlotClick?: (date: Date, hour: number) => void;
}
```

- Timeline vertical 06:00–23:00 (igual desktop).
- Eventos all-day numa faixa fixa no topo antes da timeline.
- Linha vermelha na hora atual (auto-scroll para lá ao montar).
- Cada evento posicionado via `grid-row` conforme `display_start_at`/`display_end_at`.

### 5.4 `AgendaDayList`

```tsx
interface AgendaDayListProps {
  items: AgendaItem[];                          // itens do intervalo
  focusedDay: Date;                             // lista filtra/destaca este
  groupMode: 'single-day' | 'week-grouped';     // mês → single-day; semana → week-grouped
  onItemClick: (item: AgendaItem) => void;
}
```

- `single-day`: mostra só eventos do `focusedDay`.
- `week-grouped`: mostra eventos da semana agrupados por dia (header de cada dia). Usado no modo Semana se user preferir ver a semana toda sem selecionar um dia — **default é só o dia focado**, mas a estrutura de agrupamento existe caso um futuro "Ver a semana toda" seja pedido. MVP só implementa `single-day`.
- Cada item: dot de categoria + título + subtítulo + badge de categoria + ícone 🔒 se `is_read_only`.
- Tap → `onItemClick`.
- Estado vazio: "Nenhum compromisso neste dia."

### 5.5 `CalendarFiltersSheet`

```tsx
interface CalendarFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // demais props idênticas ao CalendarFilters existente
  enabledCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  advancedFilters: AdvancedAgendaFilters;
  onAdvancedFiltersChange: (filters: AdvancedAgendaFilters) => void;
}
```

- Usa `ResponsiveDialog` com `max-h-[80dvh]`.
- Renderiza `CalendarFilters` inline — zero duplicação.

---

## 6. Mudanças nos componentes existentes

### 6.1 `AgendaItemSheet.tsx`

Hoje usa `Dialog/DialogContent` direto. Troca por `ResponsiveDialog/ResponsiveDialogHeader/ResponsiveDialogBody` seguindo o padrão que implementamos em `InvoiceDetailsDialog`. Nenhuma mudança na lógica interna.

### 6.2 `CreateEventDialog.tsx`

Mesma mudança: envolver em `ResponsiveDialog`. O formulário interno não muda.

### 6.3 `OwnershipPageChooserDialog` (em `OwnershipChooser.tsx`)

Mesma mudança. Dois botões ("Financeiro" / "Pessoal") — no mobile viram full-screen com os dois cards empilhados.

### 6.4 `CalendarPage.tsx`

Dual render condicional:

```tsx
{/* Toggle + nav + filters: compartilhados, mas a nav é compacta no mobile */}
<ViewToggle view={view} onChange={setView} />

{/* Desktop views (lg:block) */}
<div className="hidden lg:block">
  {view === 'month' && <MonthView {...} />}
  {view === 'week'  && <WeekView  {...} />}
  {view === 'day'   && <DayView   {...} />}
</div>

{/* Mobile views (lg:hidden) */}
<div className="lg:hidden">
  {view === 'month' && (
    <>
      <MonthGridMobile {...} />
      <AgendaDayList items={items} focusedDay={focusedDay} groupMode="single-day" ... />
    </>
  )}
  {view === 'week' && (
    <>
      <WeekStrip {...} />
      <AgendaDayList items={items} focusedDay={focusedDay} groupMode="single-day" ... />
    </>
  )}
  {view === 'day' && <DayViewMobile {...} />}
</div>
```

A razão de renderizar ambos com `hidden lg:block` / `lg:hidden` em vez de usar um hook `useIsLg` é: o Month/WeekView existente ganha a proteção CSS padrão, sem portais ou focus-trap. Não há risco do problema de Radix Dialog aqui (são renders inline de conteúdo estático).

O `AgendaItemSheet`, `CreateEventDialog` e `OwnershipPageChooserDialog` **precisam** do `ResponsiveDialog` porque são Radix Dialog com portals.

---

## 7. Z-index ladder

- `z-0` conteúdo da página
- `z-30` FAB "+" (já existe)
- `z-40` bottom nav, overlay do filter sheet
- `z-50` `ResponsiveDialog` (AgendaItemSheet, CreateEventDialog, CalendarFiltersSheet)
- `z-[60]` AgendaItemSheet com "Ir para Contas a Pagar" se for projection — cuidado para não sobrepor navegação global

Alinhado ao ladder já definido no spec mestre.

---

## 8. Acessibilidade

- `role="tablist"` no toggle de view + `aria-selected` na aba ativa.
- `role="grid"` + `role="gridcell"` no MonthGridMobile; `aria-label` no dia ("21 de abril, 2 eventos").
- WeekStrip: `role="tablist"`, cada dia `role="tab"`, `aria-current="date"` no focusedDay.
- AgendaDayList: `role="list"`, cada item `role="listitem"`, `aria-describedby` ligando ao subtítulo.
- Filter icon no header: `aria-label="Filtros"`, `aria-expanded={filterSheetOpen}`.
- Tap targets ≥ 44×44px: dia do strip (22px número + padding vertical/horizontal chega em ~44). Dia da grade: célula toda é tap target (~55px em 375px).
- Contraste dos pontinhos: AA ≥ 3:1 (graphical) — azul #4f7cff vs preto #0f0f0f passa; verde #22c55e passa; laranja #f97316 passa.

---

## 9. Testes

### 9.1 Unidade — componentes novos

- `MonthGridMobile.test.tsx`:
  - Renderiza 42 células (6 semanas × 7).
  - Dia de hoje tem classe `bg-primary text-primary-foreground`.
  - `focusedDay` tem borda/background translúcido.
  - Pontinhos: até 3 cores distintas por dia.
  - Tap num dia dispara `onDayFocus` com aquele Date.
  - Tap num dia de outro mês dispara `onMonthChange`.
  - Itens vindos de `getAgendaItemFilterCategory` mapeiam para as cores esperadas.

- `WeekStrip.test.tsx`:
  - 7 células com labels D/S/T/Q/Q/S/S.
  - Célula de hoje destacada.
  - Célula do focusedDay destacada diferente.
  - Tap dispara `onDayFocus`.
  - `aria-current="date"` correto no focusedDay.

- `DayViewMobile.test.tsx`:
  - Linha "agora" presente com `data-testid="current-time-line"`.
  - Eventos all-day na faixa superior.
  - Eventos com horário posicionados por `grid-row`.
  - Tap em slot vazio dispara `onEmptySlotClick`.
  - Tap em evento dispara `onItemClick`.

- `AgendaDayList.test.tsx`:
  - Em `single-day` mostra só itens cujo `display_start_at` cai no focusedDay (respeitando all-day).
  - Empty state renderiza quando vazio.
  - Ícone 🔒 presente quando `is_read_only`.
  - Badge de categoria correto.
  - Tap dispara `onItemClick`.

- `CalendarFiltersSheet.test.tsx`:
  - Wraps `CalendarFilters` dentro de `ResponsiveDialog`.
  - `onOpenChange(false)` ao tocar no X.

- `useAgendaViewMode.test.ts`:
  - Default mode = "month".
  - Persiste no localStorage.
  - Lê valor persistido.
  - Ignora valor inválido no storage.
  - SSR-safe (typeof window === 'undefined' guard).

### 9.2 Integração — `CalendarPage.layout.test.tsx`

- Renderiza `MonthView` (desktop) e `MonthGridMobile` (mobile) simultaneamente no jsdom — um oculto por CSS.
- Trocar de aba muda `view` e persiste em localStorage.
- Tap num dia do mês mobile atualiza `focusedDay` sem mudar `anchor`.
- Filter icon abre o sheet.
- Click num evento abre `AgendaItemSheet` (mockado por `vi.mock`).

### 9.3 Regressão desktop

- Testes existentes (`MonthView.test`, `WeekView.test`, `DayView.test`, `AgendaItemSheet.test`, `CreateEventDialog.test`) passam intactos após a migração para `ResponsiveDialog` (com mocks de `ResponsiveDialog` nos testes existentes, igual fizemos em Cartões).

---

## 10. Critérios de aceite

- **Mobile (< lg):**
  - Os 3 modos funcionam: Mês (grade + lista do dia), Semana (strip + lista do dia), Dia (timeline).
  - Modo escolhido persiste após reload.
  - Zero scroll horizontal em 320/375/412px.
  - Pontinhos no mês refletem categorias e param em 3 (com fallback visual para "+").
  - `AgendaItemSheet`, `CreateEventDialog`, `OwnershipPageChooserDialog` abrem/fecham sem travar; ESC, botão X e backdrop funcionam.
  - Filtro sheet abre pelo ícone do header, mudanças refletem na lista.
  - Tap targets ≥ 44×44px em todos os elementos clicáveis.

- **Desktop (≥ lg):**
  - Pixel-idêntico à versão atual. Mesmos componentes, mesma ordem, mesmas interações.
  - Nenhum teste desktop existente quebra.

- **Acessibilidade:**
  - Contraste AA.
  - `aria-current`, `aria-selected`, `aria-label` corretos.
  - Navegação por teclado preservada (Tab/Enter/Escape).

- **Performance:**
  - Query `useCalendarAgenda` não muda; mesma staleTime, mesmos params.
  - Swipe no strip / grade é responsivo (framer-motion).

---

## 11. Rollback

Commits atômicos por componente. Se algo der errado:

- `git revert <sha>` do componente problemático — o resto continua funcionando.
- Último recurso: `git revert` do commit que fez a dual-render em `CalendarPage.tsx` — volta ao estado atual (MonthView/WeekView/DayView em todas as larguras).

Não há feature flag. Seguindo o padrão do Plan 1, cada commit é o rollback natural.

---

## 12. Ordem de implementação (preview do Plan)

Esta seção é só para alinhar expectativas — o plano detalhado será escrito em seguida.

1. `useAgendaViewMode` hook + teste (isolado, zero impacto)
2. `AgendaDayList` + teste (consumido só por views mobile)
3. `MonthGridMobile` + teste
4. `WeekStrip` + teste
5. `DayViewMobile` + teste
6. `CalendarFiltersSheet` + teste
7. Migração `AgendaItemSheet` → `ResponsiveDialog`
8. Migração `CreateEventDialog` → `ResponsiveDialog`
9. Migração `OwnershipPageChooserDialog` → `ResponsiveDialog`
10. `CalendarPage.tsx` dual render + `CalendarPage.layout.test.tsx` atualizado
11. Verificação manual em 375/768/1024/1440

Cada passo é mergeable independentemente — parando em qualquer um, o app segue funcionando.
