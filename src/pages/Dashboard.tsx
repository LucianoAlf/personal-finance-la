import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { MonthSelector } from '@/components/shared/MonthSelector';
import { ExpensesByCategoryChart } from '@/components/dashboard/charts/ExpensesByCategoryChart';
import { MonthlyTrendChart } from '@/components/dashboard/charts/MonthlyTrendChart';
import { GoalsSummaryWidget } from '@/components/goals/GoalsSummaryWidget';
import { BudgetComplianceWidget } from '@/components/budget/BudgetComplianceWidget';
import { CreditCardsWidget } from '@/components/creditcards/CreditCardsWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/formatters';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  MessageSquare,
  FileText,
  Target,
  Calendar,
  Bot,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Home,
} from 'lucide-react';

export function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // HOOKS REAIS - SEM MOCK DATA
  const {
    transactions,
    getTotalIncome,
    getTotalExpenses,
    getBalance,
    loading: transactionsLoading,
  } = useTransactions();

  const {
    accounts,
    getTotalBalance,
    loading: accountsLoading,
  } = useAccounts();

  // FILTRAR TRANSAÇÕES DO MÊS SELECIONADO
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return (
      transactionDate.getMonth() === selectedDate.getMonth() &&
      transactionDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  // CÁLCULOS COM DADOS REAIS DO MÊS SELECIONADO
  const totalBalance = getTotalBalance();
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalCreditCards = 0; // Por enquanto (Fase 4)

  const recentTransactions = filteredTransactions.slice(0, 5);

  // CÁLCULOS PARA INSIGHTS
  // 1. Economia no Caminho (Receitas - Despesas do mês)
  const monthlySavings = totalIncome - totalExpenses;
  const savingsPercentage = totalIncome > 0 ? ((monthlySavings / totalIncome) * 100).toFixed(0) : 0;
  
  // 2. Contas a Pagar (transações pendentes do mês)
  const pendingTransactions = filteredTransactions.filter(t => !t.is_paid && t.type === 'expense');
  const pendingCount = pendingTransactions.length;
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
  // 3. Transações de crédito pendentes (para futuro)
  const creditCardPending = 0; // Fase 4

  // LOADING STATE
  if (transactionsLoading || accountsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            trend={{ value: '+12.5%', direction: 'up' }}
            onClick={() => navigate('/contas')}
          />
          <StatCard
            title="Receitas do Mês"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            gradient="green"
            badge={{ text: 'Confirmado', variant: 'success' }}
            onClick={() => navigate('/transacoes?type=income')}
          />
          <StatCard
            title="Despesas do Mês"
            value={formatCurrency(totalExpenses)}
            icon={TrendingDown}
            gradient="red"
            subtitle="67% do orçamento"
            onClick={() => navigate('/transacoes?type=expense')}
          />
          <StatCard
            title="Cartões de Crédito"
            value={formatCurrency(totalCreditCards)}
            icon={CreditCard}
            gradient="orange"
            badge={{ text: '2 faturas', variant: 'warning' }}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in animation-delay-200">
          {/* Ana Clara Widget */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <CardTitle className="text-white">Ana Clara</CardTitle>
                  <p className="text-sm text-white/80">Sua Coach Financeira</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Sparkles size={20} className="mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-2">
                      Parabéns! Você está no caminho certo para sua meta de economia mensal!
                    </p>
                    <p className="text-sm text-white/80">
                      Faltam apenas R$ 450,00 para atingir os 20% de economia este mês.
                    </p>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-white text-purple-600 hover:bg-white/90">
                Ver Mais Insights
              </Button>
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-2 gap-4">
            <Card 
              className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group"
              onClick={() => alert('Em breve: Lançar via WhatsApp')}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <MessageSquare
                  size={32}
                  className="text-gray-400 group-hover:text-purple-500 mb-2 transition-colors"
                />
                <h3 className="font-semibold text-gray-900 mb-1">Lançar via WhatsApp</h3>
                <p className="text-sm text-gray-600">Envie sua transação</p>
              </CardContent>
            </Card>

            <Card 
              className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group"
              onClick={() => navigate('/transacoes?status=pending')}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <FileText size={32} className="text-gray-400 group-hover:text-purple-500 mb-2 transition-colors" />
                <h3 className="font-semibold text-gray-900 mb-1">Contas a Pagar</h3>
                <p className="text-sm text-gray-600">{pendingCount} pendentes</p>
              </CardContent>
            </Card>

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
                    date={new Date(transaction.transaction_date)}
                    amount={transaction.amount}
                    is_paid={transaction.is_paid}
                    is_recurring={transaction.is_recurring}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FileText size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-semibold mb-2">Nenhuma transação recente</p>
                  <p className="text-sm text-gray-600 mb-4">Crie sua primeira transação para começar!</p>
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

        {/* Insight Cards - Dinâmicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in animation-delay-400">
          {/* Economia no Caminho */}
          <InsightCard
            title="Economia no Caminho"
            description={
              monthlySavings >= 0
                ? `Você economizou ${formatCurrency(monthlySavings)} este mês (${savingsPercentage}%)`
                : `Déficit de ${formatCurrency(Math.abs(monthlySavings))} este mês`
            }
            icon={monthlySavings >= 0 ? CheckCircle2 : AlertCircle}
            variant={monthlySavings >= 0 ? 'success' : 'danger'}
          />

          {/* Atenção aos Cartões */}
          <InsightCard
            title="Atenção aos Cartões"
            description={
              creditCardPending > 0
                ? `${creditCardPending} faturas vencem em breve`
                : 'Em breve: gestão de cartões de crédito'
            }
            icon={CreditCard}
            variant={creditCardPending > 0 ? 'warning' : 'info'}
          />

          {/* Metas em Progresso */}
          <InsightCard
            title="Metas em Progresso"
            description="Em breve: defina e acompanhe suas metas financeiras"
            icon={Target}
            variant="info"
          />

          {/* Contas a Pagar */}
          <InsightCard
            title="Contas a Pagar"
            description={
              pendingCount > 0
                ? `${pendingCount} ${pendingCount === 1 ? 'conta pendente' : 'contas pendentes'} - ${formatCurrency(pendingAmount)}`
                : 'Nenhuma conta pendente este mês'
            }
            icon={FileText}
            variant={pendingCount > 0 ? 'warning' : 'success'}
          />
        </div>
      </div>
    </div>
  );
}
