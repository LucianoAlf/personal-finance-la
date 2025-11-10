import { Header } from '@/components/layout/Header';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/utils/formatters';
import { Plus, Upload, Filter, Wallet } from 'lucide-react';

export function Transactions() {
  // ✅ Hook com dados reais do Supabase
  const { transactions, loading, getTotalIncome, getTotalExpenses } = useTransactions();

  // ✅ Cálculos usando dados reais (filtered=true para mês atual)
  const totalIncome = getTotalIncome(true);
  const totalExpenses = getTotalExpenses(true);

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
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 mb-1">Total de Transações</p>
              <h2 className="text-2xl font-bold text-gray-900">{transactions.length}</h2>
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
            {transactions.length === 0 ? (
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
              transactions.map((transaction) => (
                <TransactionItem key={transaction.id} {...transaction} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
