import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInvestments } from '@/hooks/useInvestments';
import { useInvestmentGoals } from '@/hooks/useInvestmentGoals';
import { useInvestmentPrices } from '@/hooks/useInvestmentPrices';
import { useInvestmentTransactions } from '@/hooks/useInvestmentTransactions';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';
import { useInvestmentAlerts } from '@/hooks/useInvestmentAlerts';
import { PriceUpdater } from '@/components/investments/PriceUpdater';
import { MarketStatus } from '@/components/investments/MarketStatus';
import { InvestmentDialog } from '@/components/investments/InvestmentDialog';
import { TransactionDialog } from '@/components/investments/TransactionDialog';
import { TransactionTimeline } from '@/components/investments/TransactionTimeline';
import { PortfolioSummaryCards } from '@/components/investments/PortfolioSummaryCards';
import { AlertDialog } from '@/components/investments/AlertDialog';
import { AlertsList } from '@/components/investments/AlertsList';
import { AssetAllocationChart } from '@/components/investments/AssetAllocationChart';
import { PortfolioEvolutionChart } from '@/components/investments/PortfolioEvolutionChart';
import { PerformanceBarChart } from '@/components/investments/PerformanceBarChart';
import { DividendCalendar } from '@/components/investments/DividendCalendar';
import { DividendHistoryTable } from '@/components/investments/DividendHistoryTable';
import { OpportunityFeed } from '@/components/investments/OpportunityFeed';
import { SmartRebalanceWidget } from '@/components/investments/SmartRebalanceWidget';
import { AnaInvestmentInsights } from '@/components/investments/AnaInvestmentInsights';
import { InvestmentPlanningCalculator } from '@/components/investments/InvestmentPlanningCalculator';
import { BadgesDisplay } from '@/components/investments/BadgesDisplay';
import { DiversificationScoreCard } from '@/components/investments/DiversificationScoreCard';
import { PerformanceHeatMap } from '@/components/investments/PerformanceHeatMap';
import { BenchmarkComparison } from '@/components/investments/BenchmarkComparison';
import { InvestmentReportDialog } from '@/components/investments/InvestmentReportDialog';
import { useDividendCalendar, useDividendHistory } from '@/hooks/useDividendCalendar';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { SlidingPillTabs } from '@/components/ui/sliding-pill-tabs';
import { useInvestmentsActiveTab, type InvestmentTab } from '@/hooks/useInvestmentsActiveTab';
import { InvestmentsHeroCard } from '@/components/investments/InvestmentsHeroCard';
import { PortfolioCardList } from '@/components/investments/PortfolioCardList';
import { TransactionsCardList, type TransactionItem } from '@/components/investments/TransactionsCardList';
import { DividendsCardList, type DividendPaidItem, type DividendUpcomingItem } from '@/components/investments/DividendsCardList';
import { DividendCalendarSheet } from '@/components/investments/DividendCalendarSheet';
import { AlertsCardList, type InvestmentAlertItem } from '@/components/investments/AlertsCardList';
import { OverviewMobileLayout } from '@/components/investments/OverviewMobileLayout';
import { useMarketStatus } from '@/hooks/useMarketStatus';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Target, ChevronRight } from 'lucide-react';
import {
  Plus,
  TrendingUp,
  Loader2,
  BarChart3,
  ArrowLeftRight,
  Bell,
  DollarSign,
} from 'lucide-react';
import type { CreateInvestmentInput, CreateTransactionInput } from '@/types/database.types';
import {
  resolveInvestmentDisplayPrice,
  resolveInvestmentDisplayValue,
  resolveInvestmentTotalInvested,
} from '@/utils/investments/pricing';
import { buildInvestmentPriceItems, buildOverviewPlanningDefaults } from '@/utils/investments/overview';

const investmentTabsListClassName =
  'grid h-auto w-full grid-cols-5 rounded-[1.4rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]';

const investmentTabsTriggerClassName =
  'flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15';

const investmentsPrimaryButtonClass =
  'h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.24)] hover:bg-primary/90';

const investmentsSecondaryButtonClass =
  'h-11 rounded-xl border border-border/70 bg-surface/85 px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-surface-elevated dark:bg-surface-elevated/80 dark:hover:bg-surface-overlay';

const investmentsPanelCardClassName =
  'border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

export function Investments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { investments, loading, refresh, addInvestment, updateInvestment } = useInvestments();
  const { goals: investmentGoals } = useInvestmentGoals({ lightweight: true });
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    refresh: refreshTransactions,
  } = useInvestmentTransactions({ autoLoad: false });
  const { alerts, addAlert, deleteAlert, toggleAlert } = useInvestmentAlerts();
  const { formatCurrency } = useUserPreferences();

  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [activeTab, setActiveTab] = useInvestmentsActiveTab('portfolio');
  const [dividendCalendarSheetOpen, setDividendCalendarSheetOpen] = useState(false);
  const selectedGoalId = searchParams.get('goalId');

  useEffect(() => {
    if (activeTab === 'transactions' || activeTab === 'dividends' || activeTab === 'overview') {
      void refreshTransactions();
    }
  }, [activeTab, refreshTransactions]);

  const relatedGoalsByInvestment = useMemo(() => {
    const map = new Map<string, typeof investmentGoals>();

    investmentGoals.forEach((goal) => {
      goal.linked_investments?.forEach((investmentId) => {
        const current = map.get(investmentId) || [];
        map.set(investmentId, [...current, goal]);
      });
    });

    return map;
  }, [investmentGoals]);

  const priceItems = useMemo(() => buildInvestmentPriceItems(investments), [investments]);

  const {
    quotes,
    loading: quotesLoading,
    lastUpdate,
    refresh: refreshPrices,
  } = useInvestmentPrices({
    items: priceItems,
    autoRefresh: true,
  });

  const investmentsWithMarketData = useMemo(
    () =>
      investments.map((investment) => {
        const quoteKey = (investment.ticker || investment.name).toUpperCase();
        const quote = quotes.get(quoteKey);

        return {
          ...investment,
          total_invested: resolveInvestmentTotalInvested(investment),
          current_price: resolveInvestmentDisplayPrice(investment, quote),
          current_value: resolveInvestmentDisplayValue(investment, quote),
        };
      }),
    [investments, quotes]
  );

  const metrics = usePortfolioMetrics(investmentsWithMarketData);
  const dividendCalendar = useDividendCalendar({ investments: investmentsWithMarketData, transactions });
  const dividendHistory = useDividendHistory(transactions);
  const planningDefaults = useMemo(
    () =>
      buildOverviewPlanningDefaults({
        goals: investmentGoals,
        metrics: {
          currentValue: metrics.currentValue,
        },
        selectedGoalId,
      }),
    [investmentGoals, metrics.currentValue, selectedGoalId]
  );

  const { selectedGoal, planningYears, monthlyContribution: planningContribution } = planningDefaults;

  // ── Mobile metric derivations ──────────────────────────────────────────────
  const totalInvestedValue = metrics?.totalInvested ?? investments.reduce((acc, inv) => acc + (inv.total_invested ?? 0), 0);
  const currentPortfolioValue = metrics?.currentValue ?? investments.reduce((acc, inv) => acc + (inv.current_value ?? 0), 0);
  const totalReturnValue = currentPortfolioValue - totalInvestedValue;
  const totalReturnPctValue = totalInvestedValue > 0 ? (totalReturnValue / totalInvestedValue) * 100 : 0;
  const monthlyYieldValue = 0; // not exposed by usePortfolioMetrics; fallback to 0

  // ── Mobile transaction items ───────────────────────────────────────────────
  const mobileTransactionItems = useMemo<TransactionItem[]>(
    () =>
      transactions.map((tx) => ({
        id: tx.id,
        ticker: (tx as any).ticker ?? (tx as any).investment?.ticker ?? '',
        transaction_type: tx.transaction_type,
        quantity: tx.quantity,
        price: tx.price,
        total_amount: tx.total_amount,
        transaction_date: tx.transaction_date,
      })),
    [transactions],
  );

  const handleTransactionCardTap = (tx: TransactionItem) => {
    console.debug('Tap transaction', tx.id);
  };

  // ── Mobile dividend items ──────────────────────────────────────────────────
  const paidDividendItems = useMemo<DividendPaidItem[]>(() => {
    return (dividendHistory.transactions ?? [])
      .filter((d: any) => d.transaction_type === 'dividend' || d.transaction_type === 'jscp')
      .map((d: any) => ({
        id: String(d.id),
        ticker: (d as any).ticker ?? '',
        subtitle: 'Dividendo',
        amount: Number(d.total_amount ?? d.amount ?? 0),
        date: new Date(d.transaction_date ?? d.date ?? Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      }));
  }, [dividendHistory.transactions]);

  const upcomingDividendItems = useMemo<DividendUpcomingItem[]>(() => {
    return (dividendCalendar.next30Days
      ? ([] as any[])  // next30Days is a number total, not an array — calendar doesn't expose per-ticker upcoming list
      : []);
  }, [dividendCalendar.next30Days]);

  // ── Mobile market status + last update labels ───────────────────────────────
  const { b3 } = useMarketStatus();
  const mobileMarketIsOpen = b3.isOpen;
  const mobileMarketLabel = b3.isOpen ? 'B3 Aberta' : 'B3 Fechada';
  const mobileLastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return undefined;
    return `há ${formatDistanceToNow(lastUpdate, { locale: ptBR, addSuffix: false })}`;
  }, [lastUpdate]);

  // ── Mobile alert items ─────────────────────────────────────────────────────
  const mobileAlertItems = useMemo<InvestmentAlertItem[]>(
    () =>
      (alerts ?? []).map((a) => ({
        id: a.id,
        ticker: a.ticker,
        description: `${a.ticker} ${a.alert_type === 'price_above' ? '>' : '<'} ${formatCurrency(Number(a.target_value ?? 0))}`,
        subtitle: a.triggered_at
          ? `Disparado ${new Date(a.triggered_at).toLocaleDateString('pt-BR')}`
          : `Criado ${new Date(a.created_at).toLocaleDateString('pt-BR')}`,
        active: Boolean(a.is_active),
      })),
    [alerts, formatCurrency],
  );

  const handleEditAlert = (alert: InvestmentAlertItem) => {
    // The desktop page uses AlertDialog for new alerts only; no edit-existing flow — noop.
    console.debug('Edit alert', alert.id);
  };

  const handleDeleteAlert = (alertId: string) => {
    void deleteAlert(alertId);
  };

  const handleToggleAlert = (alertId: string, active: boolean) => {
    void toggleAlert(alertId, active);
  };

  const handleSaveInvestment = async (data: any) => {
    if (editingInvestment) {
      await updateInvestment(editingInvestment.id, data);
    } else {
      await addInvestment(data as CreateInvestmentInput);
    }
    setEditingInvestment(null);
    refresh();
  };

  const handleEditInvestment = (investment: any) => {
    setEditingInvestment(investment);
    setInvestmentDialogOpen(true);
  };

  const handleAddTransaction = async (data: CreateTransactionInput) => {
    await addTransaction(data);
    await refresh();
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    await refresh();
  };

  const openNewInvestmentDialog = () => {
    setEditingInvestment(null);
    setInvestmentDialogOpen(true);
  };

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="hidden lg:flex items-center gap-3">
        <MarketStatus />
        <PriceUpdater onRefresh={refreshPrices} lastUpdate={lastUpdate} loading={quotesLoading} />
        <InvestmentReportDialog
          investments={investments}
          transactions={transactions}
          onPrefetchTransactions={() => void refreshTransactions()}
        />
      </div>
      <Button size="sm" onClick={openNewInvestmentDialog} className={investmentsPrimaryButtonClass}>
        <Plus size={16} className="mr-1" />
        <span className="hidden sm:inline">Novo Investimento</span>
      </Button>
    </div>
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      stock: 'Ação',
      fund: 'Fundo',
      treasury: 'Tesouro Direto',
      crypto: 'Criptomoeda',
      real_estate: 'Imóveis',
      other: 'Outro',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          title="Investimentos"
          subtitle="Acompanhe sua carteira de investimentos"
          icon={<TrendingUp size={24} />}
          actions={headerActions}
        />

        <div className="space-y-6 px-5 pb-10 pt-6 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className={`animate-pulse ${investmentsPanelCardClassName}`}>
                <CardContent className="space-y-3 p-6">
                  <div className="h-4 w-28 rounded bg-muted" />
                  <div className="h-8 w-36 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted/70" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InvestmentTab)}>
            <TabsList className={investmentTabsListClassName}>
              <TabsTrigger value="portfolio" className={investmentTabsTriggerClassName}>
                <BarChart3 className="h-4 w-4" />
                Portfólio
              </TabsTrigger>
              <TabsTrigger value="transactions" className={investmentTabsTriggerClassName}>
                <ArrowLeftRight className="h-4 w-4" />
                Transações
              </TabsTrigger>
              <TabsTrigger value="dividends" className={investmentTabsTriggerClassName}>
                <DollarSign className="h-4 w-4" />
                Dividendos
              </TabsTrigger>
              <TabsTrigger value="alerts" className={investmentTabsTriggerClassName}>
                <Bell className="h-4 w-4" />
                Alertas
              </TabsTrigger>
              <TabsTrigger value="overview" className={investmentTabsTriggerClassName}>
                Visão Geral
              </TabsTrigger>
            </TabsList>

            <Card className={investmentsPanelCardClassName}>
              <CardContent className="p-10 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                <p>Carregando investimentos...</p>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    );
  }

  if (investments.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        {investmentDialogOpen ? (
          <InvestmentDialog
            open={investmentDialogOpen}
            onOpenChange={setInvestmentDialogOpen}
            investment={editingInvestment}
            onSave={handleSaveInvestment}
          />
        ) : null}

        <Header
          title="Investimentos"
          subtitle="Acompanhe sua carteira de investimentos"
          icon={<TrendingUp size={24} />}
          actions={headerActions}
        />

        <div className="px-5 pb-10 pt-6 sm:px-6">
          <Card className={`${investmentsPanelCardClassName} p-12 text-center`}>
            <div className="mb-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-surface shadow-sm">
                <TrendingUp size={28} className="text-primary" />
              </div>
            </div>
            <h3 className="mb-2 text-xl font-semibold">Nenhum investimento cadastrado</h3>
            <p className="mb-6 text-muted-foreground">
              Comece a construir seu portfólio adicionando seu primeiro investimento.
            </p>
            <Button onClick={openNewInvestmentDialog} className={investmentsPrimaryButtonClass}>
              <Plus size={16} className="mr-2" />
              Adicionar primeiro investimento
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Investimentos"
        subtitle="Acompanhe sua carteira de investimentos"
        icon={<TrendingUp size={24} />}
        actions={headerActions}
      />

      <div className="space-y-6 px-5 pb-10 pt-6 sm:px-6">
        {investmentDialogOpen ? (
          <InvestmentDialog
            open={investmentDialogOpen}
            onOpenChange={setInvestmentDialogOpen}
            investment={editingInvestment}
            onSave={handleSaveInvestment}
          />
        ) : null}

        {transactionDialogOpen ? (
          <TransactionDialog
            open={transactionDialogOpen}
            onOpenChange={setTransactionDialogOpen}
            onSave={handleAddTransaction}
          />
        ) : null}

        {alertDialogOpen ? (
          <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen} onSave={addAlert} />
        ) : null}

        {selectedGoal && (
          <Card className="hidden lg:block border-primary/20 bg-gradient-to-r from-primary/6 via-background to-background shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:border-primary/15 dark:from-primary/10 dark:via-card dark:to-card">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-primary">Contexto da meta</p>
                <h2 className="text-lg font-semibold text-foreground">{selectedGoal.name}</h2>
                <p className="text-sm text-muted-foreground">
                  A carteira vinculada cobre{' '}
                  {formatCurrency(
                    selectedGoal.metrics?.effective_current_amount ?? selectedGoal.current_amount
                  )}{' '}
                  de {formatCurrency(selectedGoal.target_amount)}.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className={investmentsSecondaryButtonClass}
                  onClick={() => navigate('/metas?tab=investments')}
                >
                  Ver meta
                </Button>
                <Button
                  className={investmentsPrimaryButtonClass}
                  onClick={() => setActiveTab('portfolio')}
                >
                  Ver ativos vinculados
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Desktop-only: summary cards ─────────────────────────────────── */}
        <div className="hidden lg:block">
          <PortfolioSummaryCards
            totalInvested={metrics.totalInvested}
            currentValue={metrics.currentValue}
            totalReturn={metrics.totalReturn}
            returnPercentage={metrics.returnPercentage}
          />
        </div>

        {/* ── Desktop-only: Radix Tabs ─────────────────────────────────────── */}
        <div className="hidden lg:block">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InvestmentTab)}>
            <TabsList className={investmentTabsListClassName}>
              <TabsTrigger value="portfolio" className={investmentTabsTriggerClassName}>
                <BarChart3 className="h-4 w-4" />
                Portfólio
              </TabsTrigger>
              <TabsTrigger value="transactions" className={investmentTabsTriggerClassName}>
                <ArrowLeftRight className="h-4 w-4" />
                Transações
              </TabsTrigger>
              <TabsTrigger value="dividends" className={investmentTabsTriggerClassName}>
                <DollarSign className="h-4 w-4" />
                Dividendos
              </TabsTrigger>
              <TabsTrigger value="alerts" className={investmentTabsTriggerClassName}>
                <Bell className="h-4 w-4" />
                Alertas
              </TabsTrigger>
              <TabsTrigger value="overview" className={investmentTabsTriggerClassName}>
                Visão Geral
              </TabsTrigger>
            </TabsList>

            {activeTab === 'portfolio' ? (
              <div className="mt-2 space-y-4" role="tabpanel" aria-labelledby="tab-portfolio">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Minha carteira</h2>
                    <p className="text-sm text-muted-foreground">
                      Visão consolidada dos seus ativos, posições e vínculos com metas.
                    </p>
                  </div>

                  <Button className={investmentsPrimaryButtonClass} onClick={openNewInvestmentDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                <Card className={investmentsPanelCardClassName}>
                  <CardHeader className="border-b border-border/60 pb-5">
                    <CardTitle className="text-2xl">Portfólio</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[940px]">
                        <thead className="bg-surface/65 text-muted-foreground">
                          <tr className="border-b border-border/60">
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em]">
                              Tipo
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em]">
                              Símbolo
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                              Quantidade
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                              Preço médio
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                              Cotação
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                              Total
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.22em]">
                              Rentabilidade
                            </th>
                            <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em]">
                              Metas
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {investmentsWithMarketData.map((investment) => {
                            const totalInvested = resolveInvestmentTotalInvested(investment);
                            const totalCurrent = resolveInvestmentDisplayValue(investment);
                            const gain = totalCurrent - totalInvested;
                            const gainPercentage =
                              totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
                            const linkedGoals = relatedGoalsByInvestment.get(investment.id) || [];

                            return (
                              <tr
                                key={investment.id}
                                className="border-b border-border/60 transition-colors hover:bg-surface/65"
                              >
                                <td className="px-5 py-4 text-sm text-foreground">
                                  {getTypeLabel(investment.type)}
                                </td>
                                <td className="px-5 py-4 text-sm font-semibold text-foreground">
                                  {investment.ticker || investment.name}
                                </td>
                                <td className="px-5 py-4 text-right text-sm text-muted-foreground">
                                  {investment.quantity}
                                </td>
                                <td className="px-5 py-4 text-right text-sm text-muted-foreground">
                                  {formatCurrency(investment.purchase_price)}
                                </td>
                                <td className="px-5 py-4 text-right text-sm text-muted-foreground">
                                  {formatCurrency(resolveInvestmentDisplayPrice(investment))}
                                </td>
                                <td className="px-5 py-4 text-right text-sm font-semibold text-foreground">
                                  {formatCurrency(totalCurrent)}
                                </td>
                                <td
                                  className={`px-5 py-4 text-right text-sm font-semibold ${
                                    gainPercentage >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                  }`}
                                >
                                  {gainPercentage >= 0 ? '+' : ''}
                                  {gainPercentage.toFixed(2)}%
                                </td>
                                <td className="px-5 py-4 text-sm">
                                  <div className="flex flex-wrap gap-2">
                                    {linkedGoals.length === 0 ? (
                                      <span className="text-muted-foreground">Sem vínculo</span>
                                    ) : (
                                      linkedGoals.map((goal) => (
                                        <Badge
                                          key={goal.id}
                                          variant={goal.id === selectedGoalId ? 'default' : 'secondary'}
                                          className="cursor-pointer rounded-full"
                                          onClick={() => navigate('/metas?tab=investments')}
                                        >
                                          {goal.name}
                                        </Badge>
                                      ))
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeTab === 'transactions' ? (
              <div className="mt-2 space-y-4" role="tabpanel" aria-labelledby="tab-transactions">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Histórico de transações</h2>
                    <p className="text-sm text-muted-foreground">
                      Acompanhe aportes, vendas, dividendos e movimentações do portfólio.
                    </p>
                  </div>

                  <Button
                    className={investmentsPrimaryButtonClass}
                    onClick={() => setTransactionDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova transação
                  </Button>
                </div>

                <TransactionTimeline transactions={transactions} onDelete={handleDeleteTransaction} />
              </div>
            ) : null}

            {activeTab === 'dividends' ? (
              <div className="mt-2 space-y-6" role="tabpanel" aria-labelledby="tab-dividends">
                <DividendCalendar
                  monthlyBreakdown={dividendCalendar.monthlyBreakdown}
                  totalEstimated={dividendCalendar.totalEstimated}
                  next30Days={dividendCalendar.next30Days}
                  next90Days={dividendCalendar.next90Days}
                />

                <DividendHistoryTable
                  transactions={dividendHistory.transactions}
                  totalReceived={dividendHistory.totalReceived}
                  yearlyTotals={dividendHistory.yearlyTotals}
                  count={dividendHistory.count}
                />
              </div>
            ) : null}

            {activeTab === 'alerts' ? (
              <div className="mt-2 space-y-4" role="tabpanel" aria-labelledby="tab-alerts">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Alertas de preço</h2>
                    <p className="text-sm text-muted-foreground">
                      Monitore oportunidades e riscos da carteira com alertas configuráveis.
                    </p>
                  </div>

                  <Button
                    className={investmentsPrimaryButtonClass}
                    onClick={() => setAlertDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo alerta
                  </Button>
                </div>

                <AlertsList alerts={alerts} onDelete={deleteAlert} onToggle={toggleAlert} />
              </div>
            ) : null}

            {activeTab === 'overview' ? (
              <div className="mt-2 space-y-6" role="tabpanel" aria-labelledby="tab-overview">
                <AnaInvestmentInsights investments={investmentsWithMarketData} />

                <InvestmentPlanningCalculator
                  title="Planejamento patrimonial e aposentadoria"
                  description="Simule patrimônio alvo, renda futura e o aporte mensal necessário com base na sua carteira real."
                  initialCurrentAmount={planningDefaults.currentAmount}
                  initialMonthlyContribution={planningContribution}
                  initialTargetAmount={planningDefaults.targetAmount}
                  initialYearsToGoal={planningYears}
                  initialAnnualReturnRate={planningDefaults.annualReturnRate}
                  initialDesiredMonthlyIncome={planningDefaults.desiredMonthlyIncome}
                />

                <DiversificationScoreCard investments={investmentsWithMarketData} />
                <PerformanceHeatMap />
                <BenchmarkComparison />

                <div className="grid gap-6 lg:grid-cols-2">
                  <AssetAllocationChart data={Object.values(metrics.allocation)} />
                  <PortfolioEvolutionChart
                    totalInvested={metrics.totalInvested}
                    currentValue={metrics.currentValue}
                  />
                </div>

                <PerformanceBarChart investments={investmentsWithMarketData} />
                <OpportunityFeed />
                <SmartRebalanceWidget investments={investmentsWithMarketData} />
                <BadgesDisplay />
              </div>
            ) : null}
          </Tabs>
        </div>

        {/* ── Mobile subtree ───────────────────────────────────────────────── */}
        <div className="lg:hidden">
          <InvestmentsHeroCard
            currentValue={currentPortfolioValue}
            totalInvested={totalInvestedValue}
            totalReturn={totalReturnValue}
            totalReturnPct={totalReturnPctValue}
            monthlyYield={monthlyYieldValue}
            formatCurrency={formatCurrency}
            marketStatusLabel={mobileMarketLabel}
            marketIsOpen={mobileMarketIsOpen}
            lastUpdateLabel={mobileLastUpdateLabel}
            onRefresh={() => void refreshPrices()}
            refreshing={quotesLoading}
          />

          {selectedGoal ? (
            <button
              type="button"
              onClick={() => navigate('/metas?tab=investments')}
              className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2.5 text-left transition-colors hover:bg-primary/12"
            >
              <Target size={14} className="flex-shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                Vinculado a {selectedGoal.name}
              </span>
              <ChevronRight size={14} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          ) : null}

          <div className="mx-4 mt-3">
            <SlidingPillTabs
              tabs={[
                { value: 'portfolio', label: 'Portf' },
                { value: 'transactions', label: 'Trans' },
                { value: 'dividends', label: 'Divid' },
                { value: 'alerts', label: 'Alert' },
                { value: 'overview', label: 'Visão' },
              ]}
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as InvestmentTab)}
              ariaLabel="Abas de investimentos"
            />
          </div>

          {activeTab === 'portfolio' && (
            <PortfolioCardList
              investments={investmentsWithMarketData}
              onCardTap={handleEditInvestment}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsCardList
              transactions={mobileTransactionItems}
              onCardTap={handleTransactionCardTap}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === 'dividends' && (
            <DividendsCardList
              paidThisMonth={paidDividendItems}
              upcoming30Days={upcomingDividendItems}
              formatCurrency={formatCurrency}
              onOpenCalendar={() => setDividendCalendarSheetOpen(true)}
            />
          )}
          {activeTab === 'alerts' && (
            <AlertsCardList
              alerts={mobileAlertItems}
              onEdit={handleEditAlert}
              onDelete={handleDeleteAlert}
              onToggle={handleToggleAlert}
            />
          )}
          {activeTab === 'overview' && (
            <OverviewMobileLayout
              investments={investmentsWithMarketData}
              totalInvested={totalInvestedValue}
              currentValue={currentPortfolioValue}
            />
          )}

          <DividendCalendarSheet
            open={dividendCalendarSheetOpen}
            onOpenChange={setDividendCalendarSheetOpen}
          />
        </div>
      </div>
    </div>
  );
}
