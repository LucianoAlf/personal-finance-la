import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit2, Eye, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction } from '@/types/transactions';
import type { CreditCardTransaction } from '@/types/database.types';
import * as LucideIcons from 'lucide-react';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CategoryTransactionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  categoryColor?: string;
  goalId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

type PeriodType = 'current_month' | 'last_3_months' | 'current_year';

// Tipo unificado para transações de ambas as fontes
type UnifiedTransaction = {
  id: string;
  description: string;
  amount: number;
  transaction_date: Date;
  is_paid?: boolean;
  notes?: string;
  account_name?: string;
  source: 'regular' | 'credit_card';
  establishment?: string;
};

export function CategoryTransactionsDrawer({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  periodStart,
  periodEnd,
}: CategoryTransactionsDrawerProps) {
  const { transactions: regularTransactions, addTransaction, updateTransaction } = useTransactions();
  const { transactions: creditCardTransactions, updateTransaction: updateCreditCardTransaction } = useCreditCardTransactions();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType | 'goal_period'>(
    periodStart && periodEnd ? 'goal_period' : 'current_month'
  );
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [regularDialogOpen, setRegularDialogOpen] = useState(false);
  const [regularViewDialogOpen, setRegularViewDialogOpen] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedRegular, setSelectedRegular] = useState<Transaction | null>(null);
  const [creditEditDialogOpen, setCreditEditDialogOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditCardTransaction | null>(null);
  const [creditForm, setCreditForm] = useState({
    description: '',
    amount: 0,
    purchase_date: new Date(),
    establishment: '',
    notes: '' as string | undefined,
  });

  useEffect(() => {
    if (selectedCredit) {
      setCreditForm({
        description: selectedCredit.description || '',
        amount: Number(selectedCredit.amount) || 0,
        purchase_date: new Date(selectedCredit.purchase_date),
        establishment: selectedCredit.establishment || '',
        notes: selectedCredit.notes || undefined,
      });
    }
  }, [selectedCredit]);

  // Calcular range de datas baseado no período
  const dateRange = useMemo(() => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'goal_period':
        return {
          from: periodStart || startOfMonth(now),
          to: periodEnd || endOfMonth(now),
        };
      case 'current_month':
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
      case 'last_3_months':
        return {
          from: startOfMonth(subMonths(now, 2)),
          to: endOfMonth(now),
        };
      case 'current_year':
        return {
          from: startOfYear(now),
          to: endOfMonth(now),
        };
      default:
        return {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
    }
  }, [selectedPeriod, periodStart, periodEnd]);

  // Unificar transações regulares e de cartão de crédito
  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    // Transações regulares
    const regular = regularTransactions
      .filter((t) => t.category_id === categoryId && t.type === 'expense')
      .map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        transaction_date: new Date(t.transaction_date),
        is_paid: t.is_paid,
        notes: t.notes,
        account_name: t.account?.name,
        source: 'regular' as const,
      }));

    // Transações de cartão de crédito
    const creditCard = creditCardTransactions
      .filter((t) => t.category_id === categoryId)
      .map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        transaction_date: new Date(t.purchase_date),
        notes: t.notes,
        establishment: t.establishment,
        source: 'credit_card' as const,
      }));

    return [...regular, ...creditCard];
  }, [regularTransactions, creditCardTransactions, categoryId]);

  // Filtrar por período
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions
      .filter((t) => {
        return t.transaction_date >= dateRange.from && t.transaction_date <= dateRange.to;
      })
      .sort((a, b) => b.transaction_date.getTime() - a.transaction_date.getTime());
  }, [unifiedTransactions, dateRange]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalAmount = filteredTransactions
      .filter((t) => t.is_paid !== false) // Inclui transações sem campo is_paid (cartão)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingCount = filteredTransactions.filter((t) => t.is_paid === false).length;
    
    return {
      totalAmount,
      transactionCount: filteredTransactions.length,
      pendingCount,
    };
  }, [filteredTransactions]);

  const renderCategoryIcon = (iconName: string | undefined, color: string | undefined) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={20} style={{ color }} />;
  };

  const openRegularEditDialog = (tx: UnifiedTransaction) => {
    const full = regularTransactions.find((t) => t.id === tx.id);
    if (full) {
      setSelectedRegular(full);
      setRegularViewDialogOpen(false); // Fechar view dialog se estiver aberto
      setCreditDialogOpen(false); // Fechar credit dialog se estiver aberto
      setRegularDialogOpen(true);
    }
  };

  const openRegularViewDialog = (tx: UnifiedTransaction) => {
    const full = regularTransactions.find((t) => t.id === tx.id);
    if (full) {
      setSelectedRegular(full);
      setRegularDialogOpen(false); // Fechar edit dialog se estiver aberto
      setCreditDialogOpen(false); // Fechar credit dialog se estiver aberto
      setRegularViewDialogOpen(true);
    }
  };

  const openCreditViewDialog = (tx: UnifiedTransaction) => {
    setSelectedTransaction(tx);
    setRegularDialogOpen(false);
    setRegularViewDialogOpen(false);
    setCreditDialogOpen(true);
  };

  const openCreditEditDialog = (tx: UnifiedTransaction) => {
    const full = creditCardTransactions.find((t) => t.id === tx.id);
    if (full) {
      setSelectedCredit(full);
      setRegularDialogOpen(false);
      setRegularViewDialogOpen(false);
      setCreditDialogOpen(false);
      setCreditEditDialogOpen(true);
    }
  };

  const handleEdit = (transaction: UnifiedTransaction) => {
    if (transaction.source === 'regular') {
      openRegularEditDialog(transaction);
    } else {
      openCreditEditDialog(transaction);
    }
  };

  const handleView = (transaction: UnifiedTransaction) => {
    if (transaction.source === 'regular') {
      openRegularViewDialog(transaction);
    } else {
      openCreditViewDialog(transaction);
    }
  };

  const getPeriodLabel = (period: PeriodType | 'goal_period') => {
    switch (period) {
      case 'goal_period':
        return 'Período da meta';
      case 'current_month':
        return 'Este mês';
      case 'last_3_months':
        return 'Últimos 3 meses';
      case 'current_year':
        return 'Este ano';
      default:
        return 'Este mês';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            {categoryIcon && categoryColor && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${categoryColor}20` }}
              >
                {renderCategoryIcon(categoryIcon, categoryColor)}
              </div>
            )}
            <span>Transações: {categoryName}</span>
          </SheetTitle>
          <SheetDescription>
            Visualize e gerencie as transações desta categoria
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Filtro de Período */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodStart && periodEnd && (
                  <SelectItem value="goal_period">Período da meta</SelectItem>
                )}
                <SelectItem value="current_month">Este mês</SelectItem>
                <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                <SelectItem value="current_year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-gray-900">Resumo</span>
              </div>
              <Badge variant="default" className="bg-white text-gray-700">
                {getPeriodLabel(selectedPeriod)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total gasto</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div>
                <p className="text-gray-600">Transações</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.transactionCount}
                  {stats.pendingCount > 0 && (
                    <span className="text-sm font-normal text-yellow-600 ml-1">
                      ({stats.pendingCount} pendente{stats.pendingCount > 1 ? 's' : ''})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>

          {/* Lista de Transações */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center justify-between">
              <span>Transações ({filteredTransactions.length})</span>
              <Link
                to={`/transacoes?category=${categoryId}`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Ver página completa
                <ArrowRight className="h-4 w-4" />
              </Link>
            </h3>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Nenhuma transação encontrada</p>
                <p className="text-xs mt-1">para o período selecionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => (
                  <Card
                    key={transaction.id}
                    className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {transaction.description}
                          </h4>
                          {transaction.is_paid === false && (
                            <Badge variant="warning" className="text-xs">
                              Pendente
                            </Badge>
                          )}
                          {transaction.source === 'credit_card' && (
                            <Badge variant="info" className="text-xs">
                              Cartão
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatRelativeDate(transaction.transaction_date)}
                          {transaction.account_name && ` • ${transaction.account_name}`}
                          {transaction.establishment && ` • ${transaction.establishment}`}
                        </p>
                        {transaction.notes && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{transaction.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(transaction.amount)}
                        </span>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Abrir menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-[60]">
                            <DropdownMenuItem onSelect={() => handleView(transaction)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleEdit(transaction)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        </SheetContent>
      </Sheet>

      {/* Dialog - Transação normal (EDIÇÃO) */}
      <TransactionDialog
        open={regularDialogOpen}
        onOpenChange={setRegularDialogOpen}
        transaction={selectedRegular || undefined}
        onSave={async (data) => {
          if (selectedRegular) {
            await updateTransaction(selectedRegular.id, data);
          } else {
            await addTransaction(data);
          }
        }}
        defaultType="expense"
      />

      {/* Dialog - Transação normal (VISUALIZAÇÃO) */}
      <Dialog open={regularViewDialogOpen} onOpenChange={setRegularViewDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação</DialogTitle>
          </DialogHeader>
          {selectedRegular && (
            <div className="space-y-4">
              {/* Alerta para Pagamento de Fatura */}
              {selectedRegular.description?.toLowerCase().includes('pagamento de fatura') && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-blue-900 mb-1">💳 Pagamento de Cartão de Crédito</p>
                      <p className="text-blue-700">
                        Para ver os detalhes das compras que compõem este valor, acesse a página de{' '}
                        <Link to="/cartoes" className="underline font-semibold hover:text-blue-900">
                          Cartões de Crédito
                        </Link>
                        {' '}e visualize a fatura correspondente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Descrição</p>
                  <p className="font-medium text-gray-900">{selectedRegular.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Valor</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedRegular.amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Data</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(selectedRegular.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Situação</p>
                  <Badge variant={selectedRegular.is_paid ? 'success' : 'warning'}>
                    {selectedRegular.is_paid ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>

              {selectedRegular.account?.name && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Conta</p>
                  <p className="font-medium text-gray-900">{selectedRegular.account.name}</p>
                </div>
              )}

              {selectedRegular.category && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Categoria</p>
                  <div className="flex items-center gap-2">
                    {selectedRegular.category.icon && selectedRegular.category.color && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${selectedRegular.category.color}20` }}
                      >
                        {renderCategoryIcon(selectedRegular.category.icon, selectedRegular.category.color)}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{selectedRegular.category.name}</span>
                  </div>
                </div>
              )}

              {selectedRegular.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Observações</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedRegular.notes}</p>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end">
                <Button onClick={() => setRegularViewDialogOpen(false)} variant="outline">
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog - Transação de cartão (visualização simples) */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Transação do Cartão</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Descrição</span>
                <span className="font-medium text-gray-900">{selectedTransaction.description}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Data</span>
                <span className="font-medium text-gray-900">{formatRelativeDate(selectedTransaction.transaction_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Valor</span>
                <span className="font-bold text-orange-600">{formatCurrency(selectedTransaction.amount)}</span>
              </div>
              {selectedTransaction.establishment && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Estabelecimento</span>
                  <span className="font-medium text-gray-900">{selectedTransaction.establishment}</span>
                </div>
              )}
              <div className="pt-2 text-xs text-gray-500">Transação originada de cartão de crédito.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog - Transação de cartão (EDIÇÃO) */}
      <Dialog open={creditEditDialogOpen} onOpenChange={setCreditEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Editar Transação do Cartão</DialogTitle>
          </DialogHeader>
          {selectedCredit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Descrição</label>
                  <Input
                    value={creditForm.description}
                    onChange={(e) => setCreditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Data</label>
                  <Input
                    type="date"
                    value={creditForm.purchase_date.toISOString().slice(0,10)}
                    onChange={(e) => setCreditForm((f) => ({ ...f, purchase_date: new Date(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Valor (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Estabelecimento</label>
                  <Input
                    value={creditForm.establishment}
                    onChange={(e) => setCreditForm((f) => ({ ...f, establishment: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-600">Observações</label>
                  <Textarea
                    value={creditForm.notes || ''}
                    onChange={(e) => setCreditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreditEditDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!selectedCredit) return;
                    await updateCreditCardTransaction(selectedCredit.id, {
                      description: creditForm.description,
                      amount: creditForm.amount,
                      purchase_date: creditForm.purchase_date,
                      establishment: creditForm.establishment || null as any,
                      notes: creditForm.notes || null as any,
                    });
                    setCreditEditDialogOpen(false);
                  }}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
