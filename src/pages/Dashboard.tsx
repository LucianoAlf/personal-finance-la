import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { ExpensesByCategoryChart } from '@/components/dashboard/charts/ExpensesByCategoryChart';
import { MonthlyTrendChart } from '@/components/dashboard/charts/MonthlyTrendChart';
import { GoalsSummaryWidget } from '@/components/goals/GoalsSummaryWidget';
import { BudgetComplianceWidget } from '@/components/budget/BudgetComplianceWidget';
import { CreditCardsWidget } from '@/components/creditcards/CreditCardsWidget';
import { PayableBillsWidget } from '@/components/payable-bills/PayableBillsWidget';
import { AnaDashboardWidget } from '@/components/dashboard/AnaDashboardWidget';
import { InvestmentsWidget } from '@/components/dashboard/InvestmentsWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useTransactionsQuery } from '@/hooks/useTransactionsQuery';
import { useAccountsQuery } from '@/hooks/useAccountsQuery';
import { useCreditCardsQuery } from '@/hooks/useCreditCardsQuery';
import { useInvoicesQuery } from '@/hooks/useInvoicesQuery';
import { useBudgetsQuery } from '@/hooks/useBudgetsQuery';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  Home,
} from 'lucide-react';

export function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Preferências de formatação do usuário
  const { formatCurrency } = useUserPreferences();

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

  const { 
    budgets, 
    loading: budgetsLoading 
  } = useBudgetsQuery(monthKey);

  // ✅ OTIMIZADO: Cachear filtro de transações com useMemo
  // ✅ CORREÇÃO: Filtrar por string (YYYY-MM) sem conversão de timezone
  const filteredTransactions = useMemo(() => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const selectedYearMonth = `${selectedYear}-${selectedMonth}`;
    
    return transactions.filter(t => {
      // Compara apenas YYYY-MM (sem new Date que causa bug de timezone)
      return t.transaction_date.startsWith(selectedYearMonth);
    });
  }, [transactions, selectedDate]);

  // ✅ OTIMIZADO: Cachear cálculos com useMemo
  const { totalIncome, totalExpenses, recentTransactions } = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // ✅ CRÍTICO: Ordenar por created_at DESC (mais recentes primeiro!)
    // Não por transaction_date, senão transações com data futura aparecem primeiro
    const recent = [...filteredTransactions]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.transaction_date);
        const dateB = new Date(b.created_at || b.transaction_date);
        return dateB.getTime() - dateA.getTime(); // DESC
      })
      .slice(0, 5);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      recentTransactions: recent
    };
  }, [filteredTransactions]);

  // CÁLCULOS COM DADOS REAIS DO MÊS SELECIONADO
  const totalBalance = getTotalBalance();
  const totalCreditCards = getTotalUsed();

  // ✅ RENDERIZAR TUDO IMEDIATAMENTE (sem bloqueio)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header
        title={`Olá, ${profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'}!`}
        subtitle="Bem-vindo ao seu painel financeiro"
        icon={<Home size={24} />}
        actions={
          <MonthSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate}
          />
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
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
              // ✅ Subtitle dinâmico: calcular percentual real do orçamento
              const totalBudget = budgets.reduce((sum, b) => sum + Number(b.planned_amount), 0);
              
              if (totalBudget === 0) {
                return 'Sem orçamento definido';
              }
              
              const budgetPercentage = Math.round((totalExpenses / totalBudget) * 100);
              return `${budgetPercentage}% do orçamento`;
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
              // ✅ Badge dinâmico: calcular faturas pendentes (open + closed)
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

        {/* Gráficos */}
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

        {/* Ana Clara + Ações Rápidas */}
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

            {/* Widget de Orçamento */}
            <BudgetComplianceWidget />
          </div>
        </div>

        {/* Transações Recentes + Cartões */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animation-delay-300">
          {/* Transações Recentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transações Recentes</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/transacoes')}
                >
                  Ver Todas
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    type={transaction.type}
                    description={transaction.description}
                    category_id={transaction.category_id}
                    date={new Date(`${transaction.transaction_date}T00:00:00`)}
                    amount={transaction.amount}
                    is_paid={transaction.is_paid}
                    is_recurring={transaction.is_recurring}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-semibold mb-2">Nenhuma transação recente</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Crie sua primeira transação para começar!</p>
                  <Button 
                    onClick={() => navigate('/transacoes')}
                    size="sm"
                  >
                    Adicionar Transação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cartões de Crédito */}
          <CreditCardsWidget />
        </div>

      </div>
    </div>
  );
}
