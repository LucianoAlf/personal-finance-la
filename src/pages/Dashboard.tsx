import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
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
  Plus,
  Download,
  MessageSquare,
  FileText,
  Target,
  Calendar,
  Bot,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function Dashboard() {
  const { user, profile } = useAuth();

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

  // CÁLCULOS COM DADOS REAIS
  const totalBalance = getTotalBalance();
  const totalIncome = getTotalIncome(true); // mês atual
  const totalExpenses = getTotalExpenses(true); // mês atual
  const totalCreditCards = 0; // Por enquanto (Fase 4)

  const recentTransactions = transactions.slice(0, 5);

  // LOADING STATE
  if (transactionsLoading || accountsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={`Olá, ${profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'}!`}
        subtitle="Bem-vindo ao seu painel financeiro"
        actions={
          <>
            <Button size="sm" variant="outline">
              <Plus size={16} className="mr-1" />
              Nova Receita
            </Button>
            <Button size="sm">
              <Plus size={16} className="mr-1" />
              Nova Despesa
            </Button>
            <Button size="sm" variant="outline">
              <Download size={16} className="mr-1" />
              Exportar
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Saldo Total"
            value={formatCurrency(totalBalance)}
            icon={Wallet}
            gradient="blue"
            trend={{ value: '+12.5%', direction: 'up' }}
          />
          <StatCard
            title="Receitas do Mês"
            value={formatCurrency(totalIncome)}
            icon={TrendingUp}
            gradient="green"
            badge={{ text: 'Confirmado', variant: 'success' }}
          />
          <StatCard
            title="Despesas do Mês"
            value={formatCurrency(totalExpenses)}
            icon={TrendingDown}
            gradient="red"
            subtitle="67% do orçamento"
          />
          <StatCard
            title="Cartões de Crédito"
            value={formatCurrency(totalCreditCards)}
            icon={CreditCard}
            gradient="orange"
            badge={{ text: '2 faturas', variant: 'warning' }}
          />
        </div>

        {/* Ana Clara + Ações Rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <MessageSquare
                  size={32}
                  className="text-gray-400 group-hover:text-purple-500 mb-2"
                />
                <h3 className="font-semibold text-gray-900 mb-1">Lançar via WhatsApp</h3>
                <p className="text-sm text-gray-600">Envie sua transação</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <FileText size={32} className="text-gray-400 group-hover:text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Contas a Pagar</h3>
                <p className="text-sm text-gray-600">5 pendentes</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <Target size={32} className="text-gray-400 group-hover:text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Minhas Metas</h3>
                <p className="text-sm text-gray-600">3 em progresso</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                <Calendar size={32} className="text-gray-400 group-hover:text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Planejamento</h3>
                <p className="text-sm text-gray-600">Revisar orçamento</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transações Recentes + Cartões */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transações Recentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transações Recentes</CardTitle>
                <Button variant="ghost" size="sm">
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
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">Nenhuma transação recente</p>
                  <p className="text-sm">Crie sua primeira transação para começar!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cartões de Crédito - FASE 4 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cartões de Crédito</CardTitle>
                <Button variant="ghost" size="sm" disabled>
                  Em Breve
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center text-gray-500">
                <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="font-semibold mb-1">Em Breve: Cartões de Crédito</p>
                <p className="text-sm">Gerencie seus cartões e faturas na Fase 4</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-green-500 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Economia no Caminho</h3>
                  <p className="text-sm text-gray-600">
                    Você já economizou R$ 550 este mês!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-orange-500 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Atenção aos Cartões</h3>
                  <p className="text-sm text-gray-600">
                    2 faturas vencem nos próximos 5 dias
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Target className="text-blue-500 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Metas em Progresso</h3>
                  <p className="text-sm text-gray-600">3 metas com bom andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-purple-500">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <FileText className="text-purple-500 flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Contas a Pagar</h3>
                  <p className="text-sm text-gray-600">5 contas pendentes este mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
