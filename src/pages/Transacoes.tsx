import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  X,
  List,
  Search,
  Filter,
  ArrowLeftRight,
  Landmark,
} from 'lucide-react';
import { format } from 'date-fns';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { AdvancedFiltersModal, type FilterConfig } from '@/components/transactions/AdvancedFiltersModal';
import { MonthSelector } from '@/components/shared/MonthSelector';

import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { ACCOUNT_TYPES } from '@/constants/accounts';
import { TYPE_COLORS } from '@/constants/categories';
import type { Transaction, TransactionType } from '@/types/transactions';
import * as LucideIcons from 'lucide-react';
import { getBankLogo, detectBankFromName, getBankColor } from '@/constants/bankLogos';
import { groupTransactionsForDisplay, type DisplayTransactionItem } from '@/utils/groupTransactionsForDisplay';
import {
  competenceMonthFromTransaction,
  isInvoicePaymentExpense,
  isCashOutExpenseInBankMonth,
} from '@/utils/transactionCompetence';
import { transactionMatchesBankAccountIds } from '@/utils/transactions/bankAccountFilter';
import { getUrlTransactionFilters, matchesUrlTransactionFilters } from '@/utils/transactions/urlTransactionFilters';

interface TransactionSummaryCardProps {
  title: string;
  value: string;
  supporting: string;
  icon: ReactNode;
  accent: 'green' | 'red' | 'blue' | 'slate';
  valueClassName?: string;
}

const summaryAccentStyles: Record<TransactionSummaryCardProps['accent'], string> = {
  green:
    'border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(255,255,255,0)_42%)] dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0)_74%)]',
  red:
    'border-red-500/20 bg-[linear-gradient(135deg,rgba(239,68,68,0.14),rgba(255,255,255,0)_42%)] dark:bg-[linear-gradient(135deg,rgba(239,68,68,0.16),rgba(15,23,42,0)_74%)]',
  blue:
    'border-blue-500/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(255,255,255,0)_42%)] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.16),rgba(15,23,42,0)_74%)]',
  slate:
    'border-slate-400/20 bg-[linear-gradient(135deg,rgba(100,116,139,0.12),rgba(255,255,255,0)_42%)] dark:bg-[linear-gradient(135deg,rgba(100,116,139,0.15),rgba(15,23,42,0)_74%)]',
};

const summaryIconClassName =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 text-white shadow-[0_12px_24px_rgba(15,23,42,0.15)] dark:border-white/10';

const filterBadgeClassName = 'cursor-default px-3 py-1.5 text-xs font-semibold shadow-sm';

const rowToneByType = {
  income: {
    border: 'border-l-success',
    iconWrap: 'border-success-border bg-success-subtle/90',
    amount: 'text-success',
  },
  expense: {
    border: 'border-l-danger',
    iconWrap: 'border-danger-border bg-danger-subtle/90',
    amount: 'text-danger',
  },
  transfer: {
    border: 'border-l-info',
    iconWrap: 'border-info-border bg-info-subtle/90',
    amount: 'text-info',
  },
} as const;

const TransactionSummaryCard = ({
  title,
  value,
  supporting,
  icon,
  accent,
  valueClassName = 'text-foreground',
}: TransactionSummaryCardProps) => (
  <Card
    className={`group relative overflow-hidden rounded-[28px] border bg-card/95 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)] ${summaryAccentStyles[accent]}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className={`text-[1.55rem] font-semibold leading-tight tracking-tight [font-variant-numeric:tabular-nums] sm:text-[1.7rem] ${valueClassName}`}>
          {value}
        </p>
      </div>
      {icon}
    </div>
    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{supporting}</p>
  </Card>
);

export const Transacoes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const {
    accountId: accountIdFromUrl,
    categoryId: categoryIdFromUrl,
    type: typeFromUrl,
  } = getUrlTransactionFilters(searchParams);

  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    fetchTransactions,
  } = useTransactions();
  const { accounts } = useAccounts();
  const { getCategoryById } = useCategories();
  const { formatCurrency, formatRelativeDate } = useUserPreferences();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [preSelectedType, setPreSelectedType] = useState<TransactionType | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig | null>(null);

  const selectedAccountForFilter = accountIdFromUrl
    ? accounts.find((account) => account.id === accountIdFromUrl)
    : null;
  const selectedCategoryForFilter = categoryIdFromUrl ? getCategoryById(categoryIdFromUrl) : null;
  const selectedTypeForFilter = typeFromUrl;

  const normalizeText = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const selectedCalendarYearMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

  let filteredTransactions = transactions.filter(
    (transaction) => competenceMonthFromTransaction(transaction) === selectedCalendarYearMonth,
  );

  if (typeFromUrl || accountIdFromUrl || categoryIdFromUrl) {
    filteredTransactions = filteredTransactions.filter((transaction) =>
      matchesUrlTransactionFilters(transaction, {
        type: typeFromUrl,
        accountId: accountIdFromUrl,
        categoryId: categoryIdFromUrl,
      }),
    );
  }

  if (searchQuery.trim()) {
    const normalizedQuery = normalizeText(searchQuery);

    filteredTransactions = filteredTransactions.filter((transaction) => {
      const category = transaction.category || getCategoryById(transaction.category_id);
      const account = transaction.account || accounts.find((item) => item.id === transaction.account_id);
      const matchesWordStart = (text: string, query: string) => {
        const normalizedText = normalizeText(text);
        return normalizedText.startsWith(query) || normalizedText.includes(` ${query}`);
      };

      return (
        matchesWordStart(transaction.description, normalizedQuery) ||
        (category ? matchesWordStart(category.name, normalizedQuery) : false) ||
        transaction.amount.toString().includes(searchQuery.trim()) ||
        (account ? matchesWordStart(account.name, normalizedQuery) : false)
      );
    });
  }

  if (activeFilters) {
    filteredTransactions = filteredTransactions.filter((transaction) => {
      if (activeFilters.dateRange.from || activeFilters.dateRange.to) {
        const txYm = competenceMonthFromTransaction(transaction);
        if (activeFilters.dateRange.from) {
          const fromD = new Date(activeFilters.dateRange.from);
          const fromYm = `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, '0')}`;
          if (txYm < fromYm) return false;
        }
        if (activeFilters.dateRange.to) {
          const toD = new Date(activeFilters.dateRange.to);
          const toYm = `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, '0')}`;
          if (txYm > toYm) return false;
        }
      }

      if (activeFilters.categories.length > 0) {
        if (!transaction.category_id || !activeFilters.categories.includes(transaction.category_id)) {
          return false;
        }
      }

      if (activeFilters.accounts.length > 0 && !transactionMatchesBankAccountIds(transaction, activeFilters.accounts)) {
        return false;
      }

      if (activeFilters.tags.length > 0) {
        const transactionTagIds = transaction.tags?.map((tag) => tag.id) || [];
        const hasMatchingTag = activeFilters.tags.some((tagId) => transactionTagIds.includes(tagId));
        if (!hasMatchingTag) return false;
      }

      if (activeFilters.statuses.length > 0) {
        let matchesStatus = false;
        activeFilters.statuses.forEach((status) => {
          if (status === 'paid' && transaction.is_paid) matchesStatus = true;
          if (status === 'pending' && !transaction.is_paid) matchesStatus = true;
          if (status === 'recurring' && transaction.is_recurring) matchesStatus = true;
        });
        if (!matchesStatus) return false;
      }

      if (activeFilters.types.length > 0 && !activeFilters.types.includes(transaction.type)) {
        return false;
      }

      return true;
    });
  }

  const groupedTransactions: DisplayTransactionItem[] = groupTransactionsForDisplay(
    filteredTransactions,
    formatCurrency,
  );

  const monthlyIncome = filteredTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const monthlyExpenses = filteredTransactions
    .filter((transaction) => transaction.type === 'expense' && !isInvoicePaymentExpense(transaction))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const monthlyCashOut = filteredTransactions
    .filter((transaction) => isCashOutExpenseInBankMonth(transaction, selectedCalendarYearMonth))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const monthlyBalance = monthlyIncome - monthlyExpenses;

  const handleRemoveAccountFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('account');
    const query = params.toString();
    navigate(`/transacoes${query ? `?${query}` : ''}`);
  };

  const handleRemoveTypeFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('type');
    const query = params.toString();
    navigate(`/transacoes${query ? `?${query}` : ''}`);
  };

  const handleRemoveCategoryFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('category');
    const query = params.toString();
    navigate(`/transacoes${query ? `?${query}` : ''}`);
  };

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
    } catch {
      toast.error('Erro ao excluir transação. Tente novamente.');
    }
  };

  const handleSave = async (data: any, options?: { existingEntityId?: string }): Promise<string> => {
    if (selectedTransaction) {
      await updateTransaction(selectedTransaction.id, data);
      return selectedTransaction.id;
    }
    if (options?.existingEntityId) {
      await updateTransaction(options.existingEntityId, data);
      return options.existingEntityId;
    }
    const row = await addTransaction(data);
    if (!row?.id) throw new Error('Não foi possível obter o id da transação criada');
    return row.id;
  };

  const handleNewTransaction = (type?: TransactionType) => {
    setSelectedTransaction(undefined);
    setPreSelectedType(type);
    setDialogOpen(true);
  };

  const renderTransactionIcon = (
    type: TransactionType,
    category?: { icon?: string; color?: string } | null,
  ) => {
    if (type === 'transfer') {
      return <ArrowLeftRight size={18} className="text-blue-500" />;
    }

    const IconComponent = category?.icon
      ? (LucideIcons as Record<string, any>)[category.icon] || LucideIcons.DollarSign
      : LucideIcons.DollarSign;

    return <IconComponent size={18} style={{ color: category?.color || '#6B7280' }} />;
  };

  const headerActions = (
    <>
      <Button
        className="rounded-xl border border-emerald-500/30 bg-emerald-500 text-white shadow-[0_18px_35px_rgba(16,185,129,0.22)] hover:bg-emerald-500/90"
        onClick={() => handleNewTransaction('income')}
      >
        <Plus className="mr-2" size={16} />
        Nova Receita
      </Button>
      <Button
        className="rounded-xl border border-red-500/30 bg-red-500 text-white shadow-[0_18px_35px_rgba(239,68,68,0.22)] hover:bg-red-500/90"
        onClick={() => handleNewTransaction('expense')}
      >
        <Plus className="mr-2" size={16} />
        Nova Despesa
      </Button>
    </>
  );

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(130,92,255,0.12),transparent_60%)]" />
        <Header
          title="Transações"
          subtitle="Gerencie suas receitas, despesas e transferências"
          icon={<List size={24} />}
          actions={headerActions}
        />

        <div className="relative mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="rounded-[28px] border border-border/70 bg-card/90">
                <CardContent className="space-y-3 p-6">
                  <div className="h-4 w-28 animate-pulse rounded bg-surface-elevated" />
                  <div className="h-10 w-36 animate-pulse rounded bg-surface-elevated" />
                  <div className="h-4 w-44 animate-pulse rounded bg-surface-elevated/80" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-[28px] border border-border/70 bg-card/90">
            <CardContent className="p-10 text-center text-muted-foreground">
              Carregando transações...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_top,rgba(130,92,255,0.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[20rem] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06),transparent_72%)] lg:block" />

      <Header
        title="Transações"
        subtitle="Gerencie suas receitas, despesas e transferências"
        icon={<List size={24} />}
        actions={headerActions}
      />

      <div className="relative mx-auto max-w-7xl space-y-8 px-6 py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <TransactionSummaryCard
            title="Receitas do Mês"
            value={formatCurrency(monthlyIncome)}
            supporting="Por competência no mês selecionado"
            accent="green"
            icon={
              <div className={`${summaryIconClassName} bg-emerald-500`}>
                <TrendingUp size={22} />
              </div>
            }
          />
          <TransactionSummaryCard
            title="Despesas do Mês"
            value={formatCurrency(monthlyExpenses)}
            supporting="Competência: cartão pela fatura do mês. Sem pagamento de fatura."
            accent="red"
            icon={
              <div className={`${summaryIconClassName} bg-red-500`}>
                <TrendingDown size={22} />
              </div>
            }
          />
          <TransactionSummaryCard
            title="Saldo do Mês"
            value={formatCurrency(monthlyBalance)}
            supporting="Receitas menos despesas por competência"
            accent="blue"
            valueClassName={monthlyBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}
            icon={
              <div className={`${summaryIconClassName} ${monthlyBalance >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}>
                <Wallet size={22} />
              </div>
            }
          />
          <TransactionSummaryCard
            title="Saídas no Caixa"
            value={formatCurrency(monthlyCashOut)}
            supporting="O que saiu da conta no mês, incluindo pagamento de fatura."
            accent="slate"
            icon={
              <div className={`${summaryIconClassName} bg-slate-700 dark:bg-slate-600`}>
                <Landmark size={22} />
              </div>
            }
          />
        </div>

        <Card className="rounded-[28px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.24)]">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Pesquise por descrição, categoria ou valor"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-surface-elevated/70 pl-11 pr-4 text-base"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <MonthSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-border/70 bg-surface/85 px-4 shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay"
                  onClick={() => setFiltersModalOpen(true)}
                >
                  <Filter size={16} className="mr-2" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.24)]">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <List className="h-5 w-5 text-primary" />
                  <CardTitle className="text-2xl font-semibold tracking-tight text-foreground">
                    Todas as Transações ({groupedTransactions.length})
                  </CardTitle>
                </div>

                {(selectedAccountForFilter || selectedCategoryForFilter || selectedTypeForFilter || activeFilters) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTypeForFilter && (
                      <Badge
                        variant="secondary"
                        className={`${filterBadgeClassName} border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300`}
                      >
                        {selectedTypeForFilter === 'income'
                          ? 'Receitas'
                          : selectedTypeForFilter === 'expense'
                            ? 'Despesas'
                            : 'Transferências'}
                        <button type="button" onClick={handleRemoveTypeFilter} className="ml-2">
                          <X size={12} />
                        </button>
                      </Badge>
                    )}

                    {selectedAccountForFilter && (
                      <Badge
                        variant="secondary"
                        className={`${filterBadgeClassName} border-primary/20 bg-primary/10 text-primary`}
                      >
                        {selectedAccountForFilter.name} - {ACCOUNT_TYPES[selectedAccountForFilter.type]}
                        <button type="button" onClick={handleRemoveAccountFilter} className="ml-2">
                          <X size={12} />
                        </button>
                      </Badge>
                    )}

                    {selectedCategoryForFilter && (
                      <Badge
                        variant="secondary"
                        className={`${filterBadgeClassName} border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`}
                      >
                        {selectedCategoryForFilter.name}
                        <button type="button" onClick={handleRemoveCategoryFilter} className="ml-2">
                          <X size={12} />
                        </button>
                      </Badge>
                    )}

                    {activeFilters && (
                      <>
                        {(activeFilters.dateRange.from || activeFilters.dateRange.to) && (
                          <Badge variant="secondary" className={`${filterBadgeClassName} border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300`}>
                            Período {activeFilters.dateRange.from && format(activeFilters.dateRange.from, 'dd/MM/yy')}
                            {activeFilters.dateRange.from && activeFilters.dateRange.to && ' - '}
                            {activeFilters.dateRange.to && format(activeFilters.dateRange.to, 'dd/MM/yy')}
                          </Badge>
                        )}
                        {activeFilters.categories.length > 0 && (
                          <Badge variant="secondary" className={`${filterBadgeClassName} border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`}>
                            {activeFilters.categories.length} categoria{activeFilters.categories.length === 1 ? '' : 's'}
                          </Badge>
                        )}
                        {activeFilters.accounts.length > 0 && (
                          <Badge variant="secondary" className={`${filterBadgeClassName} border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300`}>
                            {activeFilters.accounts.length} conta{activeFilters.accounts.length === 1 ? '' : 's'}
                          </Badge>
                        )}
                        {activeFilters.tags.length > 0 && (
                          <Badge variant="secondary" className={`${filterBadgeClassName} border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-300`}>
                            {activeFilters.tags.length} tag{activeFilters.tags.length === 1 ? '' : 's'}
                          </Badge>
                        )}
                        {activeFilters.statuses.length > 0 && (
                          <Badge variant="secondary" className={`${filterBadgeClassName} border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300`}>
                            {activeFilters.statuses.length} situação{activeFilters.statuses.length === 1 ? '' : 'ões'}
                          </Badge>
                        )}
                        {activeFilters.types.length > 0 && (
                          <Badge variant="secondary" className={`${filterBadgeClassName} border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300`}>
                            {activeFilters.types.length} tipo{activeFilters.types.length === 1 ? '' : 's'}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {(selectedAccountForFilter || selectedCategoryForFilter || selectedTypeForFilter || activeFilters) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveFilters(null);
                    if (selectedAccountForFilter || selectedCategoryForFilter || selectedTypeForFilter) {
                      navigate('/transacoes');
                    }
                  }}
                  className="rounded-xl border-border/70"
                >
                  <X size={14} className="mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {groupedTransactions.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-border/70 bg-surface-elevated/50 px-6 py-14 text-center text-muted-foreground">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <Wallet size={30} />
                </div>
                <p className="mb-2 text-lg font-medium text-foreground">Nenhuma transação encontrada</p>
                <p className="text-sm">Crie sua primeira transação para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedTransactions.map((transaction) => {
                  const category = transaction.category || getCategoryById(transaction.category_id);
                  const account =
                    transaction.account || accounts.find((item) => item.id === transaction.account_id);
                  const typeColors = TYPE_COLORS[transaction.type];
                  const rowTone = rowToneByType[transaction.type];
                  const isGroupedInstallment = Boolean(transaction.groupedInstallments?.length);
                  const installmentAmount = transaction.amount;
                  const totalInstallments =
                    transaction.total_installments || transaction.groupedInstallmentCount || 0;
                  const amountToDisplay = transaction.displayAmount ?? transaction.amount;

                  return (
                    <Card
                      key={transaction.id}
                      className={`cursor-pointer rounded-2xl border border-border/70 border-l-4 bg-surface/90 shadow-[0_14px_36px_rgba(3,8,20,0.18)] transition-all duration-200 hover:translate-x-1 hover:bg-surface-elevated/85 hover:shadow-[0_18px_40px_rgba(3,8,20,0.24)] ${rowTone.border}`}
                      onClick={() => handleEdit(transaction)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="relative shrink-0">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${rowTone.iconWrap}`}>
                                {renderTransactionIcon(transaction.type, category)}
                              </div>
                              {account && (() => {
                                const bankCode = detectBankFromName(account.name);
                                if (!bankCode) return null;
                                const BankIcon = getBankLogo(bankCode);
                                const bankColor = getBankColor(bankCode);
                                return (
                                  <div
                                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card"
                                    style={{ backgroundColor: bankColor }}
                                  >
                                    <BankIcon size={12} className="text-white" />
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-lg font-semibold text-foreground">
                                  {transaction.displayDescription || transaction.description}
                                </h3>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                                <span>{category?.name || 'Sem categoria'}</span>
                                <span>•</span>
                                <span>{account?.name || 'Sem conta'}</span>
                                {!transaction.is_paid && <Badge variant="warning" className="whitespace-nowrap text-xs">Pendente</Badge>}
                                {isGroupedInstallment && (
                                  <Badge variant="info" className="whitespace-nowrap text-xs">
                                    Parcelado {totalInstallments}x
                                  </Badge>
                                )}
                                {isGroupedInstallment && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {transaction.displayPurchaseTotal != null
                                        ? `${totalInstallments}x de ${formatCurrency(installmentAmount)}`
                                        : `${totalInstallments} parcelas de ${formatCurrency(installmentAmount)}`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-4 shrink-0 text-right">
                            <p className={`text-lg font-bold ${rowTone.amount}`}>
                              {transaction.type === 'expense' ? '- ' : '+ '}
                              {formatCurrency(amountToDisplay)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatRelativeDate(transaction.transaction_date)}
                            </p>
                            {isGroupedInstallment &&
                              transaction.displayPurchaseTotal != null &&
                              Math.abs(Number(transaction.displayPurchaseTotal) - Number(amountToDisplay)) > 0.009 && (
                                <p className="mt-0.5 ml-auto max-w-[14rem] text-right text-xs text-muted-foreground">
                                  Compra total {formatCurrency(transaction.displayPurchaseTotal)} · competência no mês {formatCurrency(amountToDisplay)}
                                </p>
                              )}
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

      {dialogOpen ? (
        <TransactionDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedTransaction(undefined);
              setPreSelectedType(undefined);
            }
          }}
          transaction={selectedTransaction}
          onSave={handleSave}
          onSaveComplete={async () => {
            await fetchTransactions();
          }}
          onDelete={handleDelete}
          defaultType={preSelectedType}
        />
      ) : null}

      {filtersModalOpen ? (
        <AdvancedFiltersModal
          open={filtersModalOpen}
          onOpenChange={setFiltersModalOpen}
          onApplyFilters={(filters) => {
            setActiveFilters(filters);
            toast.success('Filtros aplicados com sucesso!');
          }}
          currentFilters={activeFilters || undefined}
        />
      ) : null}
    </div>
  );
};
