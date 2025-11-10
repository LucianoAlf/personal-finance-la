# PLANO CIRÚRGICO DE CORREÇÃO - PERSONAL FINANCE LA

**Data**: 10 de Novembro de 2025
**Objetivo**: Atingir 100% de integração com dados reais
**Prazo**: 1-2 dias de desenvolvimento
**Complexidade**: BAIXA (código já existe, apenas precisa ser conectado)

---

## RESUMO EXECUTIVO

Este plano cirúrgico corrige 3 issues críticos que impedem 100% de integração de dados reais no sistema:

1. ❌ Página Transactions usando mock data (100% fake)
2. ❌ Página Accounts usando mock data (100% fake)
3. ❌ Dashboard mostrando Cartões hardcoded em R$ 0

**Impacto**: Após correções, sistema terá **100% de dados reais** em todas as páginas.

**Tempo Estimado Total**: 2-3 horas

---

## FASE 1: CORREÇÃO DA PÁGINA TRANSACTIONS (30 min)

### Problema Atual
```typescript
// src/pages/Transactions.tsx:5
import { mockTransactions } from '@/utils/mockData';

// Uso de dados fake
const totalIncome = mockTransactions.filter(...)
const totalExpenses = mockTransactions.filter(...)
{mockTransactions.map((transaction) => (...))}
```

### Solução

**Arquivo**: `src/pages/Transactions.tsx`

**Mudanças:**

```typescript
// ❌ REMOVER
import { mockTransactions } from '@/utils/mockData';

// ✅ ADICIONAR
import { useTransactions } from '@/hooks/useTransactions';
import { Skeleton } from '@/components/ui/skeleton';

export function Transactions() {
  // ✅ ADICIONAR hook real
  const {
    transactions,
    getTotalIncome,
    getTotalExpenses,
    loading
  } = useTransactions();

  // ❌ REMOVER
  // const totalIncome = mockTransactions.filter(...)
  // const totalExpenses = mockTransactions.filter(...)

  // ✅ SUBSTITUIR por
  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();

  // ✅ ADICIONAR loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      {/* ... resto do código */}

      {/* ❌ REMOVER */}
      {/* {mockTransactions.map((transaction) => (...))} */}

      {/* ✅ SUBSTITUIR por */}
      {transactions.length > 0 ? (
        transactions.map((transaction) => (
          <TransactionItem
            key={transaction.id}
            type={transaction.type}
            description={transaction.description}
            category_id={transaction.category_id}
            date={new Date(transaction.transaction_date)}
            amount={transaction.amount}
            is_paid={transaction.is_paid}
            is_recurring={transaction.is_recurring}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhuma transação encontrada</p>
        </div>
      )}
    </div>
  );
}
```

**Arquivos a Modificar:**
- `src/pages/Transactions.tsx`

**Linhas a Alterar:**
- Linha 5: Remover import de mockTransactions
- Linha 7-8: Adicionar import de useTransactions e Skeleton
- Linha 15-20: Adicionar hook e loading state
- Linha 10-15: Substituir cálculos de total por hook
- Linha 79-81: Substituir map de mock por map de transactions reais

**Validação:**
1. Abrir página /transacoes
2. Verificar se mostra transações reais do banco de dados
3. Verificar se totais batem com Dashboard
4. Criar nova transação e verificar se aparece em tempo real

---

## FASE 2: CORREÇÃO DA PÁGINA ACCOUNTS (30 min)

### Problema Atual
```typescript
// src/pages/Accounts.tsx:6
import { mockAccounts } from '@/utils/mockData';

// Uso de dados fake
const totalBalance = mockAccounts.reduce(...)
const checkingTotal = mockAccounts.filter(...)
{mockAccounts.map((account) => (...))}
```

### Solução

**Arquivo**: `src/pages/Accounts.tsx`

**Mudanças:**

```typescript
// ❌ REMOVER
import { mockAccounts } from '@/utils/mockData';

// ✅ ADICIONAR
import { useAccounts } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/skeleton';

export function Accounts() {
  // ✅ ADICIONAR hook real
  const {
    accounts,
    getTotalBalance,
    loading
  } = useAccounts();

  // ❌ REMOVER
  // const totalBalance = mockAccounts.reduce(...)
  // const checkingTotal = mockAccounts.filter(...)

  // ✅ SUBSTITUIR por
  const totalBalance = getTotalBalance();
  const checkingTotal = accounts
    .filter(acc => acc.type === 'checking')
    .reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const savingsTotal = accounts
    .filter(acc => acc.type === 'savings')
    .reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  // ✅ ADICIONAR loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div>
      {/* ... resto do código */}

      {/* ❌ REMOVER */}
      {/* {mockAccounts.map((account) => (...))} */}

      {/* ✅ SUBSTITUIR por */}
      {accounts.length > 0 ? (
        accounts.map((account) => (
          <AccountCard
            key={account.id}
            name={account.name}
            type={account.type}
            bank={account.bank}
            balance={account.current_balance} {/* NÃO 'balance' */}
            icon={account.icon}
          />
        ))
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">Nenhuma conta encontrada</p>
          <Button onClick={() => navigate('/contas/nova')}>
            Adicionar Primeira Conta
          </Button>
        </div>
      )}
    </div>
  );
}
```

**IMPORTANTE**: O campo correto é `current_balance`, NÃO `balance`.

**Arquivos a Modificar:**
- `src/pages/Accounts.tsx`

**Linhas a Alterar:**
- Linha 6: Remover import de mockAccounts
- Linha 8-9: Adicionar import de useAccounts e Skeleton
- Linha 15-20: Adicionar hook e loading state
- Linha 12-15: Substituir cálculos de total por hook
- Linha 96-134: Substituir map de mock por map de accounts reais
- **CRÍTICO**: Usar `account.current_balance` ao invés de `account.balance`

**Validação:**
1. Abrir página /contas
2. Verificar se mostra contas reais do banco de dados
3. Verificar se saldo total bate com Dashboard
4. Criar nova conta e verificar se aparece em tempo real

---

## FASE 3: CORREÇÃO DO DASHBOARD - CARTÕES (45 min)

### Problema Atual
```typescript
// src/pages/Dashboard.tsx:75
const totalCreditCards = 0; // Por enquanto (Fase 4)

// src/pages/Dashboard.tsx:143
badge={{ text: '2 faturas', variant: 'warning' }} // HARDCODED

// src/pages/Dashboard.tsx:135
subtitle="67% do orçamento" // HARDCODED
```

### Solução

**Arquivo**: `src/pages/Dashboard.tsx`

**Mudanças:**

```typescript
// ✅ ADICIONAR imports
import { useInvoices } from '@/hooks/useInvoices';
import { useBudgets } from '@/hooks/useBudgets';

export function Dashboard() {
  // Hooks existentes
  const { user, profile } = useAuth();
  const { transactions, getTotalIncome, getTotalExpenses, loading: transactionsLoading } = useTransactions();
  const { accounts, getTotalBalance, loading: accountsLoading } = useAccounts();

  // ✅ ADICIONAR novos hooks
  const { invoicesDetailed, loading: invoicesLoading } = useInvoices();
  const { budgets, loading: budgetsLoading } = useBudgets();

  // ❌ REMOVER
  // const totalCreditCards = 0;

  // ✅ SUBSTITUIR por
  const totalCreditCards = invoicesDetailed
    .filter(inv => inv.status === 'open' || inv.status === 'closed' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.remaining_amount || inv.total_amount), 0);

  const pendingInvoicesCount = invoicesDetailed
    .filter(inv => inv.status === 'open' || inv.status === 'closed' || inv.status === 'overdue')
    .length;

  // ✅ CALCULAR percentual de orçamento real
  const currentMonth = new Date();
  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const totalBudget = budgets
    .filter(b => b.month === monthKey)
    .reduce((sum, b) => sum + Number(b.planned_amount), 0);

  const budgetPercentage = totalBudget > 0
    ? Math.round((totalExpenses / totalBudget) * 100)
    : 0;

  // ✅ ATUALIZAR loading state
  if (transactionsLoading || accountsLoading || invoicesLoading || budgetsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      {/* ... */}

      {/* ✅ ATUALIZAR StatCard de Cartões */}
      <StatCard
        title="Cartões de Crédito"
        value={formatCurrency(totalCreditCards)}
        icon={CreditCard}
        gradient="orange"
        badge={{
          text: pendingInvoicesCount > 0
            ? `${pendingInvoicesCount} ${pendingInvoicesCount === 1 ? 'fatura' : 'faturas'}`
            : 'Em dia',
          variant: pendingInvoicesCount > 0 ? 'warning' : 'success'
        }}
        onClick={() => navigate('/cartoes')}
      />

      {/* ✅ ATUALIZAR StatCard de Despesas */}
      <StatCard
        title="Despesas do Mês"
        value={formatCurrency(totalExpenses)}
        icon={TrendingDown}
        gradient="red"
        subtitle={
          totalBudget > 0
            ? `${budgetPercentage}% do orçamento`
            : 'Sem orçamento definido'
        }
        onClick={() => navigate('/transacoes?type=expense')}
      />
    </div>
  );
}
```

**Arquivos a Modificar:**
- `src/pages/Dashboard.tsx`

**Linhas a Alterar:**
- Linha 20-22: Adicionar imports de useInvoices e useBudgets
- Linha 44-46: Adicionar novos hooks
- Linha 75: REMOVER `const totalCreditCards = 0`
- Linha 76-80: ADICIONAR cálculo real de totalCreditCards
- Linha 81-84: ADICIONAR cálculo de pendingInvoicesCount
- Linha 86-93: ADICIONAR cálculo de budgetPercentage
- Linha 94: ATUALIZAR loading condition
- Linha 139-145: ATUALIZAR StatCard de Cartões com badge dinâmico
- Linha 131-137: ATUALIZAR StatCard de Despesas com subtitle dinâmico

**Validação:**
1. Abrir Dashboard
2. Verificar se "Cartões de Crédito" mostra valor real (não R$ 0)
3. Verificar se badge mostra número correto de faturas
4. Verificar se "Despesas" mostra percentual correto do orçamento
5. Criar nova fatura e verificar se atualiza em tempo real

---

## FASE 4: LIMPEZA DO MOCK DATA (15 min)

### Problema Atual
Arquivo `src/utils/mockData.ts` ainda existe e pode causar confusão.

### Solução

**Opção 1: REMOVER COMPLETAMENTE** (Recomendado)
```bash
# Deletar arquivo
rm src/utils/mockData.ts
```

**Opção 2: DEPRECIAR E MANTER PARA TESTES**
```typescript
// src/utils/mockData.ts

/**
 * ⚠️ DEPRECATED - NÃO USAR EM PRODUÇÃO
 *
 * Este arquivo contém dados mock APENAS para testes unitários.
 * NUNCA importe estes dados em páginas reais.
 *
 * Use os hooks oficiais:
 * - useTransactions() ao invés de mockTransactions
 * - useAccounts() ao invés de mockAccounts
 */

// Manter exports com comentários de depreciação
/** @deprecated Use useTransactions() hook */
export const mockTransactions = [...];

/** @deprecated Use useAccounts() hook */
export const mockAccounts = [...];

// etc.
```

**Validação:**
1. Executar build: `npm run build`
2. Verificar se não há erros de imports não encontrados
3. Testar todas as páginas para garantir que nada quebrou

---

## FASE 5: VALIDAÇÃO FINAL (30 min)

### Checklist Completo

#### Dashboard
- [ ] Saldo Total mostra valor real de contas
- [ ] Receitas do Mês mostra valor real de transactions
- [ ] Despesas do Mês mostra valor real de transactions
- [ ] Cartões mostra valor real de invoices
- [ ] Badge de faturas mostra número correto
- [ ] Percentual de orçamento é calculado dinamicamente
- [ ] Ana Clara Widget mostra insights reais
- [ ] Gráficos mostram dados reais

#### Transações
- [ ] Lista de transações vem do banco de dados
- [ ] Total de receitas bate com Dashboard
- [ ] Total de despesas bate com Dashboard
- [ ] Criar nova transação aparece na lista imediatamente
- [ ] Editar transação atualiza em tempo real
- [ ] Deletar transação remove da lista

#### Contas
- [ ] Lista de contas vem do banco de dados
- [ ] Saldo total bate com Dashboard
- [ ] Campo usado é `current_balance` (não `balance`)
- [ ] Criar nova conta aparece na lista imediatamente
- [ ] Editar conta atualiza em tempo real
- [ ] Deletar conta remove da lista

#### Cartões
- [ ] Lista de cartões vem do banco de dados
- [ ] Faturas mostram valores reais
- [ ] Criar nova fatura atualiza Dashboard
- [ ] Pagar fatura atualiza saldo em contas

#### Contas a Pagar
- [ ] Lista de bills vem do banco de dados
- [ ] Pagar bill atualiza status
- [ ] Dashboard mostra bills pendentes corretos

#### Metas
- [ ] Lista de metas vem do banco de dados
- [ ] Contribuições atualizam progresso automaticamente
- [ ] Dashboard mostra metas corretas

#### Investimentos
- [ ] Lista de investimentos vem do banco de dados
- [ ] Transações atualizam valores automaticamente
- [ ] Cotações são buscadas de APIs reais

#### Ana Clara
- [ ] Insights baseados em dados reais de todas as áreas
- [ ] Health Score reflete estado real das finanças
- [ ] Insights mudam conforme dados mudam

---

## ESTIMATIVA DE TEMPO

| Fase | Tempo | Complexidade |
|------|-------|--------------|
| Fase 1: Transactions | 30 min | BAIXA |
| Fase 2: Accounts | 30 min | BAIXA |
| Fase 3: Dashboard | 45 min | MÉDIA |
| Fase 4: Limpeza | 15 min | BAIXA |
| Fase 5: Validação | 30 min | BAIXA |
| **TOTAL** | **2h30min** | **BAIXA** |

---

## ORDEM DE EXECUÇÃO RECOMENDADA

1. **Fase 2 (Accounts)** - Mais simples, sem dependências
2. **Fase 1 (Transactions)** - Simples, sem dependências
3. **Fase 3 (Dashboard)** - Depende das fases anteriores
4. **Fase 5 (Validação)** - Testar tudo junto
5. **Fase 4 (Limpeza)** - Só após validação completa

---

## ROLLBACK PLAN

Se algo der errado, reverter commits:

```bash
# Ver últimos commits
git log --oneline -5

# Reverter último commit (mantém mudanças)
git reset --soft HEAD~1

# Reverter último commit (descarta mudanças)
git reset --hard HEAD~1

# Reverter para commit específico
git reset --hard <commit-hash>
```

---

## CRITÉRIOS DE SUCESSO

### Mínimo Aceitável (MVP)
- ✅ 0 páginas usando mock data
- ✅ Dashboard mostra todos os 4 cards com dados reais
- ✅ Não há inconsistências entre páginas

### Ideal
- ✅ 100% de integração em todas as páginas
- ✅ Loading states em todas as queries
- ✅ Realtime updates funcionando
- ✅ Empty states quando não há dados
- ✅ Error handling para queries falhadas

---

## PRÓXIMOS PASSOS (PÓS-CORREÇÃO)

Após atingir 100% de integração, considerar:

1. **Otimizações de Performance**
   - Implementar cache de queries
   - Debounce em realtime subscriptions
   - Lazy loading de componentes pesados

2. **Melhorias de UX**
   - Animações de transição
   - Feedback visual em mutações
   - Toasts de sucesso/erro

3. **Features Adicionais para Ana Clara**
   - Incluir análise de budgets
   - Incluir análise de credit cards
   - Incluir previsões de gastos futuros

4. **Testes Automatizados**
   - Unit tests para hooks
   - Integration tests para páginas
   - E2E tests para fluxos críticos

---

## COMANDOS ÚTEIS

```bash
# Instalar dependências (se necessário)
npm install

# Executar em dev mode
npm run dev

# Build para produção
npm run build

# Rodar testes (se existirem)
npm test

# Verificar tipos TypeScript
npx tsc --noEmit

# Verificar lint
npm run lint
```

---

## CONTATOS E RECURSOS

**Documentação Relevante:**
- [Supabase Docs](https://supabase.com/docs)
- [React Hooks](https://react.dev/reference/react)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) (se usar)

**Arquivos Importantes:**
- Hooks: `src/hooks/use*.ts`
- Páginas: `src/pages/*.tsx`
- Types: `src/types/database.types.ts`
- Supabase Client: `src/lib/supabase.ts`

---

## CONCLUSÃO

Este plano cirúrgico é **simples e de baixo risco** porque:

1. ✅ Hooks já existem e funcionam perfeitamente
2. ✅ Banco de dados está estruturado corretamente
3. ✅ RLS garante segurança
4. ✅ Apenas precisa CONECTAR componentes aos hooks

**Complexidade**: BAIXA
**Risco**: BAIXO
**Tempo**: 2-3 horas
**Impacto**: ALTO (100% de integração real)

Após execução deste plano, o sistema estará **100% integrado** com dados reais e proporcionará uma experiência consistente e confiável aos usuários.
