import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Receipt, BarChart3, History, Trash2, AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { usePayableBills } from '@/hooks/usePayableBills';
import { useCategories } from '@/hooks/useCategories';
import { BillSummaryCards } from '@/components/payable-bills/BillSummaryCards';
import { BillList } from '@/components/payable-bills/BillList';
import { BillDialog } from '@/components/payable-bills/BillDialog';
import { BillPaymentDialog } from '@/components/payable-bills/BillPaymentDialog';
import { BillHistoryTable } from '@/components/payable-bills/BillHistoryTable';
import { BillReportsDashboard } from '@/components/payable-bills/reports';
import { ReminderConfigDialog } from '@/components/payable-bills/ReminderConfigDialog';
import { RecurringBillVariationAlert } from '@/components/payable-bills/RecurringBillVariationAlert';
import { useRecurringTrend } from '@/hooks/useRecurringTrend';
import { BillSortSelect, SortOption } from '@/components/payable-bills/BillSortSelect';
import { AttentionSection } from '@/components/payable-bills/AttentionSection';
import { BillCategoryFilter, CategoryFilter } from '@/components/payable-bills/BillCategoryFilter';
import { BillTable } from '@/components/payable-bills/BillTable';
import { ViewToggle, ViewMode } from '@/components/payable-bills/ViewToggle';
import { PeriodFilter, PeriodOption } from '@/components/payable-bills/PeriodFilter';
import { RecurrenceTypeFilter, type RecurrenceTypeOption } from '@/components/payable-bills/RecurrenceTypeFilter';
import { BillCalendar } from '@/components/payable-bills/BillCalendar';
import { PayableBill, CreateBillInput, MarkBillAsPaidInput } from '@/types/payable-bills.types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import { parseISO, format, isAfter, isBefore, addDays, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isBillOverdue } from '@/utils/billCalculations';

export default function PayableBills() {
  const {
    bills,
    paidBills,
    loading,
    filters,
    setFilters,
    createBill,
    createInstallmentBills,
    updateBill,
    deleteBill,
    deleteInstallmentGroup,
    markAsPaid,
    revertPayment,
  } = usePayableBills();

  // Hook de Analytics de Recorrências (para alertas na seção de atenção)
  const { alerts: variationAlerts } = useRecurringTrend();

  // Hook de Categorias (para mapeamento no filtro)
  const { categories } = useCategories();

  // Preferências de formatação do usuário
  const { formatCurrency, formatDate } = useUserPreferences();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<PayableBill | null>(null);
  const [billToRevert, setBillToRevert] = useState<PayableBill | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<PayableBill | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('due_soon');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>('this_month');
  const [recurrenceTypeFilter, setRecurrenceTypeFilter] = useState<RecurrenceTypeOption>('all');
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [monthModalOpen, setMonthModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const isAllAccountsMode = periodFilter === 'all';

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());

  const handlePreviousMonth = () => {
    setSelectedMonthDate((current) => subMonths(current, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonthDate((current) => addMonths(current, 1));
  };

  const handlePreviousYear = () => {
    setSelectedMonthDate((current) => {
      const newDate = new Date(current);
      newDate.setFullYear(newDate.getFullYear() - 1);
      return newDate;
    });
  };

  const handleNextYear = () => {
    setSelectedMonthDate((current) => {
      const newDate = new Date(current);
      newDate.setFullYear(newDate.getFullYear() + 1);
      return newDate;
    });
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonthDate((current) => {
      const newDate = new Date(current);
      newDate.setMonth(monthIndex);
      return newDate;
    });
    setMonthModalOpen(false);
  };

  const handleCurrentMonth = () => {
    setSelectedMonthDate(new Date());
    setMonthModalOpen(false);
  };

  const monthFilteredBills = useMemo(
    () => bills.filter((bill) => isSameMonth(parseISO(bill.due_date), selectedMonthDate)),
    [bills, selectedMonthDate]
  );

  const scopeBills = useMemo(
    () => (isAllAccountsMode ? bills : monthFilteredBills),
    [bills, isAllAccountsMode, monthFilteredBills]
  );

  // Ordenar e filtrar contas baseado na opção selecionada
  const sortedBills = useMemo(() => {
    let sorted = [...scopeBills];
    
    // Primeiro: aplicar filtros de status (se selecionado)
    switch (sortOption) {
      case 'only_pending':
        // Pendentes: status pending E não vencidas
        sorted = sorted.filter(b => b.status === 'pending' && !isBillOverdue(b.due_date));
        // Ordenar por vencimento próximo
        return sorted.sort((a, b) => 
          parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
        );
      case 'only_overdue':
        // Filtrar por data de vencimento < hoje (não depende do status do banco)
        sorted = sorted.filter(b => b.status !== 'paid' && isBillOverdue(b.due_date));
        // Ordenar por mais atrasadas primeiro
        return sorted.sort((a, b) => 
          parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
        );
      case 'only_paid':
        sorted = sorted.filter(b => b.status === 'paid');
        // Ordenar por mais recentes pagas
        return sorted.sort((a, b) => 
          new Date(b.paid_at || b.updated_at).getTime() - new Date(a.paid_at || a.updated_at).getTime()
        );
    }
    
    // Segundo: aplicar ordenação
    switch (sortOption) {
      case 'recent':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'due_soon':
        // Excluir pagas - mostrar apenas pendentes/vencidas ordenadas por vencimento próximo
        sorted = sorted.filter(b => b.status !== 'paid');
        return sorted.sort((a, b) => 
          parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
        );
      case 'due_late':
        // Excluir pagas - mostrar apenas pendentes/vencidas ordenadas por vencimento distante
        sorted = sorted.filter(b => b.status !== 'paid');
        return sorted.sort((a, b) => 
          parseISO(b.due_date).getTime() - parseISO(a.due_date).getTime()
        );
      case 'amount_high':
        return sorted.sort((a, b) => b.amount - a.amount);
      case 'amount_low':
        return sorted.sort((a, b) => a.amount - b.amount);
      case 'overdue_first':
        return sorted.sort((a, b) => {
          const aOverdue = a.status !== 'paid' && isBillOverdue(a.due_date);
          const bOverdue = b.status !== 'paid' && isBillOverdue(b.due_date);
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;
          return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        });
      default:
        return sorted;
    }
  }, [scopeBills, sortOption]);

  // Filtrar por período, categoria e tipo de recorrência
  const filteredBills = useMemo(() => {
    let filtered = sortedBills;
    const today = new Date();
    const normalizedSearch = searchInput.trim().toLowerCase();
    
    // Filtrar por período
    switch (periodFilter) {
      case 'all':
      case 'this_month':
        break;
      case 'next_7_days': {
        const in7Days = addDays(today, 7);
        filtered = filtered.filter((bill) => {
          const dueDate = parseISO(bill.due_date);
          return bill.status !== 'paid' && isBefore(dueDate, in7Days) && isAfter(dueDate, addDays(today, -1));
        });
        break;
      }
      case 'recurring':
        filtered = filtered.filter((bill) => bill.is_recurring);
        break;
      case 'installments':
        filtered = filtered.filter((bill) => bill.is_installment);
        break;
      case 'one_time':
        filtered = filtered.filter((bill) => !bill.is_recurring && !bill.is_installment);
        break;
    }
    
    // Filtrar por categoria (category_id do banco de dados)
    // Mapeamento: category_id (UUID) → bill_type (enum)
    // As payable_bills usam bill_type, mas o filtro usa category_id
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((bill) => {
        // Se a conta tem category_id preenchido, comparar diretamente
        if (bill.category_id) {
          return bill.category_id === categoryFilter;
        }
        
        // Fallback: mapear category_id para bill_type baseado no nome da categoria
        // Buscar a categoria selecionada para obter o nome
        const selectedCategory = categories.find(c => c.id === categoryFilter);
        if (!selectedCategory) return false;
        
        // Mapeamento de nome de categoria para bill_type
        const categoryToBillType: Record<string, string[]> = {
          'Contas de Consumo': ['service'],
          'Assinaturas': ['subscription', 'telecom'],
          'Moradia': ['housing'],
          'Educação': ['education'],
          'Saúde': ['healthcare'],
          'Seguros': ['insurance'],
          'Empréstimo': ['loan'],
          'Financiamento': ['installment'],
          'Impostos': ['tax'],
          'Alimentação': ['food'],
          'Outros': ['other'],
        };
        
        const billTypes = categoryToBillType[selectedCategory.name];
        if (billTypes) {
          return billTypes.includes(bill.bill_type);
        }
        
        // Se não encontrou mapeamento, não mostrar
        return false;
      });
    }
    
    // Filtrar por tipo de recorrência (fixa/variável)
    if (recurrenceTypeFilter !== 'all') {
      const variableTypes = ['variable', 'service'];
      filtered = filtered.filter((bill) => {
        switch (recurrenceTypeFilter) {
          case 'variable':
            return variableTypes.includes(bill.bill_type);
          case 'fixed':
            return !variableTypes.includes(bill.bill_type);
          default:
            return true;
        }
      });
    }

    if (normalizedSearch) {
      filtered = filtered.filter((bill) =>
        bill.description.toLowerCase().includes(normalizedSearch) ||
        bill.provider_name?.toLowerCase().includes(normalizedSearch)
      );
    }
    
    return filtered;
  }, [sortedBills, periodFilter, categoryFilter, recurrenceTypeFilter, categories, searchInput]);

  const displaySummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summaryPendingBills = filteredBills.filter((bill) => {
      if (bill.status !== 'pending' && bill.status !== 'scheduled') return false;
      const dueDate = parseISO(bill.due_date);
      return dueDate >= today;
    });

    const summaryOverdueBills = filteredBills.filter((bill) => {
      if (bill.status === 'paid') return false;
      const dueDate = parseISO(bill.due_date);
      return dueDate < today;
    });

    const summaryPaidBills = filteredBills.filter((bill) => bill.status === 'paid');

    return {
      pendingAmount: summaryPendingBills.reduce((sum, bill) => sum + bill.amount, 0),
      pendingCount: summaryPendingBills.length,
      overdueAmount: summaryOverdueBills.reduce((sum, bill) => sum + bill.amount, 0),
      overdueCount: summaryOverdueBills.length,
      paidAmount: summaryPaidBills.reduce((sum, bill) => sum + bill.amount, 0),
      paidCount: summaryPaidBills.length,
    };
  }, [filteredBills]);

  const monthAwarePaidBills = useMemo(
    () => (isAllAccountsMode ? paidBills : paidBills.filter((bill) => isSameMonth(parseISO(bill.due_date), selectedMonthDate))),
    [isAllAccountsMode, paidBills, selectedMonthDate]
  );

  // Handler para copiar/duplicar conta
  const handleCopy = async (bill: PayableBill) => {
    const newBill: CreateBillInput = {
      description: `${bill.description} (cópia)`,
      amount: bill.amount,
      due_date: bill.due_date,
      bill_type: bill.bill_type,
      provider_name: bill.provider_name,
      is_recurring: bill.is_recurring,
      recurrence_config: bill.recurrence_config,
      reminder_enabled: bill.reminder_enabled,
      reminder_days_before: bill.reminder_days_before,
      priority: bill.priority,
      notes: bill.notes,
    };
    await createBill(newBill);
    toast.success('Conta duplicada com sucesso!');
  };

  // Handlers
  const handleCreate = async (data: CreateBillInput) => {
    if (data.is_installment && data.installment_total && data.installment_total > 1) {
      return await createInstallmentBills({ ...data, installment_total: data.installment_total });
    }

    return await createBill(data);
  };

  const handleCreateDialogChange = (open: boolean) => {
    if (open) {
      setSelectedBill(null);
    }

    setCreateDialogOpen(open);
  };

  const handleEdit = (bill: PayableBill) => {
    setSelectedBill(bill);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (data: CreateBillInput) => {
    if (!selectedBill) return;
    const updatedBill = await updateBill(selectedBill.id, data);
    setSelectedBill(null);
    return updatedBill;
  };

  const handleDelete = (bill: PayableBill) => {
    setBillToDelete(bill);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (billToDelete) {
      await deleteBill(billToDelete.id);
      setBillToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteInstallmentGroup = (groupId: string) => {
    setGroupToDelete(groupId);
    setDeleteGroupDialogOpen(true);
  };

  const confirmDeleteGroup = async () => {
    if (groupToDelete) {
      await deleteInstallmentGroup(groupToDelete);
      setGroupToDelete(null);
      setDeleteGroupDialogOpen(false);
    }
  };

  const handlePay = (bill: PayableBill) => {
    setSelectedBill(bill);
    setPaymentDialogOpen(true);
  };

  const handleConfigReminders = (bill: PayableBill) => {
    setSelectedBill(bill);
    setReminderDialogOpen(true);
  };

  const handleRevertPayment = (bill: PayableBill) => {
    setBillToRevert(bill);
    setRevertDialogOpen(true);
  };

  const confirmRevertPayment = async () => {
    if (billToRevert) {
      await revertPayment(billToRevert.id);
      setBillToRevert(null);
      setRevertDialogOpen(false);
    }
  };

  const handleMarkAsPaid = async (data: MarkBillAsPaidInput) => {
    await markAsPaid(data);
    setSelectedBill(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Contas a Pagar"
        subtitle="Gerencie suas contas e vencimentos"
        icon={<Receipt size={24} />}
        actions={
          <Button onClick={() => handleCreateDialogChange(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <div className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Competência</p>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMonthModalOpen(true)}
                  className="min-w-[180px] justify-center font-medium"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {formatMonthYear(selectedMonthDate)}
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleCurrentMonth}>
                  Hoje
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              {isAllAccountsMode
                ? 'Modo expandido ativo: exibindo contas de todos os meses.'
                : `As visões Cards, Tabela e Calendário estão sincronizadas em ${formatMonthYear(selectedMonthDate)}.`}
            </div>
          </div>
        </Card>

        {/* Cards de Resumo */}
        <BillSummaryCards
          pendingAmount={displaySummary.pendingAmount}
          pendingCount={displaySummary.pendingCount}
          overdueAmount={displaySummary.overdueAmount}
          overdueCount={displaySummary.overdueCount}
          paidAmount={displaySummary.paidAmount}
          paidCount={displaySummary.paidCount}
        />

        {/* Tabs */}
        <Tabs defaultValue="bills" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bills">
              <Receipt className="h-4 w-4 mr-1" />
              Contas ({filteredBills.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1" />
              Histórico ({paidBills.length})
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-4 w-4 mr-1" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: CONTAS A PAGAR (UNIFICADA) */}
          <TabsContent value="bills" className="space-y-6">
            {/* Alertas de Variação de Contas Recorrentes */}
            {!loading && variationAlerts && variationAlerts.length > 0 && viewMode !== 'calendar' && (
              <div className="mb-4">
                <RecurringBillVariationAlert 
                  alerts={variationAlerts}
                  maxAlerts={2}
                />
              </div>
            )}

            {/* Seção de Atenção Necessária */}
            {!loading && viewMode !== 'calendar' && (
              <AttentionSection
                bills={filteredBills}
                onPay={handlePay}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onConfigReminders={handleConfigReminders}
              />
            )}

            {/* Barra de Controles */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar por descricao ou fornecedor"
                  className="pl-9"
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                <PeriodFilter value={periodFilter} onChange={setPeriodFilter} />
                <BillCategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
                {periodFilter === 'recurring' && (
                  <RecurrenceTypeFilter value={recurrenceTypeFilter} onChange={setRecurrenceTypeFilter} />
                )}
                <BillSortSelect value={sortOption} onChange={setSortOption} />
                <ViewToggle value={viewMode} onChange={setViewMode} />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 bg-muted animate-pulse rounded-lg"
                    ></div>
                  ))}
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center py-16">
                  <div className="rounded-full bg-muted p-6 w-fit mx-auto mb-4">
                    <Receipt className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhuma conta encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {isAllAccountsMode
                      ? 'Clique em "Nova Conta" para começar a cadastrar suas contas.'
                      : `Nenhuma conta encontrada em ${formatMonthYear(selectedMonthDate)}. Tente alterar os filtros ou navegar para outro mês.`}
                  </p>
                  {isAllAccountsMode && (
                    <Button
                      onClick={() => handleCreateDialogChange(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Conta
                    </Button>
                  )}
                </div>
              ) : viewMode === 'calendar' ? (
                <BillCalendar
                  bills={filteredBills}
                  currentMonth={selectedMonthDate}
                  onMonthChange={setSelectedMonthDate}
                  showEmbeddedHeader={false}
                  onPay={handlePay}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ) : viewMode === 'table' ? (
                <BillTable
                  bills={filteredBills}
                  onPay={handlePay}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  onConfigReminders={handleConfigReminders}
                  onRevertPayment={handleRevertPayment}
                />
              ) : (
                <BillList
                  bills={filteredBills}
                  onPay={handlePay}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                  onConfigReminders={handleConfigReminders}
                  onDeleteInstallmentGroup={handleDeleteInstallmentGroup}
                  onRevertPayment={handleRevertPayment}
                  emptyMessage="Nenhuma conta cadastrada. Clique em 'Nova Conta' para começar."
                />
              )}
            </motion.div>
          </TabsContent>

          {/* ABA 2: HISTÓRICO */}
          <TabsContent value="history" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {loading ? (
                <div className="h-96 bg-muted animate-pulse rounded-lg"></div>
              ) : (
                <BillHistoryTable bills={monthAwarePaidBills} onDelete={handleDelete} />
              )}
            </motion.div>
          </TabsContent>

          {/* ABA 3: RELATÓRIOS (UNIFICADA) */}
          <TabsContent value="reports" className="space-y-6">
            <BillReportsDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <BillDialog
        key="create-bill-dialog"
        open={createDialogOpen}
        onOpenChange={handleCreateDialogChange}
        onSubmit={handleCreate}
      />

      <BillDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdate}
        bill={selectedBill || undefined}
      />

      <BillPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSubmit={handleMarkAsPaid}
        bill={selectedBill}
      />

      <ReminderConfigDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        bill={selectedBill}
        onSuccess={() => {
          toast.success('Lembretes configurados com sucesso!');
        }}
      />

      {/* Dialog de Confirmação - Deletar Conta */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Deletar Conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar <strong>"{billToDelete?.description}"</strong>?
              <br />
              <span className="text-muted-foreground">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Reverter Pagamento */}
      <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reverter Pagamento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Tem certeza que deseja reverter o pagamento de <strong>"{billToRevert?.description}"</strong>?
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Mudar status para "Pendente"</li>
                <li>Remover registro de pagamento</li>
                <li>Reverter saldo da conta bancária</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevertPayment}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Reverter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={monthModalOpen} onOpenChange={setMonthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Selecionar Competência</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <Button variant="ghost" size="icon" onClick={handlePreviousYear} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <h2 className="text-xl font-bold min-w-[80px] text-center">
                {selectedMonthDate.getFullYear()}
              </h2>

              <Button variant="ghost" size="icon" onClick={handleNextYear} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {months.map((month, index) => {
                const isCurrentMonth = selectedMonthDate.getMonth() === index;
                const isTodayMonth = new Date().getMonth() === index && new Date().getFullYear() === selectedMonthDate.getFullYear();

                return (
                  <Button
                    key={month}
                    variant={isCurrentMonth ? 'default' : 'outline'}
                    onClick={() => handleMonthSelect(index)}
                    className={isCurrentMonth ? '' : isTodayMonth ? 'border-primary/40 text-primary' : ''}
                  >
                    {month}
                  </Button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setMonthModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCurrentMonth}>
                Mês Atual
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação - Deletar Parcelamento */}
      <AlertDialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deletar Parcelamento Completo
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar <strong>TODO o parcelamento</strong>?
              <br />
              <span className="text-red-500 font-medium">Todas as parcelas serão removidas permanentemente.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGroup}
              className="bg-red-500 hover:bg-red-600"
            >
              Deletar Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
