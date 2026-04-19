# Mobile-First Responsive Redesign — Finance LA

**Status:** Draft — aguardando revisão do usuário antes do plano de implementação
**Created:** 2026-04-19
**Author:** Luciano + Claude (brainstorming session)
**Skill chain:** `superpowers:brainstorming` → `ui-ux-pro-max` (ativa) → `superpowers:writing-plans` (próxima)

---

## 1. Problema

O Finance LA foi desenvolvido desktop-first. No uso real, o usuário principal acessa **do celular no dia a dia** (registrar lançamentos, ver se a Ana Clara categorizou tudo certo, checar saldos rapidamente). Em tablet e desktop o uso é complementar.

Hoje, em larguras < 1024px, a sidebar vira um drawer acionado por hamburger — padrão desktop adaptado, não mobile-nativo. Ergonomia ruim: nav está fora do alcance do polegar, sem hierarquia de uso, sem FAB para criação rápida.

**Objetivo:** tornar o app genuinamente usável em uma mão, no celular, sem quebrar nem mudar o visual atual.

### Fora de escopo (explícito)

- Mudança de cores, tipografia, iconografia, estilo visual
- Novos componentes de negócio
- PWA / installable app
- Dark mode tweaks
- Refactor do `AnaCoachPanel` em si (só envolvemos em mobile)

---

## 2. Decisões fundantes (aprovadas em brainstorming)

| # | Decisão | Escolhido | Justificativa |
|---|---|---|---|
| Q1 | Itens do bottom navbar | **Ana Clara Central**: Dashboard · Transações · 🤖 Ana Clara · Contas a Pagar · Mais | Ana Clara é o diferencial do produto; centralizá-la reforça posicionamento. |
| Q2 | Ana Clara + "+" Criar | Ana Clara **full-screen**; "+" vira **FAB verde** flutuante (acima do nav, canto inf. dir.) | Padrão familiar (WhatsApp-like) + FAB separado é padrão Material. |
| Q3 | Pattern do "Mais" | **Bottom sheet** com grid 4×3 | Mobile-nativo, preserva contexto da tela atual, rápido entrar/sair. |
| Q4 | Breakpoint desktop | **`lg:` (≥ 1024px)** | Phones + tablets (incl. iPad portrait) usam bottom nav; sidebar só em laptop+. Reaproveita as classes `lg:*` já existentes. |
| Q5 | Wireframes no spec | **ASCII inline** | Lê no GitHub, diff fácil, versiona sem esforço. |
| Q6 | Ordem de ataque | Shell → Ana Clara → Dashboard → Transações → Conciliação → Contas a Pagar → Agenda → restantes | Garante app navegável em mobile após o primeiro passo; app utilizável a qualquer momento. |
| Arq | Organização de código | **Abordagem 2 — extrair `config/navigation.ts`** | Single source of truth; zero mudança visual em desktop. |

---

## 3. Arquitetura

### 3.1 Árvore de arquivos

#### Novos
```
src/config/
  navigation.ts                 # menuItems + moreOptionsItems + quickCreateItems

src/components/layout/
  BottomNav.tsx                 # Barra inferior (5 tabs), lg:hidden
  BottomNav.test.tsx
  MoreSheet.tsx                 # Bottom sheet grid 4×3 para o ☰
  MoreSheet.test.tsx
  QuickCreateFab.tsx            # FAB verde flutuante
  QuickCreateFab.test.tsx

src/components/ana-clara/
  AnaClaraChatScreen.tsx        # Chat full-screen mobile (wrapper do AnaCoachPanel)
  AnaClaraChatScreen.test.tsx
  useKeyboardInset.ts           # Hook para visualViewport API

src/test/
  mobileRender.ts               # Helper matchMedia mock para testes mobile
```

#### Modificados
```
src/components/layout/
  Sidebar.tsx                   # Consome config/navigation.ts (visual idêntico)
  MainLayout.tsx                # Renderiza BottomNav/FAB/AnaClaraChatScreen em lg:hidden
src/store/uiStore.ts            # + moreSheetOpen
index.html                      # + meta viewport viewport-fit=cover
```

### 3.2 Dependências entre componentes

```
navigation.ts
   ├── Sidebar.tsx        (desktop)
   ├── BottomNav.tsx      (mobile — primeiros 4 itens + ☰)
   └── MoreSheet.tsx      (mobile — remaining items)

uiStore
   ├── sidebarOpen        (desktop drawer — já existe)
   ├── anaCoachOpen       (já existe, reaproveitado)
   ├── moreSheetOpen      (novo)
   └── quickCreateOpen    (já existe — FAB dispara openQuickCreate)
```

### 3.3 Regras de visibilidade

| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| `Sidebar` | `hidden` | `flex` |
| `BottomNav` | `flex` fixed bottom-0 | `hidden` |
| `QuickCreateFab` ("+") | `flex` bottom-24 right-4 | `hidden` (sidebar tem dropdown "Novo") |
| FAB Ana Clara roxo | `hidden` (virou tab 🤖) | `flex` (existente, bottom-6 right-6) |
| `MoreSheet` | `flex` quando `moreSheetOpen` | `hidden` |
| `AnaClaraChatScreen` | full-screen quando `anaCoachOpen` | `hidden` (usa `AnaCoachPanel` lateral atual) |

### 3.4 Z-index ladder

- `z-0` conteúdo
- `z-30` FAB "+"
- `z-40` bottom nav, overlay do "Mais" (bg-black/55)
- `z-50` MoreSheet, AnaClaraChatScreen, modais Radix existentes

---

## 4. Shell layout — wireframes

### 4.1 Mobile (< 1024px), rota `/` (Dashboard ativa)

```
+-------------------------------+  <- safe-area-inset-top
| ≡  Finance LA          👤     |  header 56px
+===============================+
|                               |
|  [ conteúdo px-4 max-w-full   |
|    min-h-[calc(100dvh-        |
|    var(--header)-             |
|    var(--bottomnav))] ]       |
|                               |
|                         ╭───╮ |  FAB "+" verde
|                         │ + │ |  56×56 bottom-24 right-4
|                         ╰───╯ |  z-30
+===============================+
| 🏠    📋    🤖    🧾    ☰     |  bottom nav 64px + safe-area
| Início Lanç.  Ana A Pagar Mais|
| ▔▔▔▔                          |  indicador aba ativa
+-------------------------------+  <- safe-area-inset-bottom
```

### 4.2 Mobile, tab 🤖 Ana Clara ativa (full-screen)

```
+-------------------------------+
| ← Ana Clara             ⋯     |
+===============================+
| ◯ Oi Luciano! Entrou uma      |
|   despesa no cartão...        |
|                       você ◯  |
|          Categoriza em        |
|          Alimentação          |
| ◯ Feito! Saldo atualizado.    |
|                               |
| [  Digite uma mensagem…  ] 🎤|  input sticky bottom
+===============================+
| 🏠    📋    🤖    🧾    ☰     |  bottom nav continua visível
|                 ▔▔             |  🤖 ativo
+-------------------------------+
```

Notas:
- Bottom nav continua visível durante Ana Clara (usuário alterna rápido entre tabs).
- Quando o teclado virtual abre, o bottom nav é transladado para fora da viewport via `translateY(keyboardInset)` (detalhe técnico na §5). Quando o teclado fecha, volta.
- FAB "+" some quando `anaCoachOpen === true`.

### 4.3 Mobile, "Mais" aberto (sheet sobre a tela atual)

```
+-------------------------------+
|                               |
|      (conteúdo escurecido)    |  overlay bg-black/55 z-40
|                               |
|  ──────╭─────────╮────────     |
|        │    ━    │              drag handle
+-----------▼-------------------+
|  Mais                         |  sheet 56% altura, z-50
|                               |
|  ┌──┐ ┌──┐ ┌──┐ ┌──┐          |
|  │🛡️│ │💳│ │📅│ │🎯│          |  Concil · Cartões · Agenda · Metas
|  └──┘ └──┘ └──┘ └──┘          |
|  ┌──┐ ┌──┐ ┌──┐ ┌──┐          |
|  │📈│ │📊│ │🎓│ │🏷️│          |  Invest · Relat · Educ · Tags
|  └──┘ └──┘ └──┘ └──┘          |
|  ┌──┐ ┌──┐                    |
|  │📁│ │⚙️│                     |  Categorias · Config
|  └──┘ └──┘                    |
+===============================+
| 🏠    📋    🤖    🧾    ☰     |
|                        ▔▔     |  ☰ em estado "pressed"
+-------------------------------+
```

Card: 72×72px (≥ 44 touch), ícone 24px, label 2 linhas máx.
Fechamento: tap fora, tap handle, swipe-down, ESC.

### 4.4 Desktop (≥ 1024px) — INALTERADO

```
+--------+---------------------------------+
| ▌ Fin  |                                 |
|   LA   |  page title                     |
|        +---------------------------------+
| ⊕ Novo |                                 |
|        |  conteúdo (max-w-7xl mx-auto)   |
| 🏠 Dash|                                 |
| 💼 Cont|                                 |
| 📋 Tran|                                 |
| 🛡️ Conc|                                 |
| 💳 Cart|                                 |
| 🧾 APag|                                 |
| 📅 Agen|                                 |
| 🎯 Meta|                                 |
| 📈 Inve|                                 |
| 📊 Rela|                                 |
| 🎓 Educ|                                 |
| ⌄ Mais |                                 |
|        |                                 |
| 👤 Luci|                                 |
+--------+---------------------------------+
  256                 flex-1
```

Sidebar em coluna única, 11 itens primários + "Mais opções" expansível (Tags, Categorias, Configurações) + footer com avatar.
FAB verde "+" **não existe** no desktop (dropdown "Novo" na sidebar resolve).
FAB Ana Clara roxo continua como hoje (`bottom-6 right-6`).

---

## 5. Keyboard handling na Ana Clara

Problema: em telas pequenas (iPhone SE 375×667), o teclado virtual (~300px) + bottom nav (64px) + safe-area empurram o input pra fora da viewport.

### 5.1 Hook `useKeyboardInset`

```tsx
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return; // fallback em browsers antigos: usa env(keyboard-inset-height) em CSS
    const handler = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, gap));
    };
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);
  return inset;
}
```

### 5.2 Aplicação

- **Container da Ana Clara**: `min-h-dvh` (regra ui-ux-pro-max `viewport-units`).
- **Bottom nav**: `transform: translateY(${keyboardInset}px)` quando teclado abre → some da viewport sem alterar layout.
- **Input**: `position: sticky; bottom: 0` + `padding-bottom: env(safe-area-inset-bottom)`.
- **CSS fallback**: `@supports (bottom: env(keyboard-inset-height))` usa var nativa em iOS 17+.
- **Lista de mensagens**: `overflow-y-auto` + `scroll-padding-bottom` = altura do input para manter última mensagem visível.

Regra aplicada: `fixed-element-offset` (prio 5 do ui-ux-pro-max).

---

## 6. Playbook responsivo por página

### 6.1 Template universal

Toda página adaptada segue este molde, independente do conteúdo:

```
MOBILE (< lg)                    DESKTOP (≥ lg) — SEM MUDANÇA
+-----------------------------+  +-----+---------------------+
| header sticky 56px          |  | SB  | content (max-w-7xl) |
+-----------------------------+  |     |                     |
| PageContent                 |  |     |                     |
|  px-4 (mobile) → px-6 (desk)|  |     |                     |
|  py-4                       |  |     |                     |
|  flex flex-col gap-4        |  |     |                     |
|  - filtros: collapse/sheet  |  |     |                     |
|  - tabela → cards           |  |     |                     |
|  - grid 3col → 1col         |  |     |                     |
|  - modal → full-screen      |  |     |                     |
+-----------------------------+  |     |                     |
| bottom nav                  |  |     |                     |
+-----------------------------+  +-----+---------------------+
```

### 6.2 Transformações padrão

| Padrão desktop | Padrão mobile | Regra ui-ux-pro-max |
|---|---|---|
| `<table>` 6+ colunas | Lista de cards verticais com info primária + "ver detalhes" | `horizontal-scroll` (5) |
| Sidebar filtros à esquerda | Botão "Filtros" no header → bottom sheet | `content-priority` (5) |
| `grid-cols-3 gap-6` | `grid-cols-1 gap-3` (ou 2 em tablet-portrait) | `mobile-first` (5) |
| Dialog modal 600×400 | Full-screen sheet (slide from bottom) | `touch-friendly` (2) |
| Hover tooltip | Tap → bottom sheet com detalhe | `touch-friendly` (2) |
| Inline actions (editar/excluir) | Swipe actions OU menu ⋯ por item | `min-size 44px` (2) |
| Gráficos Recharts largos | `ResponsiveContainer` + `min-h-[240px]` + legenda abaixo | `min-size`, `chart legend` (10) |
| Breadcrumb completo | `← Título da página` | `content-priority` (5) |

**Zero mudança de cor, tipografia, iconografia ou estilo visual.**

### 6.3 Notas por página

- **Dashboard (`/`)**: KPIs viram stack vertical; gráficos em `min-h-[220px]` com legenda abaixo; widget "Ana Clara sugere…" fica no topo (diferencial).
- **Transações (`/transacoes`)**: tabela vira `VirtualList` de cards (data · descrição · categoria · valor); filtros em sheet; bulk actions em menu ⋯.
- **Conciliação (`/conciliacao`)** — **padrão decidido**: **tabs swipeable** "Banco | Sistema | Sugestões" (não stack vertical); decisões viram botões full-width. Precisa de sub-brainstorm dedicado no Passo 6 do rollout para detalhar, mas o layout macro (tabs swipeable) está **travado aqui**.
- **Contas a Pagar (`/contas-pagar`)**: cards agrupados por data (Hoje · Esta semana · Este mês); badge de alerta no header; `PayableBillsAlertBadge` também no ícone 🧾 do bottom nav.
- **Agenda (`/agenda`)**: calendário full-page → mês compacto + lista do dia (padrão Google Agenda mobile); tap no dia expande lista.
- **Cartões (`/cartoes`)**: grid de cartões → carousel horizontal com snap; fatura expandível por card.
- **Relatórios (`/relatorios`)**: gráficos em abas swipeable; export/share via bottom sheet.
- **Investimentos, Metas, Educação, LessonViewer, Tags, Categorias, Configurações, Perfil**: template direto, baixa complexidade.

Qualquer página que fugir do playbook → sub-brainstorm dedicado antes da implementação.

---

## 7. Testes

### 7.1 Novos componentes

- `BottomNav.test.tsx`: renderiza 5 itens de `navigation.ts`; tab ativa destacada; tap dispara navegação; `role="tablist"`; `aria-current` na tab ativa.
- `MoreSheet.test.tsx`: renderiza 10 itens restantes; abre/fecha via `uiStore`; Escape fecha; backdrop-click fecha; swipe-down fecha.
- `QuickCreateFab.test.tsx`: dispara `openQuickCreate` com tipo correto; escondido em `lg:`; escondido quando `anaCoachOpen` ou `moreSheetOpen`.
- `AnaClaraChatScreen.test.tsx`: abre quando `anaCoachOpen`; envolve `AnaCoachPanel` existente; hook `useKeyboardInset` aplicado; input sticky bottom.

### 7.2 Testes por página

Para cada página adaptada, adicionar 1 teste de layout mobile (via `src/test/mobileRender.ts` que faz matchMedia mock):
- Grid colapsa para 1 coluna em viewport mobile
- Tabela virou lista de cards (ausência de `<table>` no render mobile)
- Sem scroll horizontal

### 7.3 Regressão de desktop

- Testes existentes (`Sidebar.test.tsx`, `Dashboard.test.tsx`, etc.) passam byte-a-byte após refactor
- Checagem visual em 1440px: diff zero
- (Opcional futuro) Playwright em 3 viewports (375, 768, 1440) — fora do escopo do primeiro entregável

---

## 8. Rollout

### 8.1 Ordem de entrega

Cada passo é independentemente mergeable — parar em qualquer um deixa o app usável.

| # | Entrega | Gate de merge |
|---|---|---|
| 1 | `config/navigation.ts` + refactor `Sidebar.tsx` | `Sidebar.test` passa intacto |
| 2 | `BottomNav` + `QuickCreateFab` + `MoreSheet` | Testes novos verdes, `MainLayout.test` atualizado |
| 3 | `AnaClaraChatScreen` + `useKeyboardInset` | Funciona em iPhone SE (375×667) no DevTools |
| 4 | Dashboard mobile | Diff desktop = 0 |
| 5 | Transações mobile | idem |
| 6 | Conciliação mobile (sub-brainstorm + tabs swipeable) | idem |
| 7 | Contas a Pagar mobile | idem |
| 8 | Agenda mobile | idem |
| 9 | Cartões, Metas, Investimentos, Relatórios (lote) | idem |
| 10 | Educação, LessonViewer, Tags, Categorias, Configurações, Perfil | idem |

### 8.2 Rollback plan

Componentes mobile novos são renderizados dentro de `<div className="lg:hidden">`. Em caso de problema grave:
- Feature flag `VITE_MOBILE_SHELL_ENABLED=false` em `MainLayout.tsx` → volta ao comportamento atual (sidebar drawer em mobile)
- Flag existe do Passo 2 em diante; removida após todas as páginas migradas

---

## 9. Critérios de aceite globais

Aplicam a cada página adaptada. Derivados do ui-ux-pro-max:

- **Acessibilidade (prio 1)**: contraste AA ≥ 4.5:1; ícones do bottom nav com `aria-label`; foco visível; `aria-current` na tab ativa.
- **Touch (prio 2)**: tap targets ≥ 44×44px; spacing ≥ 8px; loading state em todas as ações.
- **Layout (prio 5)**: zero scroll horizontal de 320px a 1920px; `min-h-dvh`; fonte base ≥ 16px em inputs (evita iOS zoom).
- **Navigation (prio 9)**: back do browser funciona; bottom nav ≤5; deep-link para cada tab preserva estado.
- **Desktop preservado**: testes desktop passam; visual em 1440px pixel-idêntico ao atual.

---

## 10. Detalhes resolvidos

1. **Badge em Contas a Pagar**: `PayableBillsAlertBadge` aparece no 🧾 do bottom nav quando não estiver na rota (mesma lógica do sidebar).
2. **Estado durante Ana Clara full-screen**: `anaCoachOpen` é overlay, não mexe em `useLocation()`. Tab 🤖 fica destacada enquanto `anaCoachOpen === true`.
3. **FAB "+" durante Ana Clara ou MoreSheet**: `QuickCreateFab` renderiza `!anaCoachOpen && !moreSheetOpen`.
4. **Header mobile**: logo "Finance LA" na Dashboard; nome da página nas demais; avatar sempre à direita. **Tap no avatar** abre um sheet/dropdown com "Perfil" e "Sair" (espelha o comportamento do footer da sidebar desktop, já que `/perfil` não está no `menuItems`).
5. **Tablet landscape (1024px exato)**: cai em `lg:` e mostra sidebar. Aceito — reaproveita estrutura existente.
6. **Scroll restoration ao trocar de tab**: comportamento default do React Router.

---

## 11. Próximo passo

Após revisão do usuário, invocar `superpowers:writing-plans` para transformar este spec em plano de implementação com:
- Subagents por passo independente (passos 1, 2, 3 podem paralelizar; 4-10 sequenciais)
- Testes como gates entre passos
- Instruções de verificação manual (iPhone SE DevTools, iPad, 1440px)
- Sub-brainstorm agendado para Passo 6 (Conciliação) — macro já travado (tabs swipeable Banco/Sistema/Sugestões)
