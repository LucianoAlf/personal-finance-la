import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, TrendingUp, TrendingDown, Wallet, X, List, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { AdvancedFiltersModal, type FilterConfig } from '@/components/transactions/AdvancedFiltersModal';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { ACCOUNT_TYPES } from '@/constants/accounts';
import { format } from 'date-fns';
import type { Transaction, TransactionType } from '@/types/transactions';
import { TYPE_COLORS } from '@/constants/categories';
import * as LucideIcons from 'lucide-react';
import { getBankLogo, detectBankFromName, getBankColor } from '@/constants/bankLogos';

export const Transacoes = () => {
  // HOOKS E NAVEGAÇÃO
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const accountIdFromUrl = searchParams.get('account');
  const categoryIdFromUrl = searchParams.get('category');

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
    fetchTransactions,
  } = useTransactions();

  const { accounts } = useAccounts();
  const { getCategoryById, fetchCategories } = useCategories();
  const { formatCurrency, formatDate, formatRelativeDate } = useUserPreferences();

  // ESTADOS
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [preSelectedType, setPreSelectedType] = useState<TransactionType | undefined>();
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig | null>(null);

  // Forçar refetch ao carregar a página
  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  // FILTRO POR CONTA (vindo da URL)
  const selectedAccountForFilter = accountIdFromUrl 
    ? accounts.find(a => a.id === accountIdFromUrl) 
    : null;
  const selectedCategoryForFilter = categoryIdFromUrl
    ? getCategoryById(categoryIdFromUrl)
    : null;

  // FUNÇÃO PARA NORMALIZAR TEXTO (remove acentos e lowercase)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // FILTRAR TRANSAÇÕES POR MÊS SELECIONADO
  let filteredTransactions = transactions.filter(t => {
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const selectedYearMonth = `${selectedYear}-${selectedMonth}`;
    // Compara apenas YYYY-MM (sem new Date que causa bug de timezone)
    return t.transaction_date?.startsWith(selectedYearMonth);
  });

  // FILTRAR POR CONTA (se filtro ativo na URL)
  if (accountIdFromUrl) {
    filteredTransactions = filteredTransactions.filter(t => t.account_id === accountIdFromUrl);
  }
  if (categoryIdFromUrl) {
    filteredTransactions = filteredTransactions.filter(t => t.category_id === categoryIdFromUrl);
  }

  // FILTRAR POR PESQUISA (em tempo real)
  if (searchQuery.trim()) {
    const normalizedQuery = normalizeText(searchQuery);
    
    filteredTransactions = filteredTransactions.filter(transaction => {
      const category = transaction.category || getCategoryById(transaction.category_id);
      const account = transaction.account || accounts.find(a => a.id === transaction.account_id);
      
      // Função auxiliar para buscar no início de palavras
      const matchesWordStart = (text: string, query: string) => {
        const normalizedText = normalizeText(text);
        // Busca no início do texto ou após espaço
        return normalizedText.startsWith(query) || normalizedText.includes(' ' + query);
      };
      
      // Busca na descrição (prioridade 1)
      const matchDescription = matchesWordStart(transaction.description, normalizedQuery);
      
      // Busca na categoria (prioridade 2)
      const matchCategory = category ? matchesWordStart(category.name, normalizedQuery) : false;
      
      // Busca no valor (exato)
      const matchAmount = transaction.amount.toString().includes(searchQuery.trim());
      
      // Busca na conta (prioridade 3)
      const matchAccount = account ? matchesWordStart(account.name, normalizedQuery) : false;
      
      return matchDescription || matchCategory || matchAmount || matchAccount;
    });
  }

  // FILTRAR POR FILTROS AVANÇADOS
  if (activeFilters) {
    filteredTransactions = filteredTransactions.filter(transaction => {
      // 1. FILTRO DE DATA
      if (activeFilters.dateRange.from || activeFilters.dateRange.to) {
        const transactionDate = new Date(transaction.transaction_date);
        
        if (activeFilters.dateRange.from) {
          const fromDate = new Date(activeFilters.dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (transactionDate < fromDate) return false;
        }
        
        if (activeFilters.dateRange.to) {
          const toDate = new Date(activeFilters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (transactionDate > toDate) return false;
        }
      }

      // 2. FILTRO DE CATEGORIAS
      if (activeFilters.categories.length > 0) {
        if (!transaction.category_id || !activeFilters.categories.includes(transaction.category_id)) {
          return false;
        }
      }

      // 3. FILTRO DE CONTAS
      if (activeFilters.accounts.length > 0) {
        if (!transaction.account_id || !activeFilters.accounts.includes(transaction.account_id)) {
          return false;
        }
      }

      // 4. FILTRO DE TAGS
      if (activeFilters.tags.length > 0) {
        const transactionTagIds = transaction.tags?.map(t => t.id) || [];
        const hasMatchingTag = activeFilters.tags.some(tagId => transactionTagIds.includes(tagId));
        if (!hasMatchingTag) return false;
      }

      // 5. FILTRO DE SITUAÇÕES
      if (activeFilters.statuses.length > 0) {
        let matchesStatus = false;
        
        activeFilters.statuses.forEach(status => {
          if (status === 'paid' && transaction.is_paid) matchesStatus = true;
          if (status === 'pending' && !transaction.is_paid) matchesStatus = true;
          if (status === 'recurring' && transaction.is_recurring) matchesStatus = true;
        });
        
        if (!matchesStatus) return false;
      }

      // 6. FILTRO DE TIPOS
      if (activeFilters.types.length > 0) {
        if (!activeFilters.types.includes(transaction.type)) {
          return false;
        }
      }

      return true;
    });
  }

  // FORMATAÇÃO DE DATA
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase());
  };

  const months = [
    'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
    'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
  ];

  // HANDLERS DE NAVEGAÇÃO
  const handlePreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const handlePreviousYear = () => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() - 1);
    setSelectedDate(newDate);
  };

  const handleNextYear = () => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() + 1);
    setSelectedDate(newDate);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(monthIndex);
    setSelectedDate(newDate);
    setMonthModalOpen(false);
  };

  const handleCurrentMonth = () => {
    setSelectedDate(new Date());
    setMonthModalOpen(false);
  };

  // CALCULAR TOTAIS DO MÊS (DADOS REAIS) - Sempre usar filteredTransactions
  const monthlyIncome = filteredTransactions
    .filter(t => t.type === 'income' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyExpenses = filteredTransactions
    .filter(t => t.type === 'expense' && t.is_paid)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyBalance = monthlyIncome - monthlyExpenses;

  // Handler para remover filtro de conta
  const handleRemoveAccountFilter = () => {
    navigate('/transacoes');
  };
  const handleRemoveCategoryFilter = () => {
    // Mantém filtro de conta, se existir
    const params = new URLSearchParams(location.search);
    params.delete('category');
    const query = params.toString();
    navigate(`/transacoes${query ? `?${query}` : ''}`);
  };

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
      if (selectedTransaction) {
        // MODO EDIÇÃO - ATUALIZAR
        await updateTransaction(selectedTransaction.id, data);
        toast.success('Transação atualizada com sucesso!');
      } else {
        // MODO CRIAÇÃO - ADICIONAR
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
    setSelectedTransaction(undefined);
    setPreSelectedType(type);
    setDialogOpen(true);
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
        icon={<List size={24} />}
        actions={
          <>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleNewTransaction('income')}
            >
              <Plus className="mr-2" size={16} />
              Nova Receita
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
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

        {/* SEÇÃO DE FILTROS */}
        <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Barra de Pesquisa */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Pesquise por descrição, categoria ou valor"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Controles de Filtro (Mês + Filtros Avançados) */}
              <div className="flex items-center gap-3">
                {/* Seletor de Mês */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousMonth}
                    className="h-8 w-8"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setMonthModalOpen(true)}
                    className="px-4 py-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 font-medium min-w-[140px]"
                  >
                    {formatMonthYear(selectedDate)}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>

                {/* Botão de Filtros Avançados */}
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => setFiltersModalOpen(true)}
                >
                  <Filter size={16} />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LISTA DE TRANSAÇÕES - DADOS REAIS */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Todas as Transações ({filteredTransactions.length})
                </h2>
                
                {/* Botão Limpar Filtros */}
                {(selectedAccountForFilter || selectedCategoryForFilter || activeFilters) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveFilters(null);
                      if (selectedAccountForFilter || selectedCategoryForFilter) navigate('/transacoes');
                    }}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X size={14} className="mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* BADGES DE FILTROS ATIVOS */}
              {(selectedAccountForFilter || selectedCategoryForFilter || activeFilters) && (
                <div className="flex flex-wrap gap-2">
                  {/* Filtro de Conta (da URL) */}
                  {selectedAccountForFilter && (
                    <Badge 
                      className="flex items-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer px-3 py-1.5"
                      onClick={handleRemoveAccountFilter}
                    >
                      <span className="font-medium">
                        {selectedAccountForFilter.name} - {ACCOUNT_TYPES[selectedAccountForFilter.type]}
                      </span>
                      <X size={14} className="hover:text-purple-900" />
                    </Badge>
                  )}

                  {/* Filtro de Categoria (da URL) */}
                  {selectedCategoryForFilter && (
                    <Badge 
                      className="flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer px-3 py-1.5"
                      onClick={handleRemoveCategoryFilter}
                    >
                      <span className="font-medium">
                        {selectedCategoryForFilter.name}
                      </span>
                      <X size={14} className="hover:text-green-900" />
                    </Badge>
                  )}

                  {/* Filtros Avançados */}
                  {activeFilters && (
                    <>
                      {/* Data */}
                      {(activeFilters.dateRange.from || activeFilters.dateRange.to) && (
                        <Badge className="bg-blue-100 text-blue-700 px-3 py-1.5">
                          📅 {activeFilters.dateRange.from && format(activeFilters.dateRange.from, 'dd/MM/yy')}
                          {activeFilters.dateRange.from && activeFilters.dateRange.to && ' - '}
                          {activeFilters.dateRange.to && format(activeFilters.dateRange.to, 'dd/MM/yy')}
                        </Badge>
                      )}

                      {/* Categorias */}
                      {activeFilters.categories.length > 0 && (
                        <Badge className="bg-green-100 text-green-700 px-3 py-1.5">
                          🏷️ {activeFilters.categories.length} {activeFilters.categories.length === 1 ? 'categoria' : 'categorias'}
                        </Badge>
                      )}

                      {/* Contas */}
                      {activeFilters.accounts.length > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 px-3 py-1.5">
                          💳 {activeFilters.accounts.length} {activeFilters.accounts.length === 1 ? 'conta' : 'contas'}
                        </Badge>
                      )}

                      {/* Tags */}
                      {activeFilters.tags.length > 0 && (
                        <Badge className="bg-pink-100 text-pink-700 px-3 py-1.5">
                          🔖 {activeFilters.tags.length} {activeFilters.tags.length === 1 ? 'tag' : 'tags'}
                        </Badge>
                      )}

                      {/* Situações */}
                      {activeFilters.statuses.length > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1.5">
                          ⚡ {activeFilters.statuses.length} {activeFilters.statuses.length === 1 ? 'situação' : 'situações'}
                        </Badge>
                      )}

                      {/* Tipos */}
                      {activeFilters.types.length > 0 && (
                        <Badge className="bg-indigo-100 text-indigo-700 px-3 py-1.5">
                          📊 {activeFilters.types.length} {activeFilters.types.length === 1 ? 'tipo' : 'tipos'}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma transação encontrada</p>
                <p className="text-sm">Crie sua primeira transação para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
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
                            {/* Ícone da Categoria com Logo do Banco */}
                            <div className="relative">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColors.bg}`}
                              >
                                {category && renderCategoryIcon(category.icon, category.color)}
                              </div>
                              {/* Logo do Banco (pequeno, no canto) */}
                              {account && (() => {
                                const bankCode = detectBankFromName(account.name);
                                if (bankCode) {
                                  const BankIcon = getBankLogo(bankCode);
                                  const bankColor = getBankColor(bankCode);
                                  return (
                                    <div
                                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                                      style={{ backgroundColor: bankColor }}
                                    >
                                      <BankIcon size={12} className="text-white" />
                                    </div>
                                  );
                                }
                                return null;
                              })()}
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

      {/* MODAL DE SELEÇÃO DE MÊS */}
      <Dialog open={monthModalOpen} onOpenChange={setMonthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Selecionar Período</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Header com ano */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousYear}
                className="h-8 w-8"
              >
                <ChevronLeft size={16} />
              </Button>
              
              <h2 className="text-xl font-bold text-purple-600 min-w-[80px] text-center">
                {selectedDate.getFullYear()}
              </h2>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextYear}
                className="h-8 w-8"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            
            {/* Grid de meses */}
            <div className="grid grid-cols-4 gap-3">
              {months.map((month, index) => {
                const isCurrentMonth = selectedDate.getMonth() === index;
                const isToday = new Date().getMonth() === index && new Date().getFullYear() === selectedDate.getFullYear();
                
                return (
                  <Button
                    key={month}
                    variant={isCurrentMonth ? "default" : "outline"}
                    onClick={() => handleMonthSelect(index)}
                    className={`h-10 text-sm font-medium ${
                      isCurrentMonth 
                        ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                        : isToday
                        ? 'border-purple-200 text-purple-600 hover:bg-purple-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {month}
                  </Button>
                );
              })}
            </div>
            
            {/* Botões */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={() => setMonthModalOpen(false)}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={handleCurrentMonth}
                className="bg-purple-500 hover:bg-purple-600"
              >
                MÊS ATUAL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE FILTROS AVANÇADOS */}
      <AdvancedFiltersModal
        open={filtersModalOpen}
        onOpenChange={setFiltersModalOpen}
        onApplyFilters={(filters) => {
          setActiveFilters(filters);
          toast.success('Filtros aplicados com sucesso!');
        }}
        currentFilters={activeFilters || undefined}
      />
    </div>
  );
};
