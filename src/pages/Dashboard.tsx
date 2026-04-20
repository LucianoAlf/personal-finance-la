import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { PageContent } from '@/components/layout/PageContent';
import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { ExpensesByCategoryChart } from '@/components/dashboard/charts/ExpensesByCategoryChart';
import { MonthlyTrendChart } from '@/components/dashboard/charts/MonthlyTrendChart';
import { GoalsSummaryWidget } from '@/components/goals/GoalsSummaryWidget';
import { BudgetComplianceWidget } from '@/components/budget/BudgetComplianceWidget';
import { CreditCardsWidget } from '@/components/creditcards/CreditCardsWidget';
import { PayableBillsWidget } from '@/components/payable-bills/PayableBillsWidget';
import { AnaDashboardWidget } from '@/components/dashboard/AnaDashboardWidget';
import { InvestmentsWidget } from '@/components/dashboard/InvestmentsWidget';
import { DashboardAlertCard } from '@/components/dashboard/DashboardAlertCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCreditCardsQuery } from '@/hooks/useCreditCardsQuery';
import { useInvoicesQuery } from '@/hooks/useInvoicesQuery';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useSettings } from '@/hooks/useSettings';
import { useGoalsQuery } from '@/hooks/useGoalsQuery';
import { usePayableBillsQuery } from '@/hooks/usePayableBillsQuery';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import type { PayableBill } from '@/types/payable-bills.types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  Home,
  List,
} from 'lucide-react';
import { groupTransactionsForDisplay } from '@/utils/groupTransactionsForDisplay';
import { competenceMonthFromTransaction, isInvoicePaymentExpense } from '@/utils/transactionCompetence';
import { summarizeBudgetItems, toBudgetItemsFromSpendingGoals } from '@/utils/spendingGoalPlanning';
import { resolveUserDisplayName } from '@/utils/profileIdentity';

export function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { userSettings } = useSettings();

  // Preferências de formatação do usuário
  const { formatCurrency } = useUserPreferences();
  const displayName = resolveUserDisplayName(profile, userSettings, user);

  // ✅ HOOKS COM REACT QUERY (CACHE INSTANTÂNEO) - Todos com cache local!
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

  const {
    transactions,
    loading: transactionsLoading,
  } = useTransactionsQuery();

  const {
    accounts,
    getTotalBalance,
    loading: accountsLoading,
  } = useAccountsQuery();

  const {
    cards,
    getTotalUsed,
    loading: cardsLoading,
  } = useCreditCardsQuery();

  const {
    invoices,
    loading: invoicesLoading,
  } = useInvoicesQuery();

  const { goals } = useGoalsQuery();
  const spendingPlanItems = useMemo(
    () => toBudgetItemsFromSpendingGoals(goals as FinancialGoalWithCategory[], monthKey),
    [goals, monthKey]
  );
  const spendingPlanSummary = useMemo(() => summarizeBudgetItems(spendingPlanItems), [spendingPlanItems]);

  const payableBillsQuery = usePayableBillsQuery();

  // ✅ OTIMIZADO: Cachear filtro de transações com useMemo
  // ✅ CORREÇÃO: Filtrar por string (YYYY-MM) sem conversão de timezone
  const filteredTransactions = useMemo(() => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const selectedYearMonth = `${selectedYear}-${selectedMonth}`;

    return transactions.filter((t) => competenceMonthFromTransaction(t) === selectedYearMonth);
  }, [transactions, selectedDate]);

  // ✅ OTIMIZADO: Cachear cálculos com useMemo
  const { totalIncome, totalExpenses, recentTransactions } = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = filteredTransactions
      .filter((t) => t.type === 'expense' && !isInvoicePaymentExpense(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const recent = groupTransactionsForDisplay(filteredTransactions, formatCurrency).slice(0, 5);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      recentTransactions: recent
    };
  }, [filteredTransactions, formatCurrency]);

  const overdueSummary = useMemo(() => {
    const bills = payableBillsQuery?.overdueBills ?? [];
    const amount = bills.reduce((sum: number, b: PayableBill) => sum + Number(b.amount ?? 0), 0);
    const topItems = bills.slice(0, 2).map((b: PayableBill) => ({
      name: b.description ?? 'Conta',
      dueLabel: b.due_date ? new Date(b.due_date).toLocaleDateString('pt-BR') : '',
    }));
    return { count: bills.length, amount, topItems };
  }, [payableBillsQuery]);

  // CÁLCULOS COM DADOS REAIS DO MÊS SELECIONADO
  const totalBalance = getTotalBalance();
  const totalCreditCards = getTotalUsed();

  // Shared Recent Transactions JSX (used in both mobile and desktop trees)
  const recentTransactionsCard = (
    <Card className="border-border/70 bg-surface/95 shadow-[0_22px_55px_rgba(3,8,20,0.28)] backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            Transações Recentes
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl border border-border/70 bg-surface-elevated/70 text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
            onClick={() => navigate('/transacoes')}
          >
            Ver Todas
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-1">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((transaction) => {
            const shown = transaction.displayAmount ?? transaction.amount;
            const total = transaction.displayPurchaseTotal;
            const amountFootnote =
              transaction.groupedInstallments?.length && total != null
                ? Math.abs(Number(total) - Number(shown)) > 0.009
                  ? `Compra total ${formatCurrency(total)} · competência no mês ${formatCurrency(shown)}`
                  : `Compra total ${formatCurrency(total)}`
                : undefined;
            return (
              <TransactionItem
                key={transaction.id}
                type={transaction.type}
                description={transaction.displayDescription || transaction.description}
                category_id={transaction.category_id}
                date={new Date(`${transaction.transaction_date}T00:00:00`)}
                amount={shown}
                is_paid={transaction.is_paid}
                is_recurring={transaction.is_recurring}
                extraBadgeText={transaction.groupedInstallments?.length ? `Parcelado ${transaction.total_installments || transaction.groupedInstallmentCount}x` : undefined}
                amountFootnote={amountFootnote}
                tags={transaction.tags}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/70 bg-surface-elevated/40 py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated ring-1 ring-border/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <FileText size={32} className="text-primary/70" />
            </div>
            <p className="mb-2 font-semibold text-foreground">Nenhuma transação recente</p>
            <p className="mb-4 text-sm text-muted-foreground">Crie sua primeira transação para começar!</p>
            <Button
              onClick={() => navigate('/transacoes')}
              size="sm"
              className="rounded-xl"
            >
              Adicionar Transação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ✅ RENDERIZAR TUDO IMEDIATAMENTE (sem bloqueio)
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top,rgba(130,92,255,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[24rem] bg-[radial-gradient(circle_at_center,rgba(71,85,255,0.08),transparent_70%)] lg:block" />
      <Header
        title={`Olá, ${displayName.split(' ')[0]}!`}
        subtitle="Bem-vindo ao seu painel financeiro"
        icon={<Home size={24} />}
        actions={
          <MonthSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        }
      />

      <PageContent className="space-y-8 py-8">
        {/* ============ MOBILE TREE (< lg) ============ */}
        <div className="flex flex-col gap-6 lg:hidden">
          {/* 1. Alert (conditional) */}
          <DashboardAlertCard
            overdueCount={overdueSummary.count}
            overdueAmount={overdueSummary.amount}
            topItems={overdueSummary.topItems}
          />

          {/* 2. KPI Stat Cards */}
          <div data-testid="dashboard-block-stats" className="grid grid-cols-1 gap-4">
            <StatCard
              title="Saldo Total"
              value={formatCurrency(totalBalance)}
              icon={Wallet}
              gradient="blue"
              loading={accountsLoading && accounts.length === 0}
              onClick={() => navigate('/contas')}
            />
            <StatCard
              title="Receitas do Mês"
              value={formatCurrency(totalIncome)}
              icon={TrendingUp}
              gradient="green"
              loading={transactionsLoading && transactions.length === 0}
              badge={{ text: 'Confirmado', variant: 'success' }}
              onClick={() => navigate('/transacoes?type=income')}
            />
            <StatCard
              title="Despesas do Mês"
              value={formatCurrency(totalExpenses)}
              icon={TrendingDown}
              gradient="red"
              loading={transactionsLoading && transactions.length === 0}
              subtitle={(() => {
                if (spendingPlanSummary.totalPlanned === 0) {
                  return 'Sem meta mensal definida';
                }
                return `${spendingPlanSummary.utilizationPct}% dos limites`;
              })()}
              onClick={() => navigate('/transacoes?type=expense')}
            />
            <StatCard
              title="Cartões de Crédito"
              value={formatCurrency(totalCreditCards)}
              icon={CreditCard}
              gradient="orange"
              loading={(cardsLoading && cards.length === 0) || (invoicesLoading && invoices.length === 0)}
              badge={(() => {
                const pendingInvoices = invoices.filter(i =>
                  i.status === 'open' || i.status === 'closed'
                );
                const count = pendingInvoices.length;
                if (count === 0) {
                  return { text: 'Em dia', variant: 'success' as const };
                }
                return {
                  text: `${count} ${count === 1 ? 'fatura' : 'faturas'}`,
                  variant: 'warning' as const
                };
              })()}
              onClick={() => navigate('/cartoes')}
            />
          </div>

          {/* 3. Ana Clara */}
          <div data-testid="dashboard-block-ana">
            <AnaDashboardWidget autoRefresh={true} />
          </div>

          {/* 4. Payable Bills */}
          <div data-testid="dashboard-block-bills">
            <PayableBillsWidget />
          </div>

          {/* 5. Investments */}
          <div data-testid="dashboard-block-investments">
            <InvestmentsWidget />
          </div>

          {/* 6. Recent Transactions */}
          <div data-testid="dashboard-block-recent">
            {recentTransactionsCard}
          </div>

          {/* 7. Charts */}
          <div data-testid="dashboard-block-charts" className="flex flex-col gap-4">
            <ExpensesByCategoryChart transactions={filteredTransactions} selectedDate={selectedDate} />
            <MonthlyTrendChart transactions={transactions} selectedDate={selectedDate} />
          </div>

          {/* 8. Goals + Budget */}
          <div data-testid="dashboard-block-goals-budget" className="flex flex-col gap-4">
            <GoalsSummaryWidget />
            <BudgetComplianceWidget monthKey={monthKey} />
          </div>
        </div>

        {/* ============ DESKTOP TREE (≥ lg) ============ */}
        <div className="hidden lg:block space-y-8">
          {/* Alert */}
          <DashboardAlertCard
            overdueCount={overdueSummary.count}
            overdueAmount={overdueSummary.amount}
            topItems={overdueSummary.topItems}
          />

          {/* Grid 1: Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <StatCard
              title="Saldo Total"
              value={formatCurrency(totalBalance)}
              icon={Wallet}
              gradient="blue"
              loading={accountsLoading && accounts.length === 0}
              onClick={() => navigate('/contas')}
            />
            <StatCard
              title="Receitas do Mês"
              value={formatCurrency(totalIncome)}
              icon={TrendingUp}
              gradient="green"
              loading={transactionsLoading && transactions.length === 0}
              badge={{ text: 'Confirmado', variant: 'success' }}
              onClick={() => navigate('/transacoes?type=income')}
            />
            <StatCard
              title="Despesas do Mês"
              value={formatCurrency(totalExpenses)}
              icon={TrendingDown}
              gradient="red"
              loading={transactionsLoading && transactions.length === 0}
              subtitle={(() => {
                if (spendingPlanSummary.totalPlanned === 0) {
                  return 'Sem meta mensal definida';
                }
                return `${spendingPlanSummary.utilizationPct}% dos limites`;
              })()}
              onClick={() => navigate('/transacoes?type=expense')}
            />
            <StatCard
              title="Cartões de Crédito"
              value={formatCurrency(totalCreditCards)}
              icon={CreditCard}
              gradient="orange"
              loading={(cardsLoading && cards.length === 0) || (invoicesLoading && invoices.length === 0)}
              badge={(() => {
                const pendingInvoices = invoices.filter(i =>
                  i.status === 'open' || i.status === 'closed'
                );
                const count = pendingInvoices.length;
                if (count === 0) {
                  return { text: 'Em dia', variant: 'success' as const };
                }
                return {
                  text: `${count} ${count === 1 ? 'fatura' : 'faturas'}`,
                  variant: 'warning' as const
                };
              })()}
              onClick={() => navigate('/cartoes')}
            />
          </div>

          {/* Grid 2: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animation-delay-100">
            <ExpensesByCategoryChart
              transactions={filteredTransactions}
              selectedDate={selectedDate}
            />
            <MonthlyTrendChart
              transactions={transactions}
              selectedDate={selectedDate}
            />
          </div>

          {/* Grid 3: Ana Clara + Widgets sub-grid 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animation-delay-200 items-start">
            {/* Ana Clara Widget - GPT-4.1 mini + Cache 24h */}
            <AnaDashboardWidget autoRefresh={true} />

            {/* Widgets de Resumo - 2x2 Grid Uniforme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Widget de Investimentos */}
              <InvestmentsWidget />

              {/* Widget de Contas a Pagar */}
              <PayableBillsWidget />

              {/* Widget de Metas */}
              <GoalsSummaryWidget />

              {/* Widget de Metas de Gasto */}
              <BudgetComplianceWidget monthKey={monthKey} />
            </div>
          </div>

          {/* Grid 4: Transações Recentes + Cartões */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animation-delay-300">
            {/* Transações Recentes */}
            {recentTransactionsCard}

            {/* Cartões de Crédito */}
            <CreditCardsWidget />
          </div>
        </div>
      </PageContent>
    </div>
  );
}
