# Metas Mobile — Design Doc

**Status:** Approved — ready for implementation plan
**Created:** 2026-04-21
**Author:** Luciano + Claude (brainstorming session)
**Parent spec:** [2026-04-19-mobile-first-responsive-redesign.md](./2026-04-19-mobile-first-responsive-redesign.md) — §6.3 Metas

---

## 1. Problema

A página Metas (`/metas`, componente `src/pages/Goals.tsx` com 1.219 linhas) é a página mais multi-faceta do app:

- 5 abas via Radix Tabs: Economia · Gastos · Investimentos · Progresso · Configurações
- 4 hero stat cards no topo (Economia, Controle, Investimentos, Planejamento)
- Goal cards com barra de progresso (savings, spending_limit, investment)
- Aba Gastos tem month selector + budget summary + insights + cards
- Aba Progresso tem gamification (XP, conquistas, streak heatmap)
- Aba Configurações com formulários de renda, ciclos financeiros, etc.
- 5 dialogs Radix puros: `CreateGoalDialog`, `EditGoalDialog`, `AddValueDialog`, `InvestmentGoalDialog`, `ContributionDialog` — mesmo padrão que travou Cartões
- 1 drawer (`CategoryTransactionsDrawer`) usando shadcn `Sheet` lateral

Em < 1024px:
- `Tabs` `grid-cols-5` esmaga os labels.
- Os 4 stat cards ocupam ~250px verticais antes de qualquer conteúdo.
- Heatmap de streak (grid 7×52) é inviável em 375px.
- Drawer lateral cobre 80% da tela e é desconfortável.

**Objetivo:** redesenhar o mobile mantendo as 5 abas com gamification simplificada, dialogs migrados, sem alterar lógica de negócio. Desktop pixel-idêntico.

### Fora de escopo

- Mudança em tipos (`FinancialGoalWithCategory`, `InvestmentGoal`, etc.).
- Mudança em hooks (`useGoals`, `useInvestmentGoals`, `useGamification`, `useSpendingGoalsPlanning`).
- Redesenhar profundamente o streak heatmap — fica como placeholder "Veja no desktop".
- Mudanças visuais em desktop.
- Novos tipos de meta, novas conquistas, nova lógica de XP.

---

## 2. Decisões fundantes (aprovadas em brainstorming visual)

| # | Decisão | Escolhido | Justificativa |
|---|---|---|---|
| Q1 | Escopo do redesign | **5 abas com gamification simplificada** (Opção C) | Todas operacionais; só o streak heatmap fica desktop-only. |
| Q2 | Hero card mobile | **Sumário multi-categoria** (Opção B) | 4 linhas key/value: Economia · Limites · Investimentos · Streak. Sempre visível, independente da aba. |
| Q3 | Navegação entre 5 abas | **`SlidingPillTabs` com labels compactados** (Econ · Gastos · Invest · Progr · Config) | Mesmo padrão de Investimentos/Cartões/Agenda. |
| Q4 | Default tab no mobile | **Economia** (mesma do desktop atual) | Operacional + ponto de entrada natural. |
| Q5 | Persistência da aba ativa | **`localStorage['metas-active-tab']`** | Padrão idêntico ao `useInvestmentsActiveTab` / `useAgendaViewMode`. |
| Q6 | Goal cards | **Card com border-left colorido + progress bar + % badge** | Verde=economia (savings), Laranja=limite gasto (spending_limit), Azul=investimento. Cores semânticas para % (verde no caminho, laranja atenção, vermelho estourou). |
| Q7 | Dialogs | **Migrar 5 dialogs para `ResponsiveDialog`** (`CreateGoalDialog`, `EditGoalDialog`, `AddValueDialog`, `InvestmentGoalDialog`, `ContributionDialog`) | Previne freeze de portal. |
| Q8 | `CategoryTransactionsDrawer` | **Manter shadcn Sheet — mas trocar de `side="right"` para `side="bottom"` no mobile** | Slide lateral em 375px é ruim; bottom sheet é nativo. |
| Q9 | Aba Gastos | **Month selector pill + budget summary 2-col + cards spending_limit** | Mantém estrutura mas adapta para empilhar verticalmente. |
| Q10 | Aba Investimentos | **Reusa cards do mesmo padrão dos savings, mas com border-left azul** | Investment goals já têm metrics próprios (current/target/percentage). |
| Q11 | Aba Progresso | **XP card hero (gradient roxo) + grid 4-col de conquistas + placeholder "Heatmap no desktop"** | Mantém motivação sem o heatmap impossível em 375px. |
| Q12 | Aba Configurações | **Formulário existente, com seções colapsáveis para caber em mobile** | Menor esforço; settings têm múltiplas seções (Renda, Ciclos, etc.). |
| Q13 | Margens laterais | **`mx-2` / `px-2`** | Consistente com Investimentos e Dashboard. |
| Q14 | Botão "Nova Meta" | **Ícone `+` no header (label oculto)** | Padrão dos outros mobile; usa o dropdown existente para escolher tipo. |

---

## 3. Arquitetura

### 3.1 Árvore de arquivos

#### Novos

```
src/components/goals/
  GoalsHeroCard.tsx                # Hero multi-categoria (Economia · Limites · Investimentos · Streak)
  GoalsHeroCard.test.tsx
  SavingsGoalCardList.tsx          # Lista mobile de savings goals (cards com progress bar)
  SavingsGoalCardList.test.tsx
  SpendingGoalCardList.tsx         # Lista mobile de spending limits (cards laranja)
  SpendingGoalCardList.test.tsx
  InvestmentGoalCardList.tsx       # Lista mobile de investment goals (cards azuis)
  InvestmentGoalCardList.test.tsx
  GamificationMobileLayout.tsx     # XP card + achievements grid + heatmap placeholder
  GamificationMobileLayout.test.tsx
  SpendingMonthSelector.tsx        # Month pill ‹ Janeiro 2026 › para a aba Gastos
  SpendingMonthSelector.test.tsx
  GoalsConfigMobileLayout.tsx      # Configurações com seções colapsáveis
  GoalsConfigMobileLayout.test.tsx

src/hooks/
  useGoalsActiveTab.ts             # Persiste aba ativa em localStorage
  __tests__/useGoalsActiveTab.test.ts
```

#### Modificados

```
src/pages/
  Goals.tsx                         # Dual render desktop/mobile
  Goals.test.tsx                    # Cobre ambos os paths

src/components/goals/
  CreateGoalDialog.tsx              # ResponsiveDialog
  CreateGoalDialog.test.tsx
  EditGoalDialog.tsx                # ResponsiveDialog
  EditGoalDialog.test.tsx
  AddValueDialog.tsx                # ResponsiveDialog
  AddValueDialog.test.tsx
  CategoryTransactionsDrawer.tsx    # side="right" → side="bottom" no mobile

src/components/investment-goals/
  InvestmentGoalDialog.tsx          # ResponsiveDialog
  InvestmentGoalDialog.test.tsx
  ContributionDialog.tsx            # ResponsiveDialog
  ContributionDialog.test.tsx
```

#### Preservados (zero mudança)

```
src/components/goals/
  SavingsGoalCard.tsx              # Reusado pela versão desktop
  SpendingGoalCard.tsx             # Desktop
  GoalProgress.tsx
  GoalBadges.tsx
  GoalStats.tsx
  GoalSegmentedControl.tsx
  GoalTabs.tsx
  GoalsSummaryWidget.tsx           # Hero/summary do desktop

src/components/investment-goals/
  InvestmentGoalCard.tsx           # Desktop only

src/hooks/
  useGoals.ts
  useInvestmentGoals.ts
  useSpendingGoalsPlanning.ts
  useGamification.ts
  useSettings.ts
```

### 3.2 Regras de visibilidade

| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| `GoalsHeroCard` | visível acima das abas | `hidden` |
| `GoalsSummaryWidget` (4 stat cards) | `hidden` | visível |
| `SlidingPillTabs` | visível | `hidden` |
| `Tabs` (Radix, atual) | `hidden` | visível |
| `SavingsGoalCardList` | tab=savings | `hidden` |
| Grid de `SavingsGoalCard` | `hidden` | tab=savings |
| `SpendingGoalCardList` + `SpendingMonthSelector` | tab=spending | `hidden` |
| Grid de `SpendingGoalCard` (desktop) | `hidden` | tab=spending |
| `InvestmentGoalCardList` | tab=investments | `hidden` |
| Grid de `InvestmentGoalCard` | `hidden` | tab=investments |
| `GamificationMobileLayout` | tab=progress | `hidden` |
| Bloco gamification existente (XP+heatmap+achievements) | `hidden` | tab=progress |
| `GoalsConfigMobileLayout` | tab=config | `hidden` |
| Form de configurações desktop | `hidden` | tab=config |
| Botão "Nova Meta" no header | ícone `+` (label oculto) | label completo |
| `CategoryTransactionsDrawer` | `side="bottom"` | `side="right"` |

### 3.3 Estado da página

Substitui:
```ts
const [activeTab, setActiveTab] = useState<GoalsTab>('savings');
```

por:
```ts
const [activeTab, setActiveTab] = useGoalsActiveTab('savings');
```

Outros estados (`createDialogOpen`, `editingGoal`, `addValueGoal`, `selectedMonth`, etc.) ficam intactos.

### 3.4 Hook `useGoalsActiveTab`

Mesmo padrão do `useInvestmentsActiveTab`:

```ts
export type GoalsTab = 'savings' | 'spending' | 'investments' | 'progress' | 'config';

const STORAGE_KEY = 'metas-active-tab';
const VALID: ReadonlySet<GoalsTab> = new Set([
  'savings', 'spending', 'investments', 'progress', 'config',
]);

export function useGoalsActiveTab(defaultTab: GoalsTab = 'savings') {
  const [tab, setTab] = useState<GoalsTab>(() => readStored(defaultTab));
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);
  return [tab, setTab] as const;
}
```

---

## 4. Wireframes aprovados

### 4.1 Aba Economia (default)

```
+-----------------------------+
| Metas                  [+]  |   header + Nova Meta (icon)
+=============================+
| ┌─────────────────────────┐ |
| │ 🏆 Suas Metas           │ |   hero multi-categoria
| │ Janeiro 2026            │ |
| │ ─────────               │ |
| │ 💰 Economia  R$ 7.500/25k │
| │ 📊 Limites   3 / 5 OK    │
| │ 📈 Invest    R$ 50k/100k │
| │ 🔥 Streak    14 dias     │
| └─────────────────────────┘ |
+-----------------------------+
| [Econ] Gastos Invest Progr…|   SlidingPillTabs (5)
+=============================+
| ┃✈️ Viagem Europa     42%   |
| ┃▰▰▰▰▱▱▱▱▱▱              |   barra verde
| ┃R$ 4.200 / R$ 10.000  180d|
| ─────                       |
| ┃💻 Notebook novo     75%   |
| ┃▰▰▰▰▰▰▰▰▱▱              |
| ┃R$ 3.300 / R$ 4.400   30d |
+-----------------------------+
```

### 4.2 Aba Gastos

```
+-----------------------------+
| (hero card)                 |
| Econ [Gastos] Invest Progr…|
+=============================+
|     ‹ Janeiro 2026 ›        |   month selector pill
+=============================+
| ┌────────┐ ┌────────┐       |
| │ Gasto  │ │ Limite │       |   budget summary 2-col
| │R$2.948 │ │R$4.500 │       |
| └────────┘ └────────┘       |
+=============================+
| ┃🍔 Alimentação       112%  |   border-left laranja
| ┃▰▰▰▰▰▰▰▰▰▰              |   barra estourou
| ┃R$ 670 / R$ 600  +R$70 acima
| ─────                       |
| ┃⛽ Transporte         58%   |
| ┃▰▰▰▰▰▰▱▱▱▱              |
| ┃R$ 290 / R$ 500  resta R$210
+-----------------------------+
```

### 4.3 Aba Investimentos

```
+-----------------------------+
| (hero card)                 |
| Econ Gastos [Invest] Progr…|
+=============================+
| ┃🏠 Casa própria       50%  |   border-left azul
| ┃▰▰▰▰▰▱▱▱▱▱              |
| ┃R$ 50.000 / R$ 100.000     |
| ─────                       |
| ┃👴 Aposentadoria      12%  |
| ┃▰▰▱▱▱▱▱▱▱▱              |
| ┃R$ 60.000 / R$ 500.000     |
+-----------------------------+
```

Tap num card abre `InvestmentGoalDialog` em modo edit ou navega para `/investimentos?goalId=X`.

### 4.4 Aba Progresso

```
+-----------------------------+
| (hero card)                 |
| Econ Gastos Invest [Progr]…|
+=============================+
| ┌─────────────────────────┐ |
| │ 🏆  Nível 7 · Disciplinado│
| │     2.345 XP             │
| │     🔥 14 dias de streak │
| │ ▰▰▰▰▰▰▰▱▱▱              │
| │ 655 XP até o próximo     │
| └─────────────────────────┘ |
+=============================+
| CONQUISTAS                  |
| ┌──┐ ┌──┐ ┌──┐ ┌──┐         |
| │🎯│ │🔥│ │💰│ │🏔│         |   grid 4×N
| └──┘ └──┘ └──┘ └──┘         |
| ┌──┐ ┌──┐ ┌──┐ ┌──┐         |
| │💎│ │⚡│ │🌟│ │👑│         |
| └──┘ └──┘ └──┘ └──┘         |
+=============================+
| ╭───────────────────────╮   |
| │ 🖥️  Heatmap de streak │   |   placeholder
| │   Veja no desktop      │   |
| ╰───────────────────────╯   |
+-----------------------------+
```

### 4.5 Aba Configurações

```
+-----------------------------+
| (hero card)                 |
| Econ Gastos Invest Progr [Config]
+=============================+
| ▼ Renda mensal             |   seção colapsável
|   [ R$ 8.500,00 ]           |
+-----------------------------+
| ▼ Ciclos financeiros        |
|   [ form atual aninhado ]   |
+-----------------------------+
| ▶ Notificações              |   colapsada
+-----------------------------+
```

### 4.6 Dialog migrado (CreateGoalDialog em mobile)

```
+-----------------------------+
| Nova Meta              [X]  |
+=============================+
| TIPO                        |
| [ 💰 Economia ] [📊 Limite ]|
|                             |
| NOME                        |
| [ Viagem Europa            ]|
|                             |
| VALOR OBJETIVO              |
| [ R$ 10.000,00             ]|
|                             |
| PRAZO                       |
| [ 31/12/2026               ]|
|                             |
| ─────                       |
| [ Cancelar ] [ Criar meta ] |
+-----------------------------+
```

Full-screen no mobile via `ResponsiveDialog` (mesma exper. de Investimentos/Cartões).

---

## 5. Componentes novos — contratos

### 5.1 `GoalsHeroCard`

```tsx
interface GoalsHeroCardProps {
  monthLabel: string;                  // "Janeiro 2026"
  savingsCurrent: number;
  savingsTarget: number;
  spendingLimitsOk: number;            // 3 (out of 5)
  spendingLimitsTotal: number;         // 5
  investmentsCurrent: number;
  investmentsTarget: number;
  streakDays: number;
  formatCurrency: (v: number) => string;
}
```

Card gradient azul-escuro com ícone trofeu no canto superior direito; 4 linhas key/value abaixo.

### 5.2 `SavingsGoalCardList`

```tsx
interface SavingsGoalCardListProps {
  goals: FinancialGoalWithCategory[];   // só goal_type === 'savings'
  onCardTap: (goal: FinancialGoalWithCategory) => void;
  onAddValue: (goal: FinancialGoalWithCategory) => void;
  formatCurrency: (v: number) => string;
}
```

Cada card: ícone + nome + % badge + barra verde + "R$ atual / R$ alvo" + dias restantes. Tap no card dispara `onCardTap` (página decide entre abrir `EditGoalDialog` ou ir para detalhes). Botão "Adicionar valor" inline aparece em todos os cards de status `active`; dispara `onAddValue`.

### 5.3 `SpendingGoalCardList`

```tsx
interface SpendingGoalCardListProps {
  goals: FinancialGoalWithCategory[];   // só goal_type === 'spending_limit'
  onCardTap: (goal: FinancialGoalWithCategory) => void;
  formatCurrency: (v: number) => string;
}
```

Card border-left laranja. % badge muda de cor: verde (<80%), laranja (80-100%), vermelho (>100%). Mostra "+R$ X acima" quando estourou.

### 5.4 `InvestmentGoalCardList`

```tsx
interface InvestmentGoalCardListProps {
  goals: InvestmentGoal[];
  onCardTap: (goal: InvestmentGoal) => void;
  formatCurrency: (v: number) => string;
}
```

Card border-left azul. Mostra current_amount/target_amount + percentage. Tap abre `InvestmentGoalDialog` ou navega para `/investimentos?goalId=X`.

### 5.5 `SpendingMonthSelector`

```tsx
interface SpendingMonthSelectorProps {
  selectedMonth: Date;
  onChange: (next: Date) => void;
}
```

Pill horizontal "‹ Janeiro 2026 ›" com prev/next. Reusa lógica do month selector existente do desktop.

### 5.6 `GamificationMobileLayout`

```tsx
interface GamificationMobileLayoutProps {
  level: number;
  levelName: string;          // "Disciplinado"
  xp: number;
  xpToNextLevel: number;
  xpProgressPct: number;      // 0-100
  streakDays: number;
  achievements: Achievement[]; // { id, icon, name, unlocked }
}
```

XP card hero + grid 4-col de achievements + `DesktopOnlyWidgetCard` (já existe em `src/components/investments/`) para o heatmap.

### 5.7 `GoalsConfigMobileLayout`

```tsx
interface ConfigSection {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

interface GoalsConfigMobileLayoutProps {
  sections: ConfigSection[];
}
```

Renderiza cada seção como `<details open={section.defaultOpen}>` HTML5 (acessibilidade nativa, sem dependência extra). A página passa as seções já renderizadas (Renda, Ciclos, Notificações, etc.) como `children` de cada `ConfigSection`.

### 5.8 `useGoalsActiveTab`

Ver §3.4.

---

## 6. Mudanças nos componentes existentes

### 6.1 5 dialogs → `ResponsiveDialog`

Mesma transformação aplicada em `InvestmentDialog`, `TransactionDialog`, `AlertDialog`:

- Remove imports `Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter` de `@/components/ui/dialog`.
- Adiciona `ResponsiveDialog/ResponsiveDialogHeader/ResponsiveDialogBody` de `@/components/ui/responsive-dialog`.
- Extrai `dialogTitle` para const.
- Substitui shell por `<ResponsiveDialog>` → `<ResponsiveDialogHeader>` → `<ResponsiveDialogBody>`.
- Preserva forms intactos.
- Atualiza testes existentes com `vi.mock('@/components/ui/responsive-dialog', ...)`.

### 6.2 `CategoryTransactionsDrawer.tsx`

Hoje usa `<Sheet>` com `side="right"`. Mudar para detectar viewport (via classe Tailwind ou um pequeno wrapper) e usar `side="bottom"` quando mobile. Implementação simplificada: passar `side` dinamicamente baseado em `useMediaQuery('(min-width: 1024px)')`. Se for `false` → `side="bottom"`.

### 6.3 `Goals.tsx` (`/metas`)

- Substitui `useState('savings')` por `useGoalsActiveTab('savings')`.
- Wrap do `GoalsSummaryWidget` em `hidden lg:block`.
- Wrap do `<Tabs>` Radix em `hidden lg:block`.
- Adiciona subtree `<div className="lg:hidden">` com:
  - `<GoalsHeroCard {...} />`
  - `<SlidingPillTabs ... />`
  - 5 conditional renders (`SavingsGoalCardList`, `SpendingMonthSelector + SpendingGoalCardList`, `InvestmentGoalCardList`, `GamificationMobileLayout`, `GoalsConfigMobileLayout`).
- Header actions: botão "Nova Meta" vira ícone `+` no mobile (label `hidden sm:inline`).

---

## 7. Z-index ladder

- `z-0` conteúdo
- `z-30` FAB global (já existe)
- `z-40` bottom nav + overlay do CategoryTransactionsDrawer mobile
- `z-50` `ResponsiveDialog` (5 dialogs migrados)

Alinhado ao spec mestre.

---

## 8. Acessibilidade

- `role="tablist"` e `aria-selected` no `SlidingPillTabs` (já garantido).
- `role="list"` + `role="listitem"` em todas as listas.
- Hero card: `aria-label="Resumo de metas"`.
- `progressbar` role + `aria-valuenow`/`aria-valuemax` nas barras de progresso.
- Achievement cards: `aria-label="{name} — {desbloqueada/bloqueada}"`.
- Tap targets ≥ 44×44px nos cards e botões.
- `aria-current="page"` na pill da aba ativa.
- `<details>` HTML5 nas seções de configurações é nativamente acessível.

---

## 9. Testes

### 9.1 Unidade — componentes novos

- `GoalsHeroCard.test.tsx`: renderiza 4 linhas key/value, formata currency, ícone trofeu.
- `SavingsGoalCardList.test.tsx`: empty state, % badge cores semânticas, barra de progresso, tap dispara onCardTap, botão Adicionar valor dispara onAddValue.
- `SpendingGoalCardList.test.tsx`: border-left laranja, % badge muda cor por threshold (<80 verde, 80-100 laranja, >100 vermelho), mostra "+R$ X acima" quando estourado.
- `InvestmentGoalCardList.test.tsx`: border-left azul, tap dispara onCardTap, formatação correta.
- `SpendingMonthSelector.test.tsx`: prev/next disparam onChange com Date corretamente.
- `GamificationMobileLayout.test.tsx`: XP card mostra level/name/xp/streak, grid de achievements distingue unlocked/locked, placeholder heatmap presente.
- `GoalsConfigMobileLayout.test.tsx`: seções colapsáveis abrem/fecham, conteúdo das seções renderiza.
- `useGoalsActiveTab.test.ts`: default, leitura válida, fallback inválido, persiste, SSR-safe.

### 9.2 Integração — `Goals.test.tsx`

- Desktop: `Tabs` Radix + `GoalsSummaryWidget` + grid de cards.
- Mobile: `GoalsHeroCard` + `SlidingPillTabs` + componente mobile da aba ativa.
- Trocar de aba persiste em localStorage.
- Abrir cada dialog migrado.

### 9.3 Regressão desktop

- Todos os testes existentes (`Goals.test.tsx`, `GoalsDialogsPremiumShell.test.tsx`, `GoalsInvestmentDialogsPremiumShell.test.tsx`) passam após as migrações para `ResponsiveDialog` (com `vi.mock` correspondente).

---

## 10. Critérios de aceite

### Mobile (< lg)

- Hero card sempre visível acima das abas.
- 5 pills (Econ · Gastos · Invest · Progr · Config) funcionando.
- Aba escolhida persiste após reload.
- Cards de meta com border-left colorido por tipo + barra de progresso.
- Aba Progresso mostra XP card, conquistas em grid, placeholder do heatmap.
- 5 dialogs abrem/fecham sem travar.
- `CategoryTransactionsDrawer` desliza de baixo.
- Tap targets ≥ 44×44px.
- `mx-2 / px-2` lateral.
- Zero scroll horizontal.

### Desktop (≥ lg)

- Pixel-idêntico à versão atual.
- Todos os testes desktop existentes passam.

---

## 11. Rollback

Commits atômicos por componente. Se algo der errado:
- `git revert <sha>` do componente problemático.
- Último recurso: revert do commit que fez a dual-render em `Goals.tsx` — volta ao Radix Tabs em todas as larguras.

---

## 12. Ordem de implementação (preview do Plan)

1. `useGoalsActiveTab` hook + teste
2. `GoalsHeroCard` + teste
3. `SavingsGoalCardList` + teste
4. `SpendingMonthSelector` + teste
5. `SpendingGoalCardList` + teste
6. `InvestmentGoalCardList` + teste
7. `GamificationMobileLayout` + teste
8. `GoalsConfigMobileLayout` + teste
9. Migrar `CreateGoalDialog` → `ResponsiveDialog`
10. Migrar `EditGoalDialog` → `ResponsiveDialog`
11. Migrar `AddValueDialog` → `ResponsiveDialog`
12. Migrar `InvestmentGoalDialog` → `ResponsiveDialog`
13. Migrar `ContributionDialog` → `ResponsiveDialog`
14. `CategoryTransactionsDrawer` — `side="right" → "bottom"` em mobile
15. `Goals.tsx` dual render + `Goals.test.tsx`
16. Verificação manual em 375/768/1024/1440

Cada passo é mergeable independentemente.
