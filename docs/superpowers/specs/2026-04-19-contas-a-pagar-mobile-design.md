# Contas a Pagar Mobile Redesign — Plan 5 Spec

**Status:** Draft — aguardando revisão do usuário antes do plano de implementação
**Created:** 2026-04-19
**Author:** Luciano + Claude (brainstorming session)
**Skill chain:** `superpowers:brainstorming` → `ui-ux-pro-max` (ativa) → `superpowers:writing-plans` (próxima)
**Depends on:** Plan 1 (shell), Plan 3 (Header responsivo), Plan 4 (ResponsiveDialog + dual-render pattern)

---

## 1. Problema

`/contas-pagar` é uma página densa (884 linhas, 3 tabs, 11 sub-componentes, 6 dialogs) e hoje é puramente desktop. Em 375px:
- Tabs (`grid-cols-3`) viram cramped
- Summary cards 1-col empilham desnecessariamente
- ViewToggle "Cards/Calendário" mostra calendário que não cabe
- Dialogs centralizadas não usam bem o espaço mobile (especialmente o BillDialog form, que tem 8+ campos)

### Fora de escopo
- Mudanças no fluxo de negócio (recorrências, parcelamento, marcação de pago)
- Adição de campos novos
- Mudanças de cores/tipografia
- Página `/agenda` (separada — Plan 7)

### ⚠ Restrição forte — desktop NÃO muda
Mesma regra de Plans 3 e 4. Toda mudança usa classe nova só `<lg` ou dual-render (`lg:hidden` + `hidden lg:block`). Zero mudança em classes `lg:`/`xl:` existentes.

---

## 2. Decisões fundantes (aprovadas em brainstorming)

| # | Decisão | Escolhido |
|---|---|---|
| Q1 | Tabs no mobile | **A — Tabs scrolláveis horizontais** (`overflow-x-auto`). Padrão WhatsApp/Instagram. |
| Q2 | ViewToggle Cards vs Calendário | **A — Esconder "Calendário" no mobile**, forçar "Cards". Calendário fica em /agenda (Plan 7). |
| Q3 | 5 dialogs pequenos (confirm) + 1 BillDialog (form) | **B — Só `BillDialog` migra para `ResponsiveDialog`**. Confirmações (delete/revert/etc) continuam Radix Dialog/AlertDialog pequenas centralizadas — já cabem em 375px. |

---

## 3. Arquitetura

Aplicação direta dos patterns dos Plans 1, 3, 4. Zero novos primitivos.

### 3.1 Novos arquivos
```
src/components/payable-bills/BillFiltersSheet.tsx            # mobile-only sheet com os 4 filtros existentes
src/components/payable-bills/BillFiltersSheet.test.tsx
```

### 3.1.1 Arquivos modificados

```
src/pages/PayableBills.tsx                                   # tabs scrolláveis, summary 2x2 mobile, filter bar dual-render, BillList dual-render, esconder calendar mobile, abrir BillFiltersSheet em mobile
src/pages/PayableBills.test.tsx                              # asserts mobile tabs scrollable + summary grid + view forced to cards on mobile
src/components/payable-bills/BillSummaryCards.tsx            # responsive compact (mesmo padrão do StatCard / TransactionSummaryCard)
src/components/payable-bills/BillDialog.tsx                  # consome ResponsiveDialog (Sheet mobile / Dialog desktop)
src/components/payable-bills/BillList.tsx                    # dual-render: mobile inline cards, desktop preserva
src/components/payable-bills/ViewToggle.tsx                  # esconder opção Calendário em mobile (lg:flex)
```

### 3.2 Componentes inalterados
- `BillCalendar` (não usado no mobile via ViewToggle)
- `BillHistoryTable` (Histórico tab — recebe scroll horizontal natural se overflow)
- `BillSortSelect`, `PeriodFilter`, `RecurrenceTypeFilter`, `BillCategoryFilter` (filtros — viram bottom sheet de filtros se necessário, decidido na implementação)
- `AttentionSection` (alerts — já é card, herda compacto via classe responsiva)
- 5 dialogs `AlertDialog`/`Dialog` de delete/revert/reminder etc — mantidos centralizados (Q3=B)

### 3.3 Regras de visibilidade

| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| Header Page | row 1 + row 2 (Plan 3 já cuida) | atual |
| Tabs (3 abas) | `flex overflow-x-auto` em `lg:hidden`; desktop `grid grid-cols-3` em `hidden lg:grid` | atual |
| BillSummaryCards | `grid-cols-2 gap-3` interno compacto (icon h-8, p-3, hidden md:block subtitle) | inalterado (4-col, h-11, p-6) |
| Search/filter bar | dual-render — search flex-1 + botão ícone filtro com badge (mesmo Transações) | inalterado |
| ViewToggle | `lg:hidden` no toggle inteiro (mobile não tem opção; força "cards") + `hidden lg:flex` no toggle atual | inalterado |
| BillList items | dual-render — mobile inline (icon + name + meta + value), desktop preservado byte-a-byte | inalterado |
| BillDialog (criar/editar) | full-screen Sheet via ResponsiveDialog | Dialog centralizada (Plan 4 já preserva) |
| Confirmações delete/revert/etc (5 dialogs) | Dialog centralizada (já cabe em < 375px) | inalterado |
| BillCalendar (calendário visual) | nunca visível (mobile força view=cards) | inalterado |

---

## 4. Wireframes ASCII

### 4.1 Mobile (< 1024px) — view "Cards" forçada
```
+-------------------------------------------+
| 🧾 Contas a Pagar              [👤]      |  Header row 1 (Plan 3)
+-------------------------------------------+
| Gerencie suas contas    [+ Nova Conta]   |  Header row 2
+===========================================+
|                                           |
|  ┌────────┐  ┌────────┐                   |
|  │📅 Total│  │💸 Pago │                   |  Summary 2x2 compacto
|  │R$ 5.8k │  │R$ 2.1k │                   |
|  └────────┘  └────────┘                   |
|  ┌────────┐  ┌────────┐                   |
|  │⚠ Vence │  │❌ Atras│                   |
|  │5 contas│  │2 contas│                   |
|  └────────┘  └────────┘                   |
|                                           |
|  [Lançamentos] [Histórico] [Relatórios] →|  Tabs scroll-x
|                                           |
|  [🔍 Buscar conta            ] [⚙️ 2]    |  Filter bar
|  [Moradia ✕]  [Limpar]                    |  Active chips
|                                           |
|  ┌─────────────────────────────────────┐ |
|  │💡 Conta de Luz   Vencida    R$ 250 │ |  Inline card
|  └─────────────────────────────────────┘ |
|  ┌─────────────────────────────────────┐ |
|  │🏠 Aluguel        Hoje      R$ 1.500│ |
|  └─────────────────────────────────────┘ |
|  ...                                       |
+===========================================+
| 🏠 📋 🤖 🧾 ☰   (bottom nav)               |
+-------------------------------------------+
```

### 4.2 Desktop (≥ 1024px) — INALTERADO
Layout atual: 3-col tabs grid, 4-col summary, side-by-side filtros, ViewToggle visível com Cards/Calendário, grids `md:grid-cols-2 lg:grid-cols-3` na BillList. Tudo via dual-render preservado.

### 4.3 Tabs scrolláveis mobile (zoom)
```
[Lançamentos] [Histórico] [Relatórios] →
^^^^^^^^^^^^                              ↳ scroll-x se necessário
   (active)
```

className: `flex w-full gap-2 overflow-x-auto rounded-xl border border-border/70 bg-card/95 p-1 lg:hidden`

Cada `TabsTrigger` filho ganha `flex-shrink-0 whitespace-nowrap`.

### 4.4 BillSummaryCards mobile (zoom)
```
┌────────┐  ┌────────┐
│📅      │  │💸      │   icon h-8 w-8
│ Total  │  │ Pago   │   text-xs (era text-sm)
│ R$ 5.8k│  │ R$ 2.1k│   text-xl (era text-3xl)
└────────┘  └────────┘
```
- `grid-cols-2 gap-3` mobile / `md:grid-cols-2 xl:grid-cols-4` desktop
- `rounded-xl md:rounded-[28px]` (alinhar Design System mobile)
- Subtitle/badge `hidden md:block`
- Padding `p-3 md:p-6`

### 4.5 BillList mobile inline (zoom)
```
┌─────────────────────────────────────┐
│🏠  Aluguel                          │
│    Moradia · Nubank · Hoje  R$ 1.500│   inline
└─────────────────────────────────────┘
```
Mesmo pattern do `TransactionItem` mobile do Plan 4.

---

## 5. Regras ui-ux-pro-max aplicadas

- **Prio 5 `mobile-first`**: novas classes default mobile, `md:`/`lg:` preserva desktop
- **Prio 5 `content-priority`**: tabs visíveis (acionável), filtros compactos
- **Prio 5 `horizontal-scroll`**: zero (exceto a tab list — scroll-x intencional, padrão mobile)
- **Prio 2 `touch-target-size`**: tab triggers ≥ 44px altura, ícone filtro 44×44
- **Prio 9 `nav-label-icon`**: tabs mantêm label (não só ícone)
- **Prio 9 `bottom-nav-limit`**: respeitado (página inteira herda do shell Plan 1)

---

## 6. Testes

### 6.1 Atualizados
- `PayableBills.test.tsx`:
  - Assert mobile tabs container tem `overflow-x-auto` e `lg:hidden`
  - Assert mobile summary grid tem `grid-cols-2`
  - Assert ViewToggle "Calendário" tem `hidden md:inline` ou similar (forçar Cards mobile)
  - Preservar testes existentes
- `BillDialog.test.tsx` (se existir): assert renderiza Sheet em mobile (mesmo padrão de TransactionDialog Plan 4)

### 6.2 Regressão
- Rodar full suite — baseline pré-existente (calendar/ticktick) não muda.
- Visual desktop em 1440 — eyeball antes/depois.

---

## 7. Rollout

| # | Task | Depende de |
|---|---|---|
| 1 | `BillSummaryCards` responsive compacto | — |
| 2 | `ViewToggle` esconde Calendário em mobile | — |
| 3 | `BillDialog` consome `ResponsiveDialog` (sheet mobile) | — (Plan 4 já criou primitive) |
| 4 | `BillList` dual-render (mobile inline cards) | — |
| 5 | `PayableBills.tsx` tabs scrolláveis + filter bar mobile + summary grid 2-col | 1, 2 |
| 6 | Atualizar `PayableBills.test.tsx` | 5 |
| 7 | Manual verification (iPhone SE / iPad / desktop 1440) | 1-6 |

Tasks 1, 2, 3, 4 paralelizáveis.

---

## 8. Critérios de aceite

- [ ] Tabs (3) scrolláveis horizontalmente em < lg, grid de 3-col em ≥ lg (desktop intacto)
- [ ] Summary cards: 2-col em < md (compacto), preservado em ≥ md
- [ ] ViewToggle "Calendário" não visível em mobile (forçar Cards)
- [ ] Search/filter bar mobile: search flex-1 + botão ícone com badge
- [ ] BillList: mobile inline; desktop pixel-idêntico
- [ ] BillDialog: full-screen sheet em mobile, Dialog em desktop
- [ ] 5 dialogs de confirmação: continuam Dialog/AlertDialog pequena
- [ ] Zero scroll horizontal em 320–1920 (exceto a tab list, intencional)
- [ ] Tap targets ≥ 44×44
- [ ] Desktop 1440: pixel-idêntico
- [ ] Testes existentes passam + 3-5 novas asserts mobile

---

## 9. Detalhes resolvidos

1. **Mobile tabs scrollable**: usa as mesmas `Tabs/TabsList/TabsTrigger` do shadcn — só muda className do TabsList para `flex overflow-x-auto` em mobile vs `grid-cols-3` em desktop. Triggers ganham `flex-shrink-0`.
2. **ViewToggle**: o toggle atual provavelmente é dois `<Button>`s. Adicionar `hidden md:inline-flex` no botão "Calendário"; em mobile, só "Cards" visível (já é o default).
3. **Lógica de view**: se o usuário entra em mobile com state `viewMode === 'calendar'` (vindo de localStorage etc), forçar para 'cards' via `useEffect` se viewport < lg. Detalhe da implementação.
4. **Filter bar mobile**: pattern do Plan 4 — search input full-width + botão ícone com badge de filtros ativos. PayableBills tem 4 filtros inline (PeriodFilter, RecurrenceTypeFilter, BillCategoryFilter, BillSortSelect). Criar um novo componente mobile-only `BillFiltersSheet` (usa `ResponsiveDialog`) que envolve os 4 filtros existentes + botão "Aplicar/Limpar". O ícone de filtro abre esse sheet. **No mobile, os 4 filtros existentes ficam dentro do sheet — não inline.** Desktop continua inline (preservado via dual-render).
5. **BillDialog**: refactor exatamente igual ao Plan 4 fez com TransactionDialog — wrap em `ResponsiveDialog`, adicionar `id="bill-form"` no `<form>`, `form="bill-form"` no botão Salvar do footer.
6. **5 dialogs de confirmação**: zero mudança. Continuam centralizadas, cabem bem em 375px (texto curto + 2 botões).
7. **Tabs swipe gesture**: NÃO implementar swipe-between-tabs no mobile (escopo). Usuário tap nas tabs.

---

## 10. Próximo passo

Invocar `superpowers:writing-plans` para 7 tasks TDD. Padrão estabelecido nos Plans 3 e 4 — execução via subagent-driven-development.

Após Plan 5 segue:
- Plan 6 — lote Cartões/Metas/Investimentos/Relatórios
- Plan 7 — Agenda
- Plan 8 — Utilitárias
- Plan 9 — Conciliação (mais complexa)
