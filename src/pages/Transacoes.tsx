import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Filter, Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import type { Transaction, TransactionType } from '@/types/transactions';
import { TYPE_COLORS } from '@/constants/categories';
import * as LucideIcons from 'lucide-react';

export const Transacoes = () => {
  console.log('🟢 Transacoes: PÁGINA CARREGADA');
  
  // HOOKS REAIS - SEM MOCK DATA
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTotalIncome,
    getTotalExpenses,
    getBalance,
  } = useTransactions();
  
  console.log('🟢 Transacoes: transactions =', transactions);

  const { accounts } = useAccounts();
  const { getCategoryById } = useCategories();

  // ESTADOS
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [preSelectedType, setPreSelectedType] = useState<TransactionType | undefined>();

  // CALCULAR TOTAIS DO MÊS (DADOS REAIS)
  const monthlyIncome = getTotalIncome(true);
  const monthlyExpenses = getTotalExpenses(true);
  const monthlyBalance = getBalance(true);

  // DEBUG: Mostrar estado atual
  console.log('📊 Estado atual da página:', {
    totalTransactions: transactions.length,
    loading,
    monthlyIncome,
    monthlyExpenses,
    monthlyBalance,
  });

  // HANDLERS
  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setPreSelectedType(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      await deleteTransaction(id);
      toast.success('Transação excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir transação. Tente novamente.');
    }
  };

  const handleSave = async (data: any) => {
    try {
      console.log('💾 Salvando transação:', data);
      if (selectedTransaction) {
        // MODO EDIÇÃO - ATUALIZAR
        console.log('✏️ Modo edição');
        await updateTransaction(selectedTransaction.id, data);
        toast.success('Transação atualizada com sucesso!');
      } else {
        // MODO CRIAÇÃO - ADICIONAR
        console.log('➕ Modo criação');
        await addTransaction(data);
        toast.success('Transação criada com sucesso!');
      }
      setDialogOpen(false);
      setSelectedTransaction(undefined);
      setPreSelectedType(undefined);
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast.error('Erro ao salvar transação. Tente novamente.');
    }
  };

  // ACEITA TIPO OPCIONAL PARA PRÉ-SELECIONAR (income/expense)
  const handleNewTransaction = (type?: TransactionType) => {
    console.log('🟢 BOTÃO CLICADO! Tipo:', type);
    setSelectedTransaction(undefined);
    setPreSelectedType(type);
    setDialogOpen(true);
    console.log('🟢 Dialog aberto:', true);
  };

  // Renderizar ícone da categoria dinamicamente
  const renderCategoryIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.DollarSign;
    return <IconComponent size={20} style={{ color }} />;
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando transações...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <Header
        title="Transações"
        subtitle="Gerencie suas receitas, despesas e transferências"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="mr-2" size={16} />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2" size={16} />
              Exportar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              size="sm"
              onClick={() => handleNewTransaction('income')}
            >
              <Plus className="mr-2" size={16} />
              Nova Receita
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              size="sm"
              onClick={() => handleNewTransaction('expense')}
            >
              <Plus className="mr-2" size={16} />
              Nova Despesa
            </Button>
          </>
        }
      />

      {/* CONTEÚDO */}
      <div className="p-6 space-y-6">
        {/* CARDS DE RESUMO - DADOS REAIS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Receitas do Mês */}
          <Card className="border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Receitas do Mês</p>
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(monthlyIncome)}
              </p>
            </CardContent>
          </Card>

          {/* Despesas do Mês */}
          <Card className="border-l-4 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Despesas do Mês</p>
                <TrendingDown className="text-red-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(monthlyExpenses)}
              </p>
            </CardContent>
          </Card>

          {/* Saldo do Mês */}
          <Card className={`border-l-4 ${monthlyBalance >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Saldo do Mês</p>
                <Wallet className={monthlyBalance >= 0 ? 'text-blue-500' : 'text-orange-500'} size={20} />
              </div>
              <p className={`text-3xl font-bold ${monthlyBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(monthlyBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* LISTA DE TRANSAÇÕES - DADOS REAIS */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Todas as Transações ({transactions.length})
            </h2>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma transação encontrada</p>
                <p className="text-sm">Crie sua primeira transação para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const category = transaction.category || getCategoryById(transaction.category_id);
                  const account = transaction.account || accounts.find(a => a.id === transaction.account_id);
                  const typeColors = TYPE_COLORS[transaction.type];

                  return (
                    <Card
                      key={transaction.id}
                      className={`border-l-4 ${typeColors.border} hover:shadow-md transition-shadow cursor-pointer`}
                      onClick={() => handleEdit(transaction)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          {/* Esquerda: Ícone + Info */}
                          <div className="flex items-center gap-4">
                            {/* Ícone da Categoria */}
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColors.bg}`}
                            >
                              {category && renderCategoryIcon(category.icon, category.color)}
                            </div>

                            {/* Info */}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {transaction.description}
                                </h3>
                                {!transaction.is_paid && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                                    Pendente
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <span>{category?.name || 'Sem categoria'}</span>
                                <span>•</span>
                                <span>{account?.name || 'Sem conta'}</span>
                                <span>•</span>
                                <span>{formatRelativeDate(transaction.transaction_date)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Direita: Valor */}
                          <div className="text-right">
                            <p className={`text-xl font-bold ${typeColors.text}`}>
                              {transaction.type === 'expense' ? '- ' : '+ '}
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG - CONECTADO */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={selectedTransaction}
        onSave={handleSave}
        defaultType={preSelectedType}
      />
    </div>
  );
};
