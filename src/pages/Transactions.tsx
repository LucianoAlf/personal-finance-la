import { Header } from '@/components/layout/Header';
import { TransactionItem } from '@/components/dashboard/TransactionItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockTransactions } from '@/utils/mockData';
import { formatCurrency } from '@/utils/formatters';
import { Plus, Upload, Filter } from 'lucide-react';

export function Transactions() {
  const totalIncome = mockTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = mockTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

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
              <h2 className="text-2xl font-bold text-gray-900">{mockTransactions.length}</h2>
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
            {mockTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} {...transaction} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
