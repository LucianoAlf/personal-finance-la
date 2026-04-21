# Investimentos Mobile — Design Doc

**Status:** Approved — ready for implementation plan
**Created:** 2026-04-21
**Author:** Luciano + Claude (brainstorming session)
**Parent spec:** [2026-04-19-mobile-first-responsive-redesign.md](./2026-04-19-mobile-first-responsive-redesign.md) — §6.3 Investimentos

---

## 1. Problema

A página Investimentos (`/investimentos`, componente `src/pages/Investments.tsx`) é a mais densa do app:

- 32 componentes em `src/components/investments/`
- 5 abas (`Tabs` Radix): Portfolio · Transações · Dividendos · Alertas · Overview
- Tabela de 8 colunas (tipo, ticker, qty, preço médio, cotação, total, retorno %, goals) em `Portfolio`
- 3 gráficos Recharts em `Overview` (Alocação PieChart, Evolução LineChart, Performance BarChart)
- 4 summary cards no topo (`PortfolioSummaryCards`)
- 3 dialogs usando **Radix Dialog direto** (`InvestmentDialog`, `TransactionDialog`, `AlertDialog`) — mesmo padrão que travou o mobile em Cartões
- Widgets de inteligência pesados: `AnaInvestmentInsights`, `InvestmentPlanningCalculator`, `BadgesDisplay`, `PerformanceHeatMap`, `BenchmarkComparison`, `SmartRebalanceWidget`

Em < 1024px:
- A `TabsList` `grid-cols-5` com labels completos esmaga os 5 labels.
- A tabela rola horizontalmente (quebra o usuário de scroll vertical).
- Os 3 charts lado a lado não cabem.
- Os widgets de inteligência (heatmap, calculator) são impraticáveis em 375px.

**Objetivo:** redesenhar o mobile mantendo as 5 abas funcionais, com widgets essenciais adaptados e widgets de análise profunda preservados para o desktop via placeholder. Desktop (≥ 1024px) permanece pixel-idêntico.

### Fora de escopo

- Mudança em tipos (`database.types.ts`), hooks de dados (`useInvestments`, `useInvestmentTransactions`, `useDividendCalendar` etc.) ou queries Supabase.
- Redesenho profundo de `PerformanceHeatMap`, `InvestmentPlanningCalculator`, `SmartRebalanceWidget`, `BadgesDisplay`, `BenchmarkComparison` — esses ficam com placeholder "Abra no desktop" no mobile.
- Drag-to-rebalance, novos tipos de alerta, novas cores.
- Mudanças visuais em desktop.

---

## 2. Decisões fundantes (aprovadas em brainstorming visual)

| # | Decisão | Escolhido | Justificativa |
|---|---|---|---|
| Q1 | Escopo do redesign | **Completo com widgets essenciais** (Opção C) | 5 abas mobile + summary/charts/insights/alertas/transações/dividendos adaptados. Widgets pesados (heatmap/calculator/rebalance) ficam "veja no desktop". |
| Q2 | Navegação entre abas mobile | **`SlidingPillTabs` com labels compactados** (Portf · Trans · Divid · Alert · Visão) | Consistente com Agenda e Cartões. |
| Q3 | Tabela Portfolio mobile | **Cards com info primária** (ticker + tipo badge, valor, retorno %, qty × preço médio) | Visual claro, tap abre `InvestmentDialog` em modo detalhe. Border-left na cor do tipo de ativo. |
| Q4 | Charts do Overview | **Stacked vertical** em cards | Padrão mobile tradicional, scroll natural. Sem carousel, sem sub-tabs. |
| Q5 | Summary cards | **Hero card único** com 2 métricas secundárias embaixo | "Patrimônio" como número macro + delta em verde; Investido + Yield/mês como subvalores. Total visível em ~120px vertical. |
| Q6 | Default tab no mobile | **Portfolio** (como desktop) | Usuário confirma que é o comportamento esperado. |
| Q7 | Persistência da aba ativa | **`localStorage['investments-active-tab']`** | Aba escolhida sobrevive a reload. |
| Q8 | Hero card | **Fixo acima das abas** | Patrimônio + delta sempre visíveis, independente da aba. |
| Q9 | Dialogs | **Migrar `InvestmentDialog`, `TransactionDialog`, `AlertDialog` para `ResponsiveDialog`** | Previne o freeze de portal que travou Cartões. |
| Q10 | "Abra no desktop" placeholder | **Card compacto com ícone 🖥️ + nome do widget + descrição "Disponível no desktop"** | Substitui `PerformanceHeatMap`, `InvestmentPlanningCalculator`, `SmartRebalanceWidget`, `BenchmarkComparison` no mobile. `BadgesDisplay` e `DiversificationScoreCard` também ficam escondidos no mobile (baixo valor sem espaço). |
| Q11 | `AnaInvestmentInsights` | **Renderiza no mobile com layout ajustado** — card único com gradient roxo | Diferencial do app, vale renderizar no mobile. |
| Q12 | `MarketStatus`, `PriceUpdater`, `OpportunityFeed` | **Mantêm no mobile** | Componentes pequenos, pouco impacto. |
| Q13 | `DividendCalendar` | **Mantém no mobile** mas como bottom sheet que abre ao clicar num CTA | Calendário ocupa muito espaço; melhor on-demand. |

---

## 3. Arquitetura

### 3.1 Árvore de arquivos

#### Novos

```
src/components/investments/
  InvestmentsHeroCard.tsx          # Hero com Patrimônio + delta + 2 métricas
  InvestmentsHeroCard.test.tsx
  PortfolioCardList.tsx            # Lista mobile de ativos (cards)
  PortfolioCardList.test.tsx
  TransactionsCardList.tsx         # Timeline de transações mobile (cards agrupados por data)
  TransactionsCardList.test.tsx
  DividendsCardList.tsx            # Lista mobile: "Este mês" + "Próximos 30 dias"
  DividendsCardList.test.tsx
  AlertsCardList.tsx               # Lista mobile de alertas
  AlertsCardList.test.tsx
  OverviewMobileLayout.tsx         # Empilha charts + Ana Insights + placeholders
  OverviewMobileLayout.test.tsx
  DesktopOnlyWidgetCard.tsx        # Placeholder genérico "Abra no desktop"
  DesktopOnlyWidgetCard.test.tsx
  DividendCalendarSheet.tsx        # Bottom sheet para abrir o DividendCalendar no mobile
  DividendCalendarSheet.test.tsx

src/hooks/
  useInvestmentsActiveTab.ts       # Persiste aba ativa em localStorage
  __tests__/useInvestmentsActiveTab.test.ts
```

#### Modificados

```
src/pages/
  Investments.tsx                  # Dual render desktop/mobile
  Investments.test.tsx             # Cobre ambos os paths

src/components/investments/
  InvestmentDialog.tsx             # ResponsiveDialog
  InvestmentDialog.test.tsx
  TransactionDialog.tsx            # ResponsiveDialog
  TransactionDialog.test.tsx
  AlertDialog.tsx                  # ResponsiveDialog
  AlertDialog.test.tsx
```

#### Preservados (zero mudança)

```
src/components/investments/
  PortfolioSummaryCards.tsx        # Desktop only (lg:block)
  AssetAllocationChart.tsx
  PortfolioEvolutionChart.tsx
  PerformanceBarChart.tsx
  AnaInvestmentInsights.tsx        # Renderizado no mobile também — já responsivo o suficiente
  AlertsList.tsx                   # Reusado por AlertsCardList desktop
  DividendHistoryTable.tsx
  DividendCalendar.tsx             # Renderizado dentro de DividendCalendarSheet no mobile
  TransactionTimeline.tsx          # Desktop only
  MarketStatus.tsx
  PriceUpdater.tsx
  OpportunityFeed.tsx
  PerformanceHeatMap.tsx           # Desktop only — placeholder no mobile
  InvestmentPlanningCalculator.tsx # Desktop only — placeholder no mobile
  SmartRebalanceWidget.tsx         # Desktop only — placeholder no mobile
  BenchmarkComparison.tsx          # Desktop only — placeholder no mobile
  BadgesDisplay.tsx                # Hidden no mobile
  DiversificationScoreCard.tsx     # Hidden no mobile
  InvestmentReportDialog.tsx       # Fora de escopo — já é desktop-only de fato

src/types/database.types.ts        # Tipos intactos
src/hooks/*                        # Nenhum hook de dados muda
```

### 3.2 Regras de visibilidade

| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| `InvestmentsHeroCard` | visível acima das abas | `hidden` |
| `PortfolioSummaryCards` | `hidden` | visível |
| `SlidingPillTabs` | visível | `hidden` |
| `Tabs` (Radix, atual) | `hidden` | visível |
| `PortfolioCardList` | visível quando tab=portfolio | `hidden` |
| `PortfolioTable` (existente) | `hidden` | visível |
| `TransactionsCardList` | visível quando tab=transactions | `hidden` |
| `TransactionTimeline` (existente) | `hidden` | visível |
| `DividendsCardList` | visível quando tab=dividends | `hidden` |
| `DividendHistoryTable` (existente) | `hidden` | visível |
| `DividendCalendar` inline | `hidden` | visível quando tab=dividends |
| `DividendCalendarSheet` (CTA + sheet) | visível quando tab=dividends | `hidden` |
| `AlertsCardList` | visível quando tab=alerts | `hidden` |
| `AlertsList` (existente) | `hidden` | visível |
| `OverviewMobileLayout` | visível quando tab=overview | `hidden` |
| 3 charts inline | `hidden` | visível quando tab=overview |
| `AnaInvestmentInsights` | renderiza dentro de `OverviewMobileLayout` | renderiza onde já está |
| `DesktopOnlyWidgetCard` | visível para Heatmap/Calculator/Rebalance/Benchmark no Overview | `hidden` |
| `PerformanceHeatMap` etc. | `hidden` | visível |
| `BadgesDisplay`, `DiversificationScoreCard` | `hidden` | visível |
| Botão "Novo ativo" no header | ícone `+` (label escondido) | label completo |

### 3.3 Estado da página

Substitui:
```ts
const [activeTab, setActiveTab] = useState<InvestmentTab>('portfolio');
```

por:
```ts
const [activeTab, setActiveTab] = useInvestmentsActiveTab('portfolio');
// hook com localStorage (padrão idêntico ao useAgendaViewMode)
```

Novo estado para o mobile:
```ts
const [dividendCalendarSheetOpen, setDividendCalendarSheetOpen] = useState(false);
```

Outros estados (`investmentToEdit`, `transactionInvestmentId`, `alertToEdit` etc.) ficam intactos.

### 3.4 Hook `useInvestmentsActiveTab`

Mesmo padrão do `useAgendaViewMode`:

```ts
export type InvestmentTab = 'portfolio' | 'transactions' | 'dividends' | 'alerts' | 'overview';

const KEY = 'investments-active-tab';
const VALID: ReadonlySet<InvestmentTab> = new Set([
  'portfolio', 'transactions', 'dividends', 'alerts', 'overview',
]);

export function useInvestmentsActiveTab(defaultTab: InvestmentTab = 'portfolio') {
  const [tab, setTab] = useState<InvestmentTab>(() => readStored(defaultTab));
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, tab);
  }, [tab]);
  return [tab, setTab] as const;
}
```

---

## 4. Wireframes aprovados

### 4.1 Portfolio (default)

```
+-----------------------------+
| ≡ Investimentos         [+] |   header + Novo
+=============================+
| ┌─────────────────────────┐ |
| │ PATRIMÔNIO              │ |   hero card
| │ R$ 127.450              │ |
| │ ▲ 12,4% · +R$ 14.150    │ |
| │ ─────────               │ |
| │ Investido R$ 113.300    │ |
| │ Yield/mês R$ 980        │ |
| └─────────────────────────┘ |
+-----------------------------+
| [Portf] Trans Divid Alert… |   SlidingPillTabs (5)
+=============================+
| ┃PETR4 Ação    R$ 24.500    |
| ┃Petrobras PN  ▲ 12,4%      |   card (border-left azul)
| ┃700 un · R$ 35 · → detalhes|
| ─────                       |
| ┃HGLG11 FII    R$ 15.200    |
| ┃CSHG Logística ▼ 3,1%      |   card (border-left roxo)
| ─────                       |
| ┃TD2029 TD     R$ 8.900     |
| ┃Tesouro+ 2029 ▲ 8,7%       |   card (border-left verde)
+=============================+
| 🏠 📋 🤖 🧾 ☰              |   bottom nav
+-----------------------------+
```

Interações:
- Tap num card → abre `InvestmentDialog` em modo visualização/edição.
- `[+]` no header → abre `InvestmentDialog` em modo criação (idêntico ao desktop).

### 4.2 Transações

```
+-----------------------------+
| (hero card)                 |
| [Port] Trans Divid Alert…   |
+=============================+
| HOJE                        |
| ┃PETR4 Compra               |
| ┃100 un · R$ 35 · R$ 3.500  |
| ─────                       |
| ONTEM                       |
| ┃HGLG11 Dividendo           |
| ┃+R$ 285                    |
| ─────                       |
| 13 ABR                      |
| ┃BBAS3 Venda                |
| ┃50 un · R$ 42 · R$ 2.100   |
+-----------------------------+
```

Cards por transação, agrupados por data (Hoje, Ontem, DD mmm). Tap abre `TransactionDialog` em modo visualização.

### 4.3 Dividendos

```
+-----------------------------+
| (hero card)                 |
| Portf Trans [Divid] Alert…  |
+-----------------------------+
| [ 📅 Abrir calendário ]     |   CTA que abre DividendCalendarSheet
+=============================+
| ESTE MÊS · R$ 980           |
| ┃HGLG11  +R$ 285   15 jan   |
| ┃BBAS3   +R$ 120   12 jan   |
| ─────                       |
| PRÓXIMOS 30 DIAS            |
| ┃MXRF11  ≈ R$ 340  28 fev   |   distribuição prevista
+-----------------------------+
```

Cards de dividendos pagos/previstos. `DividendCalendarSheet` é um bottom sheet (padrão do `CalendarFiltersSheet`) que renderiza o `DividendCalendar` existente.

### 4.4 Alertas

```
+-----------------------------+
| (hero card)                 |
| Portf Trans Divid [Alert]…  |
+-----------------------------+
| ATIVOS · 3                  |
| ┃🔔 PETR4 > R$ 40           |
| ┃  Criado há 3 dias  [⋯]    |
| ─────                       |
| ┃🔔 HGLG11 < R$ 120         |
| ┃  Disparado ontem  [⋯]     |
+-----------------------------+
```

Cards de alerta com menu `⋯` (editar/inativar/deletar). Tap no `⋯` abre `DropdownMenu` já existente.

### 4.5 Visão (Overview)

```
+-----------------------------+
| (hero card)                 |
| Portf Trans Divid Alert [Visão]
+=============================+
| ┌ Alocação por Tipo ──────┐ |
| │  ⬤ 45% Ações           │ |   AssetAllocationChart
| │  ⬤ 28% FII             │ |
| │  ⬤ 17% TD              │ |
| └─────────────────────────┘ |
| ┌ Evolução · 365 dias ────┐ |   PortfolioEvolutionChart
| │ (line chart)            │ |
| └─────────────────────────┘ |
| ┌ Performance por Ativo ──┐ |   PerformanceBarChart
| │ (bar chart)             │ |
| └─────────────────────────┘ |
| ┌ 💡 ANA SUGERE ──────────┐ |   AnaInvestmentInsights
| │ Sua alocação em FII…    │ |
| └─────────────────────────┘ |
| ┌ 🖥️ Heatmap ─────────────┐ |   placeholder
| │ Disponível no desktop   │ |
| └─────────────────────────┘ |
| ┌ 🖥️ Rebalance ───────────┐ |
| │ Disponível no desktop   │ |
| └─────────────────────────┘ |
| ┌ 🖥️ Planejamento ────────┐ |
| │ Disponível no desktop   │ |
| └─────────────────────────┘ |
+-----------------------------+
```

3 charts stacked + Ana + 3 placeholders "veja no desktop". `BadgesDisplay`, `DiversificationScoreCard`, `BenchmarkComparison` ficam totalmente ocultos no mobile (não têm placeholder).

---

## 5. Componentes novos — contratos

### 5.1 `InvestmentsHeroCard`

```tsx
interface InvestmentsHeroCardProps {
  currentValue: number;     // Patrimônio atual
  totalInvested: number;
  totalReturn: number;      // Retorno absoluto (R$)
  totalReturnPct: number;   // Retorno %
  monthlyYield: number;     // Yield do mês
  formatCurrency: (v: number) => string;
}
```

Card com gradient azul-escuro, `rounded-2xl`, border sutil. "Patrimônio" como label em caixa alta, valor em `text-2xl font-bold`, delta em verde/vermelho com seta. Divider interno + 2 colunas (Investido, Yield/mês). Renderizado só no mobile.

### 5.2 `PortfolioCardList`

```tsx
interface PortfolioCardListProps {
  investments: Investment[];
  onCardTap: (investment: Investment) => void;
  formatCurrency: (v: number) => string;
  isLoading?: boolean;
}
```

Lista de cards (similar a `AgendaDayList`). Border-left colorido por tipo:
- `stock` → `border-l-blue-500`
- `fund` → `border-l-purple-500`
- `treasury` → `border-l-green-500`
- `crypto` → `border-l-orange-500`
- `real_estate` → `border-l-amber-500`
- `other` → `border-l-slate-500`

Cada card: ticker + badge de tipo, nome, valor total, retorno %, "qty × preço médio". Empty state quando não há ativos.

### 5.3 `TransactionsCardList`

```tsx
interface TransactionsCardListProps {
  transactions: InvestmentTransaction[];
  onCardTap: (tx: InvestmentTransaction) => void;
  formatCurrency: (v: number) => string;
}
```

Agrupa por data usando `date-fns`: "Hoje" / "Ontem" / "DD mmm". Cada card: ticker + ação (Compra/Venda/Dividendo), quantidade × preço, total. Cor do border-left conforme tipo de transação (compra=azul, venda=vermelho, dividendo=verde).

### 5.4 `DividendsCardList` + `DividendCalendarSheet`

```tsx
interface DividendsCardListProps {
  paidThisMonth: DividendPayment[];    // do useDividendHistory
  upcoming30Days: DividendEvent[];     // do useDividendCalendar
  formatCurrency: (v: number) => string;
  onOpenCalendar: () => void;
}

interface DividendCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

Lista agrupada em "Este mês" + "Próximos 30 dias". CTA "📅 Abrir calendário" no topo abre `DividendCalendarSheet` que é um bottom sheet (padrão idêntico ao `CalendarFiltersSheet`).

### 5.5 `AlertsCardList`

```tsx
interface AlertsCardListProps {
  alerts: InvestmentAlert[];
  onEdit: (alert: InvestmentAlert) => void;
  onDelete: (alertId: string) => void;
  onToggle: (alertId: string, active: boolean) => void;
}
```

Card por alerta: ícone 🔔, descrição do alerta ("PETR4 > R$ 40"), subtítulo ("Criado há X dias" ou "Disparado em ..."), menu `⋯` com ações (editar/inativar/deletar).

### 5.6 `OverviewMobileLayout`

```tsx
interface OverviewMobileLayoutProps {
  investments: Investment[];
  metrics: PortfolioMetrics;
  timeSeries: EvolutionSeries;
  performanceData: PerformanceData;
  // ... props que os 3 charts existentes já pedem
}
```

Renderiza, nesta ordem:
1. `AssetAllocationChart` num card
2. `PortfolioEvolutionChart` num card
3. `PerformanceBarChart` num card
4. `AnaInvestmentInsights` num card com gradient roxo
5. `DesktopOnlyWidgetCard` para Heatmap
6. `DesktopOnlyWidgetCard` para Rebalance
7. `DesktopOnlyWidgetCard` para Calculator

### 5.7 `DesktopOnlyWidgetCard`

```tsx
interface DesktopOnlyWidgetCardProps {
  icon?: ReactNode;          // default: <Monitor />
  title: string;
  description?: string;      // default: "Disponível no desktop"
}
```

Card com border dashed, ícone grande, título, descrição. Zero interatividade.

### 5.8 `useInvestmentsActiveTab`

Ver §3.4.

---

## 6. Mudanças nos componentes existentes

### 6.1 `InvestmentDialog.tsx`

Swap `Dialog` → `ResponsiveDialog`. Título dinâmico: `investmentToEdit ? 'Editar ativo' : 'Novo ativo'`. Body preserva todo o form.

### 6.2 `TransactionDialog.tsx`

Swap `Dialog` → `ResponsiveDialog`. Título: `'Nova transação'` (ou edit). Body preserva form.

### 6.3 `AlertDialog.tsx`

Swap `Dialog` → `ResponsiveDialog`. Título: `'Novo alerta'` (ou edit). Body preserva form.

### 6.4 `Investments.tsx`

- Trocar `useState<InvestmentTab>('portfolio')` por `useInvestmentsActiveTab('portfolio')`.
- Adicionar `dividendCalendarSheetOpen` state.
- Header actions: filter não aplicável aqui; botão "Novo ativo" vira ícone `+` no mobile (mesmo padrão da Agenda — já faz hoje via `<span className="hidden sm:inline">Novo</span>`).
- Envelope de `<Tabs>` Radix por `hidden lg:block`.
- Abaixo de `lg:hidden`:
  ```tsx
  <InvestmentsHeroCard {...} />
  <SlidingPillTabs
    tabs={[
      { value: 'portfolio', label: 'Portf' },
      { value: 'transactions', label: 'Trans' },
      { value: 'dividends', label: 'Divid' },
      { value: 'alerts', label: 'Alert' },
      { value: 'overview', label: 'Visão' },
    ]}
    value={activeTab}
    onValueChange={(v) => setActiveTab(v as InvestmentTab)}
    ariaLabel="Abas de investimentos"
  />
  {activeTab === 'portfolio'    && <PortfolioCardList .../>}
  {activeTab === 'transactions' && <TransactionsCardList .../>}
  {activeTab === 'dividends'    && <DividendsCardList    .../>}
  {activeTab === 'alerts'       && <AlertsCardList       .../>}
  {activeTab === 'overview'     && <OverviewMobileLayout .../>}
  ```

---

## 7. Z-index ladder

- `z-0` conteúdo
- `z-30` FAB global (já existe, não mexe)
- `z-40` bottom nav + overlay do DividendCalendarSheet
- `z-50` `ResponsiveDialog` (InvestmentDialog / TransactionDialog / AlertDialog) + DividendCalendarSheet conteúdo
- Alinhado ao ladder do spec mestre.

---

## 8. Acessibilidade

- `role="tablist"` no `SlidingPillTabs` (já tem) + `aria-selected` nas abas.
- Cards de lista: `role="listitem"` dentro de `role="list"`.
- Hero card: `aria-label="Resumo do portfolio"`.
- `DesktopOnlyWidgetCard`: `role="status"` + `aria-label="Disponível apenas no desktop"`.
- Tap targets ≥ 44px (garantido nos cards por padding).
- Contraste AA nas cores de border/fundo.
- `aria-current="page"` no pill da aba ativa (já entrega via SlidingPillTabs).

---

## 9. Testes

### 9.1 Unidade — componentes novos

- `InvestmentsHeroCard.test.tsx`: renderiza patrimônio formatado, delta verde em retorno positivo, vermelho em negativo, mostra investido + yield.
- `PortfolioCardList.test.tsx`: mapeia cada investimento para um card, cor de border-left por tipo, tap dispara `onCardTap`, empty state.
- `TransactionsCardList.test.tsx`: agrupa por data ("Hoje"/"Ontem"/data), border-left por tipo de transação, tap dispara callback.
- `DividendsCardList.test.tsx`: renderiza duas seções (Este mês + Próximos 30 dias), CTA do calendário dispara `onOpenCalendar`.
- `DividendCalendarSheet.test.tsx`: abre/fecha, renderiza `DividendCalendar`, fecha por backdrop/ESC/X (padrão igual ao `CalendarFiltersSheet`).
- `AlertsCardList.test.tsx`: renderiza alertas com menu, callbacks `onEdit`/`onDelete`/`onToggle`.
- `OverviewMobileLayout.test.tsx`: renderiza 3 charts (mockados) + Ana Insights + 3 desktop-only placeholders.
- `DesktopOnlyWidgetCard.test.tsx`: renderiza título + descrição default, ícone default, `aria-label` correto.
- `useInvestmentsActiveTab.test.ts`: default portfolio, lê valor válido, fallback em inválido, persiste em localStorage, SSR-safe.

### 9.2 Integração — `Investments.test.tsx`

- Desktop path renderiza `Tabs` Radix + `PortfolioTable` + 3 charts lado a lado.
- Mobile path renderiza `InvestmentsHeroCard` + `SlidingPillTabs` + component da aba ativa.
- Trocar de aba persiste em localStorage e atualiza o render mobile.
- Abrir `InvestmentDialog`/`TransactionDialog`/`AlertDialog` via ResponsiveDialog (mock).
- `DividendCalendarSheet` abre ao clicar no CTA.

### 9.3 Regressão desktop

- Todos os testes de `src/pages/__tests__/*Investments*` e `src/components/investments/__tests__/*` continuam passando após a migração dos 3 dialogs para ResponsiveDialog (aplicando o `vi.mock('@/components/ui/responsive-dialog', ...)` nos testes afetados).

---

## 10. Critérios de aceite

### Mobile (< lg)

- Hero card sempre visível acima das abas.
- `SlidingPillTabs` com 5 pills (Portf · Trans · Divid · Alert · Visão).
- Aba escolhida persiste após reload.
- 5 abas renderizam conteúdo correspondente sem scroll horizontal em 320/375/768px.
- `InvestmentDialog`, `TransactionDialog`, `AlertDialog` abrem/fecham sem travar a UI.
- `DividendCalendarSheet` desliza de baixo; backdrop/ESC/X funcionam.
- Tap targets ≥ 44×44px.
- Overview mostra 3 charts + Ana Insights + 3 placeholders "Disponível no desktop" (Heatmap, Rebalance, Calculator).

### Desktop (≥ lg)

- Pixel-idêntico à versão atual.
- Todos os testes desktop existentes passam.

### Performance

- Nenhum hook de dados muda; mesmas queries.
- Cards novos não introduzem re-renders desnecessários (usar `useMemo` para agrupamentos por data).

---

## 11. Rollback

Commits atômicos por componente. Se algo der errado:
- `git revert <sha>` do componente problemático.
- Último recurso: revert do commit que adicionou o dual-render em `Investments.tsx` — volta ao estado atual (Radix Tabs em todas as larguras).

---

## 12. Ordem de implementação (preview do Plan)

Esta seção é só para alinhar expectativas — o plano detalhado será escrito em seguida.

1. `useInvestmentsActiveTab` hook
2. `InvestmentsHeroCard`
3. `DesktopOnlyWidgetCard`
4. `PortfolioCardList`
5. `TransactionsCardList`
6. `DividendsCardList`
7. `DividendCalendarSheet`
8. `AlertsCardList`
9. `OverviewMobileLayout`
10. Migrar `InvestmentDialog` → `ResponsiveDialog`
11. Migrar `TransactionDialog` → `ResponsiveDialog`
12. Migrar `AlertDialog` → `ResponsiveDialog`
13. `Investments.tsx` dual render + `Investments.test.tsx`
14. Verificação manual em 375/768/1024/1440
