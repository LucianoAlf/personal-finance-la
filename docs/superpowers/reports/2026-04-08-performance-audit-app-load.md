# Auditoria de performance — abertura de páginas (front + Supabase)

**Data:** 2026-04-08  
**Escopo:** Visão transversal com foco em **Contas a pagar** (`/contas-pagar`), como caso representativo de lentidão na abertura.  
**Método:** Rastreamento do código (sem medição em produção nesta sessão): hooks executados no mount, paralelismo vs. cascata, duplicação de chamadas, peso provável de RPC/views e UX de carregamento.

---

## 1. Resumo executivo

A lentidão percebida em **Contas a pagar** é compatível com **várias fontes simultâneas**, não com uma única query lenta:

| Área | Achado | Impacto estimado |
|------|--------|------------------|
| Front | Aba **Relatórios** monta `BillReportsDashboard`, que dispara **`get_bill_analytics`** (RPC pesada) **ainda que o usuário esteja na aba Contas** | **Alto** — trabalho e I/O do banco na primeira carga da página |
| Front | `BillReportsDashboard` chama **`usePayableBills()` de novo**, em paralelo ao hook do pai | **Alto** — **segundo `select` completo** em `payable_bills` + **segundo canal Realtime** para o mesmo usuário |
| Front | `useRecurringTrend` busca **`v_recurring_bills_trend`** no mount, processa dados e agenda **refresh a cada 5 min** | Médio a alto — view pode ser cara; custo fixo na abertura |
| Front | `useCategories` + `useSettings` (via `useUserPreferences`) somam **várias idas ao Supabase** e **repetem `auth.getUser()`** em fluxos diferentes | Médio — cascata e overhead de round-trips |
| Back (hipótese) | `payable_bills` com `select` `*` + **join aninhado** `bill_tags (tags (*))` aumenta payload | Médio — rede + serialização |
| Back | **`get_bill_analytics`** (migração expandida) agrega sobre `payable_bills` em vários blocos | Alto quando executada na abertura “escondida” |

**Conclusão:** O maior ganho provável na primeira pintura de Contas a pagar é **não montar** (ou não buscar) **Relatórios + analytics** até o usuário abrir essa aba, e **eliminar a segunda instância** de `usePayableBills` dentro do dashboard de relatórios.

---

## 2. Caso: página Contas a pagar (`PayableBills.tsx`)

### 2.1 Hooks e dados no mount da rota

Arquivo: `src/pages/PayableBills.tsx`

- **`usePayableBills()`**  
  - `fetchBills`: `from('payable_bills').select('*, bill_tags (tags (*))')` ordenado por `due_date`, sem paginação no cliente.  
  - **Realtime:** canal `postgres_changes` em `payable_bills` filtrado por `user_id` → **qualquer evento refaz `fetchBills` completo**.  
- **`useRecurringTrend()`** (`src/hooks/useRecurringTrend.ts`)  
  - `from('v_recurring_bills_trend').select('*').order(...).limit(60)`  
  - Processamento client-side (agrupamentos, chart).  
  - `setInterval(..., 5 * 60 * 1000)` para refetch.  
- **`useCategories()`** (`src/hooks/useCategories.ts`)  
  - `auth.getUser()` + `categories` com `select('*')`.  
- **`useUserPreferences()`** → **`useSettings()`**  
  - `user_settings` + `notification_preferences` (com caminhos de **insert** se não existir linha).

### 2.2 Problema crítico: abas Radix + Relatórios

Arquivo: `src/components/ui/tabs.tsx` — `TabsContent` é o primitivo padrão do Radix **sem** `forceMount` controlado.

Comportamento típico: o conteúdo das abas **permanece montado** (apenas oculto). Na árvore de Contas a pagar:

- `TabsContent value="reports"` renderiza **`BillReportsDashboard`**.

Arquivo: `src/components/payable-bills/reports/BillReportsDashboard.tsx`

- **`useBillReports()`** → **`supabase.rpc('get_bill_analytics', ...)`** no `useEffect` inicial e quando o período muda.  
- **`usePayableBills()`** de novo → **duplicação total** do carregamento de contas e do Realtime já ativo no pai.

**Efeito:** ao abrir “Contas a pagar”, o navegador pode estar executando **a mesma página de listagem** e ainda assim disparando **analytics server-side** e **segundo full fetch** de contas, sem o usuário ter clicado em “Relatórios”.

---

## 3. Back-end (Supabase) — riscos e verificações

### 3.1 Queries já identificadas no fluxo da página

1. **`payable_bills` + tags aninhadas** — avaliar:
   - índice composto `(user_id, due_date)` (ou equivalente alinhado aos filtros reais);
   - necessidade de trazer **todas** as colunas e **todas** as tags em toda abertura.  
2. **`get_bill_analytics`** — função grande (múltiplos `FROM payable_bills` com agregações); adequada para **aba Relatórios** ou **sob demanda**, não para cold start da lista.  
3. **`v_recurring_bills_trend`** — definida no projeto consumido pelo app; ** não foi localizada** em `supabase/migrations/` nesta auditoria (pode ter sido criada manualmente ou em migração não versionada no repo). Vale **EXPLAIN (ANALYZE)** no ambiente real e checagem de filtros por `user_id`.  
4. **Realtime** — cada novo canal + refetch completo amplifica carga; com **duas instâncias** do hook, há **dois canais** para a mesma tabela.

### 3.2 Checklist SQL sugerido (ambiente de staging/prod com leitura segura)

- `EXPLAIN (ANALYZE, BUFFERS)` em:
  - o `select` equivalente ao client (postgREST) para `payable_bills` + nested tags;
  - `get_bill_analytics` com intervalo padrão da UI;
  - select na view de trend com `LIMIT 60`.  
- Conferir **RLS**: se políticas fazem subqueries pesadas por linha.  
- Lista de índices em `payable_bills` alinhada a `user_id`, `due_date`, `status`.

---

## 4. Front-end — UX e arquitetura

### 4.1 Padrões que degradam “premium feel”

- **Loading global único:** `loading` de `usePayableBills` bloqueia lista inteira enquanto várias outras fontes ainda podem estar em voo ou já teriam dados em cache.  
- **Sem priorização:** dados críticos para a lista (contas do mês) competem com trend + analytics no mesmo tick.  
- **Duplicação de estado:** dois `usePayableBills` na mesma rota → comportamento errático de cache e custo duplicado.

### 4.2 Diretrizes desejadas (alvo “premium”)

- **Primeiro paint útil:** skeleton da lista + cards de resumo alimentados por subset ou cache.  
- **Carregar o pesado sob demanda:** relatórios e trend só quando a aba/área estiver ativa (ou após `requestIdleCallback` / pequeno delay).  
- **Fonte única de verdade:** React Query (ou provider) para `payable_bills` com `staleTime`, em vez de múltiplos hooks que cada um dão `fetch`.  
- **Realtime:** debounce no handler de `postgres_changes` ou invalidação granular (evitar N full refetches seguidos).

---

## 5. Plano de correção por fases

### Fase 0 — Instrumentação (1–2 dias)

- Medir na prática: **Chrome DevTools** (Performance + Network), **Supabase** logs ou `pg_stat_statements` para RPC/views.  
- Baseline: tempo até lista interativa, número de requests, tamanho de payload `payable_bills`.

### Fase 1 — Quick wins front (alto ROI, baixo risco)

1. **Montagem lazy das abas** em Contas a pagar: renderizar `TabsContent` de Histórico e Relatórios **somente quando `value === ...`** (ou `React.lazy` + suspender), para **não** chamar `useBillReports` nem o segundo `usePayableBills` na abertura.  
2. **Remover `usePayableBills()` de dentro de `BillReportsDashboard`**: receber `bills` (e eventualmente `refresh`) **por props** do pai, ou usar **um único hook/query** compartilhado.  
3. **Adiar `useRecurringTrend`**: carregar após interação, após idle, ou apenas se existirem contas recorrentes (flag barata vinda do primeiro fetch).

**Critério de sucesso:** abrir `/contas-pagar` na aba Contas **não** dispara `get_bill_analytics`; **uma** subscription/listagem ativa para `payable_bills`.

### Fase 2 — Dados e API (médio prazo)

1. **Contrato de listagem “leve”:** endpoint ou `select` com colunas mínimas + tags opcionais (segundo request ou join enxuto).  
2. **Revisar índices e RLS** em `payable_bills` conforme `EXPLAIN`.  
3. **View/RPC de trend:** garantir versionamento no repo, filtro explícito por `user_id`, e considerar materialização ou snapshot se o plano for caro.

### Fase 3 — Estado global e cache

1. Migrar `usePayableBills` para **TanStack Query** com chave `['payable_bills', userId]`, `staleTime` alinhado ao produto, invalidation no Realtime com debounce.  
2. **Deduplicação automática** de requests e um único lugar para Realtime.

### Fase 4 — UX premium

1. **Streaming visual:** resumo (totais) primeiro; lista em skeleton; seções secundárias (atenção, alertas de variação) em “secondary slot”.  
2. **Virtualização** da lista/tabela se o volume de linhas crescer.  
3. **Orçamento de interação:** evitar re-renderizar listas inteiras a cada keystroke de busca (debounce já pode existir no estado local; revisar `useMemo` dependências).

---

## 6. Próximos passos recomendados

1. Validar em ambiente real a hipótese das **abas montadas** (Network: presença de `get_bill_analytics` ao abrir a rota sem clicar em Relatórios).  
2. Priorizar **Fase 1** no código — costuma entregar o maior ganho com menor risco.  
3. Registrar neste documento (ou plano de implementação) os tempos **antes/depois** após cada fase.

---

## 7. Referências no código (rastreio)

- Página: `src/pages/PayableBills.tsx`  
- Contas: `src/hooks/usePayableBills.ts` (select + Realtime)  
- Trend: `src/hooks/useRecurringTrend.ts`  
- Relatórios: `src/hooks/useBillReports.ts` → RPC `get_bill_analytics`  
- Dashboard que duplica hook: `src/components/payable-bills/reports/BillReportsDashboard.tsx`  
- Tabs: `src/components/ui/tabs.tsx`  
- Categorias: `src/hooks/useCategories.ts`  
- Settings: `src/hooks/useSettings.ts`  
- RPC analítica (SQL): `supabase/migrations/20251209_expand_bill_analytics.sql` (função `get_bill_analytics`)
