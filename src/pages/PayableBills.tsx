import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Receipt, TrendingUp, BarChart3 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { usePayableBills } from '@/hooks/usePayableBills';
import { useRecurringTrend } from '@/hooks/useRecurringTrend';
import { BillSummaryCards } from '@/components/payable-bills/BillSummaryCards';
import { BillList } from '@/components/payable-bills/BillList';
import { BillDialog } from '@/components/payable-bills/BillDialog';
import { BillPaymentDialog } from '@/components/payable-bills/BillPaymentDialog';
import { BillFilters } from '@/components/payable-bills/BillFilters';
import { BillTimeline } from '@/components/payable-bills/BillTimeline';
import { RecurringBillCard } from '@/components/payable-bills/RecurringBillCard';
import { BillHistoryTable } from '@/components/payable-bills/BillHistoryTable';
import { RecurringBillTrendChart } from '@/components/payable-bills/RecurringBillTrendChart';
import { RecurringBillVariationAlert } from '@/components/payable-bills/RecurringBillVariationAlert';
import { BillAnalyticsDashboard } from '@/components/payable-bills/BillAnalyticsDashboard';
import { ExportButton } from '@/components/payable-bills/ExportButton';
import { ReminderConfigDialog } from '@/components/payable-bills/ReminderConfigDialog';
import { BillSortSelect, SortOption } from '@/components/payable-bills/BillSortSelect';
import { AttentionSection } from '@/components/payable-bills/AttentionSection';
import { BillCategoryFilter, CategoryFilter } from '@/components/payable-bills/BillCategoryFilter';
import { BillTable } from '@/components/payable-bills/BillTable';
import { ViewToggle, ViewMode } from '@/components/payable-bills/ViewToggle';
import { PayableBill, CreateBillInput, MarkBillAsPaidInput } from '@/types/payable-bills.types';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
import { parseISO } from 'date-fns';

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
    markAsPaid,
  } = usePayableBills();

  // Hook de Analytics de Recorrências
  const {
    alerts: variationAlerts,
    chartData: trendChartData,
    loading: trendLoading
  } = useRecurringTrend();

  // Preferências de formatação do usuário
  const { formatCurrency, formatDate } = useUserPreferences();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PayableBill | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Ordenar contas baseado na opção selecionada
  const sortedBills = useMemo(() => {
    const sorted = [...bills];
    
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

  // Filtrar por categoria
  const filteredBills = useMemo(() => {
    if (categoryFilter === 'all') return sortedBills;
    return sortedBills.filter((bill) => bill.bill_type === categoryFilter);
  }, [sortedBills, categoryFilter]);

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

  const handleDelete = async (bill: PayableBill) => {
    if (confirm(`Tem certeza que deseja deletar "${bill.description}"?`)) {
      await deleteBill(bill.id);
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
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">
              Todas ({bills.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Próximas 7 dias ({upcomingBills.length})
            </TabsTrigger>
            <TabsTrigger value="recurring">
              Recorrentes ({recurringBills.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              Histórico ({paidBills.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-1" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="h-4 w-4 mr-1" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: TODAS */}
          <TabsContent value="all" className="space-y-6">
            {/* Seção de Atenção Necessária */}
            {!loading && (
              <AttentionSection
                bills={bills}
                onPay={handlePay}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConfigReminders={handleConfigReminders}
              />
            )}

            {/* Barra de Controles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-muted-foreground">
                📋 Todas as Contas ({filteredBills.length})
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <BillCategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
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
                  emptyMessage="Nenhuma conta cadastrada. Clique em 'Nova Conta' para começar."
                />
              )}
            </motion.div>
          </TabsContent>

          {/* ABA 2: PRÓXIMAS 7 DIAS */}
          <TabsContent value="upcoming" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {loading ? (
                <div className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="h-32 bg-muted animate-pulse rounded-lg"
                    ></div>
                  ))}
                </div>
              ) : (
                <BillTimeline
                  bills={upcomingBills}
                  onPay={handlePay}
                />
              )}
            </motion.div>
          </TabsContent>

          {/* ABA 3: RECORRENTES */}
          <TabsContent value="recurring" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 bg-muted animate-pulse rounded-lg"
                    ></div>
                  ))}
                </div>
              ) : recurringBills.length === 0 ? (
                <div className="text-center py-16">
                  <div className="rounded-full bg-muted p-6 w-fit mx-auto mb-4">
                    <Receipt className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhuma conta recorrente
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Crie contas recorrentes para que sejam geradas automaticamente
                    todos os meses
                  </p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Conta Recorrente
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {recurringBills.map((bill) => (
                    <RecurringBillCard
                      key={bill.id}
                      bill={bill}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* ABA 4: HISTÓRICO */}
          <TabsContent value="history" className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {loading ? (
                <div className="h-96 bg-muted animate-pulse rounded-lg"></div>
              ) : (
                <BillHistoryTable bills={paidBills} />
              )}
            </motion.div>
          </TabsContent>

          {/* ABA 5: ANALYTICS */}
          <TabsContent value="analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Alertas de Variação */}
              {variationAlerts && variationAlerts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    🔔 Alertas de Variação
                  </h3>
                  <RecurringBillVariationAlert 
                    alerts={variationAlerts}
                    maxAlerts={3}
                  />
                </div>
              )}

              {/* Gráfico de Tendências */}
              <RecurringBillTrendChart 
                data={trendChartData}
                loading={trendLoading}
              />

              {/* Info Card */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <h4 className="font-semibold text-sm mb-2">
                  💡 Como funciona o Analytics
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• O sistema monitora automaticamente suas contas recorrentes</li>
                  <li>• Alertas aparecem quando há variação maior que 15% no valor</li>
                  <li>• O gráfico mostra a tendência dos últimos 12 meses</li>
                  <li>• Novos dados são atualizados a cada 5 minutos</li>
                </ul>
              </div>
            </motion.div>
          </TabsContent>

          {/* ABA 6: RELATÓRIOS */}
          <TabsContent value="reports" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Header com Export */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Relatórios e Analytics</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visão completa dos seus gastos e performance
                  </p>
                </div>
                <ExportButton bills={bills} />
              </div>

              {/* Dashboard */}
              <BillAnalyticsDashboard />
            </motion.div>
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
    </div>
  );
}
