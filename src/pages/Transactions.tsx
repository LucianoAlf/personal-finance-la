import { useState, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/utils/formatters';
import { Plus, Upload, Filter, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Transactions() {
  // Estado para o mês selecionado
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // ✅ Hook com dados reais do Supabase
  const { transactions, loading } = useTransactions();

  // Filtrar transações pelo mês selecionado
  const filteredTransactions = useMemo(() => {
    const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
    
    return transactions.filter((t) => {
      const txDate = t.transaction_date;
      return txDate >= start && txDate <= end;
    });
  }, [transactions, selectedMonth]);

  // Calcular totais do mês filtrado
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'income' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [filteredTransactions]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense' && t.is_paid)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [filteredTransactions]);

  // Navegação de mês
  const goToPreviousMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
  const goToNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

  // ✅ Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          title="Transações"
          subtitle="Todas as suas movimentações financeiras"
        />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Transações"
        subtitle="Todas as suas movimentações financeiras"
        actions={
          <>
            <Button size="sm" variant="outline">
              <Filter size={16} className="mr-1" />
              Filtros
            </Button>
            <Button size="sm" variant="outline">
              <Upload size={16} className="mr-1" />
              Importar CSV
            </Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600">
              <Plus size={16} className="mr-1" />
              Nova Despesa
            </Button>
            <Button size="sm" className="bg-green-500 hover:bg-green-600">
              <Plus size={16} className="mr-1" />
              Nova Receita
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Seletor de Mês */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="px-6 py-2 bg-purple-100 text-purple-700 rounded-full font-medium min-w-[200px] text-center">
            {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total de Transações</p>
              <h2 className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</h2>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-green-500">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Receitas</p>
              <h2 className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </h2>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-red-500">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Despesas</p>
              <h2 className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </h2>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Transações */}
        <Card>
          <CardHeader>
            <CardTitle>Todas as Transações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* ✅ Empty state quando não há transações */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Wallet size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma transação encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Comece adicionando suas primeiras movimentações financeiras
                </p>
                <Button className="bg-green-500 hover:bg-green-600">
                  <Plus size={16} className="mr-1" />
                  Nova Receita
                </Button>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} {...transaction} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
