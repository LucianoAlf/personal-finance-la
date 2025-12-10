import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Receipt, BarChart3, History, Trash2, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { usePayableBills } from '@/hooks/usePayableBills';
import { BillSummaryCards } from '@/components/payable-bills/BillSummaryCards';
import { BillList } from '@/components/payable-bills/BillList';
import { BillDialog } from '@/components/payable-bills/BillDialog';
import { BillPaymentDialog } from '@/components/payable-bills/BillPaymentDialog';
import { BillFilters } from '@/components/payable-bills/BillFilters';
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
import { parseISO, isAfter, isBefore, addDays, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

export default function PayableBills() {
  const {
    bills,
    pendingBills,
    overdueBills,
    paidBills,
    upcomingBills,
    recurringBills,
    summary,
    loading,
    filters,
    setFilters,
    createBill,
    createInstallmentBills,
    updateBill,
    deleteBill,
    deleteInstallmentGroup,
    markAsPaid,
  } = usePayableBills();

  // Hook de Analytics de Recorrências (para alertas na seção de atenção)
  const { alerts: variationAlerts } = useRecurringTrend();

  // Preferências de formatação do usuário
  const { formatCurrency, formatDate } = useUserPreferences();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<PayableBill | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<PayableBill | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('due_soon');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>('all');
  const [recurrenceTypeFilter, setRecurrenceTypeFilter] = useState<RecurrenceTypeOption>('all');

  // Ordenar e filtrar contas baseado na opção selecionada
  const sortedBills = useMemo(() => {
    let sorted = [...bills];
    
    // Primeiro: aplicar filtros de status (se selecionado)
    switch (sortOption) {
      case 'only_pending':
        sorted = sorted.filter(b => b.status === 'pending');
        // Ordenar por vencimento próximo
        return sorted.sort((a, b) => 
          parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
        );
      case 'only_overdue':
        sorted = sorted.filter(b => b.status === 'overdue');
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
        return sorted.sort((a, b) => 
          parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
        );
      case 'due_late':
        return sorted.sort((a, b) => 
          parseISO(b.due_date).getTime() - parseISO(a.due_date).getTime()
        );
      case 'amount_high':
        return sorted.sort((a, b) => b.amount - a.amount);
      case 'amount_low':
        return sorted.sort((a, b) => a.amount - b.amount);
      case 'overdue_first':
        return sorted.sort((a, b) => {
          if (a.status === 'overdue' && b.status !== 'overdue') return -1;
          if (a.status !== 'overdue' && b.status === 'overdue') return 1;
          return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
        });
      default:
        return sorted;
    }
  }, [bills, sortOption]);

  // Filtrar por período, categoria e tipo de recorrência
  const filteredBills = useMemo(() => {
    let filtered = sortedBills;
    const today = new Date();
    
    // Filtrar por período
    switch (periodFilter) {
      case 'next_7_days':
        const in7Days = addDays(today, 7);
        filtered = filtered.filter((bill) => {
          const dueDate = parseISO(bill.due_date);
          return bill.status !== 'paid' && isBefore(dueDate, in7Days) && isAfter(dueDate, addDays(today, -1));
        });
        break;
      case 'this_month':
        filtered = filtered.filter((bill) => {
          const dueDate = parseISO(bill.due_date);
          return isSameMonth(dueDate, today);
        });
        break;
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
    
    // Filtrar por categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((bill) => bill.bill_type === categoryFilter);
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
    
    return filtered;
  }, [sortedBills, periodFilter, categoryFilter, recurrenceTypeFilter]);

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
      await createInstallmentBills({ ...data, installment_total: data.installment_total });
    } else {
      await createBill(data);
    }
  };

  const handleEdit = (bill: PayableBill) => {
    setSelectedBill(bill);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (data: CreateBillInput) => {
    if (!selectedBill) return;
    await updateBill(selectedBill.id, data);
    setSelectedBill(null);
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
          <>
            <BillFilters filters={filters} onFiltersChange={setFilters} />
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* Cards de Resumo */}
        <BillSummaryCards
          pendingAmount={summary.pending_amount}
          pendingCount={summary.pending_count}
          overdueAmount={summary.overdue_amount}
          overdueCount={summary.overdue_count}
          paidAmount={summary.paid_amount}
          paidCount={summary.paid_count}
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
                bills={bills}
                onPay={handlePay}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConfigReminders={handleConfigReminders}
              />
            )}

            {/* Barra de Controles */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-muted-foreground">
                📋 Contas a Pagar ({filteredBills.length})
              </h3>
              <div className="flex flex-wrap items-center gap-2">
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
                    {periodFilter !== 'all' 
                      ? 'Tente alterar os filtros para ver mais contas.'
                      : 'Clique em "Nova Conta" para começar a cadastrar suas contas.'}
                  </p>
                  {periodFilter === 'all' && (
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
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
                />
              ) : (
                <BillList
                  bills={filteredBills}
                  onPay={handlePay}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onConfigReminders={handleConfigReminders}
                  onDeleteInstallmentGroup={handleDeleteInstallmentGroup}
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
                <BillHistoryTable bills={paidBills} onDelete={handleDelete} />
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
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
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
