# Dashboard Mobile Redesign — Plan 3 Spec

**Status:** Draft — aguardando revisão do usuário antes do plano de implementação
**Created:** 2026-04-19
**Author:** Luciano + Claude (brainstorming session)
**Skill chain:** `superpowers:brainstorming` → `ui-ux-pro-max` (ativa) → `superpowers:writing-plans` (próxima)
**Depends on:** Plan 1 (Mobile Shell Infrastructure) — already merged to `main` (`f25f916`)

---

## 1. Problema

O shell mobile (BottomNav, FAB, MoreSheet, AnaClaraStub) está em produção. Mas o **conteúdo das páginas continua desktop-first**: cada página renderiza seu próprio `<Header>` com layout horizontal que quebra em 375px (título wrapa, actions saem da viewport, avatar não tem local), e o corpo dos componentes assume grids largos. O Dashboard é a página mais complexa e a primeira a ser adaptada.

**Objetivo:** entregar o Dashboard funcionando genuinamente bem em mobile (iPhone SE 375×667 como piso) sem mudar o visual desktop. Também entregar a infraestrutura de header responsivo que todas as páginas subsequentes vão consumir.

### Fora de escopo (explícito)
- Outras páginas além de Dashboard (serão Plans 4..N)
- Chat real da Ana Clara (é Plan 2, não Plan 3)
- Mudança de cores/tipografia/iconografia
- Skeleton loading state mobile (ajuste sob demanda, não parte central)
- Animações de transição entre breakpoints

---

## 2. Decisões fundantes (aprovadas em brainstorming)

| # | Decisão | Escolhido |
|---|---|---|
| Q1 | Header approach | **Refactor do `<Header>` compartilhado** (não cria `<MobileHeader>` separado). Componente único vira responsivo; todas as 14+ páginas herdam o fix. |
| Q2 | Actions + avatar | **Row 1** = ícone + título + avatar; **Row 2** = subtítulo + actions. Avatar tap direto → `/perfil`. Actions que passam de 3 ganham `overflow-x-auto`. |
| Q3 | Dashboard block order | **Priorizado mobile**: alertas → Ana Clara → KPIs → A Pagar → widgets → transações → gráficos. Divergente do desktop por intenção (acionáveis primeiro). |
| Q4 | Charts + widgets | **Donut com total central + legenda em chips** (substitui pie só no mobile). **Widgets stackeados 1-col** (sem grid 2×2 no mobile). Line chart em `ResponsiveContainer` com `min-h-[240px]`. |

---

## 3. Arquitetura

### 3.1 Árvore de arquivos

#### Novos
```
src/components/layout/
  Header.mobile.test.tsx                           # cobre responsividade mobile

src/components/dashboard/
  DashboardAlertCard.tsx                           # card "contas vencidas" no topo do mobile
  DashboardAlertCard.test.tsx
  DonutChart.tsx                                   # variante donut do pie (mobile-only)
  DonutChart.test.tsx
```

#### Modificados
```
src/components/layout/
  Header.tsx                                       # responsivo + prop showAvatar
  Header.test.tsx                                  # mantém testes desktop intactos

src/pages/
  Dashboard.tsx                                    # reordena blocos + usa DonutChart + widgets 1-col
  Dashboard.test.tsx                               # testa ordem mobile + preserva assertions desktop

src/components/dashboard/charts/
  ExpensesByCategoryChart.tsx                      # wrapper: pie em lg, donut em <lg
  MonthlyTrendChart.tsx                            # ResponsiveContainer + min-h-[240px]
```

### 3.2 Dependências entre componentes
```
Header (shared, responsive)
  └─ usado por Dashboard + ALL páginas → fix propaga app-wide

Dashboard page
  ├─ Header (title, subtitle, icon, actions, showAvatar)
  ├─ PageContent
  ├─ DashboardAlertCard             (NEW, renderiza só se há contas vencidas)
  ├─ AnaDashboardWidget             (existente, reposicionado pro topo)
  ├─ StatCard × 4                   (existente, 1-col mobile, 4-col desktop)
  ├─ PayableBillsWidget             (existente, full-width + lista de 3 próximas em mobile)
  ├─ InvestmentsWidget              (existente, full-width em mobile)
  ├─ Transações Recentes (inline)   (existente, 5 últimos)
  ├─ ExpensesByCategoryChart        (modificado — pie/donut switch)
  ├─ MonthlyTrendChart              (modificado — responsive height)
  ├─ GoalsSummaryWidget             (existente, full-width mobile)
  └─ BudgetComplianceWidget         (existente, full-width mobile)
```

### 3.3 Regras de visibilidade
| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| Header avatar | `flex` tap → `/perfil` | `hidden` (avatar continua no footer da Sidebar) |
| Header subtítulo+actions | row 2 (`flex flex-col gap-2`) | row 1 inline (`lg:flex-row`) |
| DashboardAlertCard | `flex` no topo quando há contas vencidas | `hidden` (badge da sidebar já sinaliza) |
| AnaDashboardWidget | posição #2 (após alertas) | posição atual (metade direita após charts) |
| StatCards | `grid-cols-1` | `md:grid-cols-2 lg:grid-cols-4` |
| Widgets PayableBills/Investments/Goals/Budget | `flex flex-col gap-4` full-width | grid 2x2 dentro de sub-grid atual |
| ExpensesByCategoryChart → internals | DonutChart + chips | Pie + legenda lateral (atual) |

---

## 4. Header refactor

### 4.1 API (retrocompatível)
```tsx
interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  showAvatar?: boolean;  // novo — default true no mobile, false no desktop
}
```

Todos os callsites existentes continuam funcionando sem passar `showAvatar`. O default internamente respeita o breakpoint.

### 4.2 Wireframes ASCII

**Desktop (≥ lg) — INALTERADO**
```
+-----------------------------------------------------------+
| [icon]  Título da página                         [actions]|
|         Subtítulo opcional                                |
+-----------------------------------------------------------+
```

**Mobile (< lg)**
```
+-----------------------------------------+
| [icon] Título da página         [👤]   |  row 1: min-h-14
+-----------------------------------------+
| subtítulo             [actions overflow]|  row 2: px-4 py-2
|                       [  scroll se >3  ]|  flex-wrap=none, overflow-x-auto
+-----------------------------------------+
```

### 4.3 Tailwind class skeleton
```
<header className="
  flex flex-col gap-2 px-4 py-3 border-b border-border
  lg:flex-row lg:items-center lg:justify-between lg:border-none lg:gap-4 lg:px-8 lg:py-6
">
  <div className="flex items-center gap-3">
    {icon && <IconBox>{icon}</IconBox>}
    <div className="flex-1">
      <h1 className="text-xl font-semibold lg:text-2xl">{title}</h1>
      <p className="hidden text-sm text-muted-foreground lg:block">{subtitle}</p>
    </div>
    {showAvatar !== false && (
      <Link to="/perfil" aria-label="Perfil" className="lg:hidden">
        <Avatar>{profile.avatar_url || initials}</Avatar>
      </Link>
    )}
  </div>
  <div className="flex items-center gap-2 overflow-x-auto lg:overflow-visible lg:flex-shrink-0">
    <span className="flex-1 text-xs text-muted-foreground lg:hidden">{subtitle}</span>
    {actions}
  </div>
</header>
```

Regras ui-ux-pro-max aplicadas: `mobile-first`, `touch-target-size` (avatar 44×44), `aria-labels`, `no-emoji-icons` (avatar é `<Avatar>`, não emoji).

---

## 5. Dashboard mobile — wireframe completo

```
┌──────────────────────────────────────────────┐
│ 🏠 Olá, Luciano!                    [👤]    │ Header responsivo
├──────────────────────────────────────────────┤
│ Bem-vindo ao seu painel    ◀ Abril 2026 ▶   │ Row 2 (mobile)
╞══════════════════════════════════════════════╡
│                                              │
│ ┌─ ⚠ 2 contas vencidas — R$ 1.750 ────────┐│ DashboardAlertCard
│ │  Aluguel · Conta de Luz                  ││ (condicional)
│ │  [ Ver contas a pagar → ]                ││
│ └──────────────────────────────────────────┘│
│                                              │
│ ┌─ ✨ Ana Clara ─────────────────────────┐ │ AnaDashboardWidget
│ │  Saudação + health score                │ │ reposicionado pro topo
│ │  Insight principal + 2 secundários      │ │ conteúdo interno intacto
│ │  Motivational quote                     │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 💰 Saldo Total ─────── R$ 10.161 ─────┐ │ StatCards stackeados
│ └─────────────────────────────────────────┘ │
│ ┌─ 📈 Receitas  ───────── R$ 10.000 ─────┐ │
│ └─────────────────────────────────────────┘ │
│ ┌─ 📉 Despesas  ───────── R$ 2.948 ──────┐ │
│ └─────────────────────────────────────────┘ │
│ ┌─ 💳 Saldo Cartão ────── R$ 2.499 ──────┐ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 🧾 Contas a Pagar ───────────────  →──┐ │ PayableBillsWidget
│ │  R$ 5.817 a vencer · 2 vencidas         │ │ full-width
│ │  • Aluguel — hoje                       │ │ + lista 3 próximas
│ │  • Gás Naturgy — vence em 5 dias        │ │
│ │  • Conta de Luz — venceu há 5 dias      │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 💼 Investimentos ─── R$ 10.000 ───────┐ │ InvestmentsWidget
│ │  1 ativo · +0.00%                   →  │ │ full-width
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 📋 Transações Recentes ────────────────┐ │ últimas 5
│ │  iFood · R$ 45,00      Alim · Hoje      │ │
│ │  Mercado · R$ 120      Alim · Ontem     │ │
│ │  ...                                    │ │
│ │  [ Ver todas → ]                        │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 📊 Despesas por Categoria ─────────────┐ │ Donut com total central
│ │                  ╭─────╮                │ │
│ │                  │R$   │                │ │
│ │                  │2948 │                │ │
│ │                  │TOTAL│                │ │
│ │                  ╰─────╯                │ │
│ │ [🟠 Alim 76%] [🔵 Transp 11%]         │ │
│ │ [🟢 Esp 7%]   [🟡 Consumo 6%]          │ │ Chips wrap
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 📈 Evolução 6 Meses ──────────────────┐ │ ResponsiveContainer
│ │  eixo X: N D J F M A                   │ │ min-h-[240px]
│ │  legenda abaixo                        │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─ 🎯 Metas ──────────── 1/3 ────────────┐ │ GoalsSummaryWidget
│ └─────────────────────────────────────────┘ │
│ ┌─ 📊 Orçamento ─── 75% usado ──────────┐ │ BudgetComplianceWidget
│ └─────────────────────────────────────────┘ │
│                                              │
│ [bottom nav fixa]                            │
└──────────────────────────────────────────────┘
```

### 5.1 Regras ui-ux-pro-max aplicadas
- Prio 5 `content-priority`: acionáveis (alertas, Ana, saldo, próximas contas) antes de exploratórios (charts)
- Prio 5 `mobile-first`, `breakpoint-consistency`: tudo em `< lg` → 1-col; `≥ lg` volta ao atual
- Prio 5 `horizontal-scroll`: zero scroll horizontal em 320/375/768/1024/1440/1920
- Prio 10 `chart-type`: donut para pequeno viewport + total central (hero metric)
- Prio 10 `legend-visible`, `direct-labeling`: chips abaixo do donut; legenda visível
- Prio 10 `responsive-chart`: line chart em `ResponsiveContainer`, altura mínima 240px
- Prio 2 `touch-target-size`: avatar 44×44, CTAs ≥ 44 min

---

## 6. Componentes novos — detalhes

### 6.1 DashboardAlertCard
```tsx
interface DashboardAlertCardProps {
  overdueCount: number;
  overdueAmount: number;
  topItems: { name: string; dueLabel: string }[]; // máx 2 items para preview
}
```

- Renderiza apenas quando `overdueCount > 0` (componente retorna `null` caso contrário)
- Só aparece em mobile (`lg:hidden`)
- Visual: card com border vermelho + ícone ⚠
- CTA: `<Link to="/contas-pagar">Ver contas a pagar →</Link>`
- Acessibilidade: `role="alert"` + `aria-label` descrevendo severidade

### 6.2 DonutChart
- Reaproveita componente Recharts (`PieChart` com `innerRadius`)
- Recebe dados já formatados de `ExpensesByCategoryChart`
- Center label: valor total formatado + label "TOTAL"
- Legenda: `flex flex-wrap gap-2` com chips (`background: bg-surface-elevated`, `border`)
- Uso: importado por `ExpensesByCategoryChart` quando em mobile

### 6.3 ExpensesByCategoryChart responsivo
```tsx
export function ExpensesByCategoryChart(props: Props) {
  return (
    <>
      <div className="hidden lg:block">
        {/* pie existente */}
      </div>
      <div className="lg:hidden">
        <DonutChart {...normalizedProps} />
      </div>
    </>
  );
}
```

Assim o componente externo mantém a mesma assinatura — Dashboard não precisa saber se é pie ou donut.

---

## 7. Testes

### 7.1 Novos
- `Header.mobile.test.tsx`: avatar visível mobile; link aponta `/perfil`; actions em row 2; subtítulo em row 2; desktop mantém row 1 inline.
- `DashboardAlertCard.test.tsx`: renderiza quando `overdueCount > 0`; oculto quando `= 0`; CTA navega para `/contas-pagar`; `role="alert"`.
- `DonutChart.test.tsx`: 4 segmentos renderizam (cores corretas); total central exibido; chips aparecem com label + %.

### 7.2 Atualizados
- `Dashboard.test.tsx`:
  - Adiciona teste de ordem mobile via `data-testid` em cada bloco (assertivas de ordem usando `screen.getAllByTestId(/dashboard-block/).map(el => el.getAttribute('data-testid'))`).
  - Preserva testes atuais de presença/valores em desktop.
- `Header.test.tsx`: preserva testes atuais byte-idênticos.

### 7.3 Regressão
- Snapshot funcional: rodar full suite antes/depois — apenas tests referenciados aumentam; nenhum outro teste muda comportamento.
- Manual: iPhone SE (375×667), iPad portrait (768×1024), desktop 1440×900.

---

## 8. Rollout

Plan 3 é um único entregável. Subagents executam tasks independentes em paralelo quando possível.

### 8.1 Ordem
| # | Task | Depende de |
|---|---|---|
| 1 | Refactor `Header.tsx` responsivo + novos testes | — |
| 2 | Criar `DashboardAlertCard` | — (paralelo com 1) |
| 3 | Criar `DonutChart` | — (paralelo com 1, 2) |
| 4 | Refactor `ExpensesByCategoryChart` para switch pie/donut | 3 |
| 5 | Refactor `MonthlyTrendChart` para responsive height | — |
| 6 | Refactor `Dashboard.tsx` — reorder + widgets full-width mobile | 1, 2, 4, 5 |
| 7 | Atualizar `Dashboard.test.tsx` | 6 |
| 8 | Verificação manual (iPhone SE / iPad / desktop 1440) | 1-7 |

---

## 9. Critérios de aceite

- [ ] Ordem dos blocos mobile bate com §5
- [ ] Desktop 1440: visual pixel-idêntico (snapshot manual antes/depois)
- [ ] Avatar do header em mobile tapável → navega `/perfil`
- [ ] `DashboardAlertCard` aparece quando há contas vencidas, some quando não há
- [ ] Donut mostra total central sem tap
- [ ] Legenda em chips não excede a viewport em 375px
- [ ] Line chart: `min-h-[240px]`, eixo X legível (≥ 11px), legenda abaixo
- [ ] StatCards em 1-col mobile (preservado do estado atual)
- [ ] Widgets (PayableBills/Investments/Goals/Budget) em 1-col mobile, full-width
- [ ] Zero scroll horizontal em 320/375/768/1024/1440/1920
- [ ] Tap targets ≥ 44×44px
- [ ] Testes existentes do Dashboard continuam verdes
- [ ] Testes existentes do Header continuam verdes (desktop intacto)

---

## 10. Detalhes resolvidos

1. **Avatar fallback**: `<Avatar>` (shadcn) com `AvatarImage src={profile.avatar_url}` e `AvatarFallback>{initials}` — mesmo padrão da Sidebar.
2. **`showAvatar` default**: `true`. O elemento `<Avatar>` tem classe `lg:hidden`, então ele **renderiza em mobile e some em desktop** automaticamente. Se uma página quiser forçar o avatar off (ex: Login), passa `showAvatar={false}` para não renderizar em lugar algum. No desktop o acesso ao Perfil continua pelo avatar do footer da Sidebar (sem alteração).
3. **`DashboardAlertCard` trigger**: só alertas tipo `overdue` (contas vencidas) — `pending-today`/`due-soon` ainda cabem no `PayableBillsWidget`, não duplicar.
4. **MonthSelector**: no mobile fica no row 2 do header; desktop no row 1 (comportamento atual).
5. **Transações Recentes**: mantém 5 itens (não reduz pra 3).
6. **Ana Clara widget**: conteúdo interno intacto; só muda a posição na árvore do Dashboard.

---

## 11. Próximo passo

Invocar `superpowers:writing-plans` para transformar este spec em plano de implementação com:
- 8 tasks TDD (test first → impl → commit → revisão)
- Paralelização de Tasks 1-3 (componentes independentes)
- Gates de teste entre tasks
- Verificação manual como última task

Após isso, seguimos com Plan 4 (Transações mobile).
