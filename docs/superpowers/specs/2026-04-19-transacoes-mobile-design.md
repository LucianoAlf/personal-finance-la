# Transações Mobile Redesign — Plan 4 Spec

**Status:** Draft — aguardando revisão do usuário antes do plano de implementação
**Created:** 2026-04-19
**Author:** Luciano + Claude (brainstorming session)
**Skill chain:** `superpowers:brainstorming` → `ui-ux-pro-max` (ativa) → `superpowers:writing-plans` (próxima)
**Depends on:** Plan 1 (shell, merged) + Plan 3 (Dashboard mobile + Header responsivo, merged)

---

## 1. Problema

A página `/transacoes` já usa Cards em vez de tabela (vantagem arquitetural), mas o layout mobile hoje tem três problemas práticos:

1. **Filter bar** (input de busca + botão Filtros) pode estourar a viewport em 375px; a ordem e a largura dos elementos não foi pensada para mobile.
2. **Summary cards** (4 KPIs no topo) ficam em 1 coluna no mobile — ocupam ~260px verticais antes do usuário ver qualquer transação.
3. **Modais de formulário** — `AdvancedFiltersModal` (filtros avançados) e `TransactionDialog` (criar/editar) são Radix Dialogs centralizadas; em mobile parecem "web desktop encaixotada", desperdiçam laterais e cabem menos campos.

**Objetivo:** tornar a página de Transações genuinamente usável em iPhone SE (375×667), aproveitando a tela inteira para modais-formulário e compactando o summary, sem quebrar o desktop.

### Fora de escopo
- Virtualização da lista (não crítica hoje — lista tipicamente < 100 items no mês)
- Swipe actions nos cards (editar/excluir)
- Bulk actions (seleção múltipla)
- Mudança de cores, tipografia, iconografia
- Adição de campos novos aos forms

### ⚠ Restrição forte — desktop NÃO muda
Desktop foi validado visualmente no Plan 3 e está em produção local. **Nenhuma mudança que altere pixel de desktop (≥ 1024px) é aceita.** Toda transformação mobile deve seguir um destes padrões:

1. **Nova classe responsive** que SÓ afeta `< lg` (ex: `grid-cols-2 md:grid-cols-2 xl:grid-cols-4` — as classes `md:` e `xl:` já existem e não mudam).
2. **Dual-render** (`lg:hidden` vs `hidden lg:block`) — JSX antigo preservado byte-a-byte no ramo desktop, JSX novo no ramo mobile.

Em caso de dúvida se uma mudança afeta desktop, escolha dual-render. Plan 3 já estabeleceu este pattern — seguir exatamente o mesmo.

---

## 2. Decisões fundantes (aprovadas em brainstorming)

| # | Decisão | Escolhido |
|---|---|---|
| Q1 | Filter bar mobile | Search ocupa o flex-1 + botão ícone ⚙️ (44×44) à direita em 1 linha. Chips de filtros ativos em row abaixo. |
| Q2 | AdvancedFiltersModal | **Full-screen sheet em mobile** (< lg); Dialog centralizada no desktop (≥ lg). |
| Q3 | TransactionDialog | **Full-screen sheet em mobile** (< lg); Dialog centralizada no desktop (≥ lg). Mesmo pattern de Q2. |
| Q4 | Summary cards + rows | Summary: `grid-cols-2` no mobile (compacto, 4 cards em ~130px), `md:grid-cols-2 xl:grid-cols-4` continua valendo. Transaction row: **mobile (< lg) inline; desktop preservado byte-a-byte** — NÃO mudamos o breakpoint `xl:flex-row` existente. |
| Arq | Dual-render shared primitive | Criar `ResponsiveDialog` compartilhado (Dialog no desktop, Sheet no mobile). AdvancedFiltersModal e TransactionDialog consomem. |

---

## 3. Arquitetura

### 3.1 Novo arquivo
```
src/components/ui/responsive-dialog.tsx          # primitivo compartilhado: Dialog ≥ lg / Sheet < lg
src/components/ui/responsive-dialog.test.tsx     # cobre switch entre Dialog e Sheet
```

### 3.2 Arquivos modificados
```
src/pages/Transacoes.tsx                              # filter bar (search + icon), summary grid-cols-2 mobile, row breakpoint xl→lg
src/components/transactions/AdvancedFiltersModal.tsx  # consome ResponsiveDialog
src/components/transactions/AdvancedFiltersModal.test.tsx  # mobile full-screen assertion
src/components/transactions/TransactionDialog.tsx     # consome ResponsiveDialog
src/pages/Transacoes.test.tsx                         # atualiza filter bar test + adiciona summary grid test
```

### 3.3 `ResponsiveDialog` API

```tsx
interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function ResponsiveDialog(props: ResponsiveDialogProps): JSX.Element;
export function ResponsiveDialogHeader(props: {
  title: string;
  description?: string;
  onClose?: () => void;  // mobile shows a back/close icon
}): JSX.Element;
export function ResponsiveDialogBody(props: { children: ReactNode }): JSX.Element;
export function ResponsiveDialogFooter(props: { children: ReactNode }): JSX.Element;
```

Internamente:
- Renderiza `<Dialog>` do shadcn em `hidden lg:flex`
- Renderiza `<Sheet side="bottom">` (full-screen) em `lg:hidden`
- Mesmo conteúdo, dois wrappers

Visibility classes no próprio `ResponsiveDialog`:
- Desktop: Dialog centralizada com `max-w-2xl` (reaproveita o que os modais já usam)
- Mobile: Sheet full-screen — `h-[100dvh] w-full` + `rounded-t-none` (sem rounded-top em full-screen)

Header sticky (bg-surface, border-b), Body scroll, Footer sticky (bg-surface, border-t).

### 3.4 Regras de visibilidade

| Elemento | Mobile (< lg) | Desktop (≥ lg) |
|---|---|---|
| Filter bar (Search + icon btn) | `flex gap-2` com search `flex-1`, btn 44×44 | `flex gap-3` com search max-w-md, Filter button texto visível |
| Active filter chips | `flex flex-wrap gap-2` em row abaixo | idem |
| Summary grid | `grid-cols-2 gap-3` | `md:grid-cols-2 xl:grid-cols-4 gap-6` |
| TransactionSummaryCard layout | vertical compacto (icon top, val center) | atual (icon left, val+supporting right) |
| Transaction row card layout | `flex items-center` (inline, cabe em 320px) | **Inalterado** — mantém atual: stack até xl, inline em ≥ xl |
| AdvancedFiltersModal | Sheet full-screen | Dialog centralizada |
| TransactionDialog | Sheet full-screen | Dialog centralizada |

### 3.5 Dependências

```
ResponsiveDialog (new, primitive)
  ├── consumed by AdvancedFiltersModal (Transacoes only)
  └── consumed by TransactionDialog (Dashboard, Transacoes, MainLayout, others)

Transacoes.tsx (refactored)
  ├── Filter bar: Input (flex-1) + IconButton (Filter, lg:hidden) + DesktopFilterButton (hidden lg:inline)
  ├── Summary grid: grid-cols-2 base + md:grid-cols-2 + xl:grid-cols-4
  └── Transaction rows: mobile `flex-row` (inline) via override contained in `lg:hidden` branch; desktop `hidden lg:flex` branch preserves today's JSX byte-for-byte (stack lg, inline xl)
```

---

## 4. Wireframes ASCII

### 4.1 Mobile (< 1024px)
```
+-------------------------------------------+
| 📋 Transações                      [👤]  |  Header row 1
+-------------------------------------------+
| Gerencie receitas...    [+Rec][+Desp] →   |  Header row 2 (actions overflow-x)
+===========================================+
|                                           |
|  ┌────────┐  ┌────────┐                   |
|  │📈 R.   │  │📉 Desp │                   |
|  │R$ 10k  │  │R$ 2.9k │                   |  Summary 2×2 compacto
|  └────────┘  └────────┘                   |
|  ┌────────┐  ┌────────┐                   |
|  │💰 Saldo│  │🔢 Tot. │                   |
|  │R$ 7k   │  │12 tx   │                   |
|  └────────┘  └────────┘                   |
|                                           |
|  [🔍 Buscar transação     ] [⚙️ 2]       |  Filter bar 1 row
|                                           |
|  [Alim ✕] [Nubank ✕]  [Limpar]           |  Active chips row
|                                           |
|  ┌─────────────────────────────────────┐ |
|  │🛒 iFood   Alim · Nubank · Hoje  −R$45│ |  Card inline
|  └─────────────────────────────────────┘ |
|  ... (virtualização se necessário futuro) |
+===========================================+
| 🏠 📋 🤖 🧾 ☰   (bottom nav)               |
+-------------------------------------------+
```

### 4.2 Desktop (≥ 1024px) — INALTERADO
```
+-----------------------------------------------------+
| 📋 Transações                [+Rec][+Desp][👤]    |  Header row 1 inline
|    Gerencie receitas, despesas e transferências     |
+-----------------------------------------------------+
| ┌───────┐┌───────┐┌───────┐┌───────┐                |
| │Receitas││Despesas││Saldo  ││Total  │ ...          |  Summary 4-col
| │R$ 10k ││R$ 2.9k││R$ 7k  ││12 tx  │                |
| └───────┘└───────┘└───────┘└───────┘                |
|                                                     |
| [🔍 Buscar ________________ ] [⚙️ Filtros (2)]      |  Filter bar
|                                                     |
| [Alim ✕] [Nubank ✕] [Limpar]                       |
|                                                     |
| ┌──────────────────────────────────────────────────┐|
| │🛒  iFood  Alim · Nubank · Hoje          −R$ 45 │  |  Row inline desde lg
| └──────────────────────────────────────────────────┘|
+-----------------------------------------------------+
```

### 4.3 Full-screen sheet (AdvancedFiltersModal / TransactionDialog em mobile)
```
+-------------------------------------------+
| ← Filtros Avançados           [Aplicar]  |  Header sticky (48px)
+===========================================+
| PERÍODO                                   |
| [ Mar 2026 → Abr 2026              ]     |
|                                           |
| TIPO                                      |
| [Receita] [Despesa] [Transferência]       |
|                                           |
| CATEGORIAS                                |
| [Alimentação] [Transporte] [Lazer] ...    |
|                                           |  Body scroll
| CONTAS                                    |
| [Nubank] [Itaú] [C6] ...                  |
|                                           |
| STATUS                                    |
| [Pago] [Pendente]                         |
|                                           |
| TAGS                                      |
| [+ adicionar tags]                        |
+===========================================+
|  [Limpar tudo]          [Aplicar filtros] |  Footer sticky
+-------------------------------------------+
```

---

## 5. Regras ui-ux-pro-max aplicadas

- **Prio 2 `touch-target-size`**: botão ⚙️ (44×44), close button do sheet (44×44)
- **Prio 2 `progressive-disclosure`**: filtros avançados em sheet; search acessível direto
- **Prio 5 `content-priority`**: summary compacto prioriza a lista de transações
- **Prio 5 `mobile-first`**: todos os defaults são mobile
- **Prio 5 `horizontal-scroll`**: zero scroll horizontal em 320–1920px
- **Prio 8 `form-autosave`** (nice-to-have): avaliar no Plan 4 se vale confirmação de descarte no TransactionDialog
- **Prio 8 `sheet-dismiss-confirm`**: full-screen sheet com campos sujos → confirmar descarte (sub-nice, avaliar no Plan)
- **Prio 9 `modal-escape`**: ambos os modais respondem a Escape e botão ✕/Voltar

---

## 6. Testes

### 6.1 Novos
- `responsive-dialog.test.tsx`: renderiza Dialog em desktop (simulado via classe); renderiza Sheet em mobile; header/body/footer slots funcionam; Escape fecha.

### 6.2 Atualizados
- `AdvancedFiltersModal.test.tsx`: após refactor para ResponsiveDialog — confirma que em mobile renderiza como Sheet (busca por classes `h-[100dvh]` ou data-testid do sheet); desktop continua Dialog.
- `TransactionDialog.test.tsx`: mesma assertion adaptada.
- `Transacoes.test.tsx`:
  - Filter bar: assertion de que o botão Filter (mobile-only visible) tem `lg:hidden` ou equivalente e aria-label correto.
  - Summary grid: assert que o grid tem `grid-cols-2` em classes.

### 6.3 Regressão
- Desktop visual: snapshot manual (eyeball) antes/depois em 1440px.
- Suite completa continua rodando — baseline de 4-7 falhas pre-existentes calendar/ticktick mantém.

---

## 7. Rollout

Tasks sequenciadas:

| # | Task | Depende de |
|---|---|---|
| 1 | Criar `ResponsiveDialog` primitive (TDD) | — |
| 2 | Refactor `AdvancedFiltersModal` para usar ResponsiveDialog | 1 |
| 3 | Refactor `TransactionDialog` para usar ResponsiveDialog | 1 |
| 4 | Refactor `Transacoes.tsx` filter bar (search + icon button) | — |
| 5 | Refactor `Transacoes.tsx` summary grid (grid-cols-2 mobile) | — |
| 6 | Refactor `Transacoes.tsx` row card breakpoint (xl → lg) | — |
| 7 | Atualizar testes | 1-6 |
| 8 | Manual verification (iPhone SE, iPad, desktop 1440) | 1-7 |

Tasks 1, 4, 5, 6 podem ser paralelizadas entre subagents. Tasks 2, 3 dependem de 1. Task 7 consolida.

---

## 8. Critérios de aceite

- [ ] Filter bar 1 row em todos os viewports mobile (320–1023px); zero overflow
- [ ] Botão ⚙️ mobile mostra badge de contagem de filtros ativos
- [ ] AdvancedFiltersModal: full-screen em < lg; dialog em ≥ lg
- [ ] TransactionDialog: full-screen em < lg; dialog em ≥ lg
- [ ] Summary cards: 2-col em < md; 2-col em md; 4-col em ≥ xl (1280)
- [ ] Summary cards altura ≤ 130px total no iPhone SE
- [ ] Transaction row mobile (< lg): icon + info + valor em 1 row inline; desktop mantém stack até xl (inalterado)
- [ ] Desktop 1440: visual pixel-idêntico ao atual (eyeball + Sidebar test intacto)
- [ ] Testes existentes passam; 3 novos testes cobrem os novos comportamentos
- [ ] Escape fecha os modais em ambos os viewports
- [ ] Tap targets ≥ 44×44

---

## 9. Detalhes resolvidos
1. **`ResponsiveDialog` primitive centraliza a lógica** de Dialog-vs-Sheet — evita duplicar código entre `AdvancedFiltersModal` e `TransactionDialog`.
2. **Summary grid 2-col fixo no mobile** — `grid-cols-2` em < md (inclui iPhone SE e Android típicos), `md:grid-cols-2` (mantém), `xl:grid-cols-4` (4 cards em desktop wide).
3. **TransactionSummaryCard interno**: re-orientar conteúdo (icon no topo, label abaixo, value embaixo) em mobile para ficar compacto. Desktop mantém layout horizontal.
4. **Transaction row breakpoint**: **desktop preservado byte-a-byte** (stack até xl, inline em ≥ xl). Solução: dual-render — `lg:hidden` envolve a versão mobile inline; `hidden lg:flex` envolve a versão desktop atual (stack xl:flex-row) sem mudar uma classe. Isso garante zero regressão no zone 1024–1279px.
5. **MonthSelector**: continua via header actions (herda do Plan 3, row 2 mobile).
6. **Acesso ao TransactionDialog**: desktop mantém "Nova Receita"/"Nova Despesa" como actions; mobile herda do header row 2 (Plan 3 já resolve) e FAB "+" no bottom nav (Plan 1 já resolve).

---

## 10. Próximo passo

Invocar `superpowers:writing-plans` para transformar este spec em plano de implementação com 8 tasks TDD. Após aprovação e execução, seguem Plans 5 (Conciliação — sub-brainstorm necessário, tabs swipeable já travados), 6 (Contas a Pagar), 7 (Agenda), 8 (lote Cartões/Metas/Investimentos/Relatórios), 9 (utilitárias).
