import { useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDividendCalendar, useDividendHistory } from '@/hooks/useDividendCalendar';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Plus, TrendingUp, TrendingDown, Loader2, BarChart3, ArrowLeftRight, Bell, DollarSign } from 'lucide-react';
import type { CreateInvestmentInput, UpdateInvestmentInput, CreateTransactionInput } from '@/types/database.types';
import {
  resolveInvestmentDisplayPrice,
  resolveInvestmentDisplayValue,
  resolveInvestmentTotalInvested,
} from '@/utils/investments/pricing';
import {
  buildInvestmentPriceItems,
  buildOverviewPlanningDefaults,
} from '@/utils/investments/overview';

export function Investments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { investments, loading, refresh, addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const { goals: investmentGoals } = useInvestmentGoals();
  const { transactions, addTransaction, deleteTransaction } = useInvestmentTransactions();
  const { alerts, addAlert, deleteAlert, toggleAlert } = useInvestmentAlerts();
  const { formatCurrency } = useUserPreferences();
  
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('portfolio');
  const selectedGoalId = searchParams.get('goalId');

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

  // Hook de cotações em tempo real
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

  // Handlers
  const handleSaveInvestment = async (data: any) => {
    if (editingInvestment) {
      await updateInvestment(editingInvestment.id, data);
    } else {
      await addInvestment(data as CreateInvestmentInput);
    }
    setEditingInvestment(null);
    refresh();
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando investimentos...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (investments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InvestmentDialog
          open={investmentDialogOpen}
          onOpenChange={setInvestmentDialogOpen}
          investment={editingInvestment}
          onSave={handleSaveInvestment}
        />
        <Header
          title="Investimentos"
          subtitle="Acompanhe sua carteira de investimentos"
          icon={<TrendingUp size={24} />}
          actions={
            <Button size="sm" onClick={openNewInvestmentDialog}>
              <Plus size={16} className="mr-1" />
              Novo Investimento
            </Button>
          }
        />
        <div className="p-6">
          <Card className="p-12 text-center">
            <div className="mb-4">
              <TrendingUp size={48} className="mx-auto text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Nenhum investimento cadastrado</h3>
            <p className="text-gray-600 mb-6">
              Comece a construir seu portfólio adicionando seu primeiro investimento
            </p>
            <Button onClick={openNewInvestmentDialog}>
              <Plus size={16} className="mr-2" />
              Adicionar Primeiro Investimento
            </Button>
          </Card>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Investimentos"
        subtitle="Acompanhe sua carteira de investimentos"
        icon={<TrendingUp size={24} />}
        actions={
          <div className="flex items-center gap-3">
            <MarketStatus />
            <PriceUpdater
              onRefresh={refreshPrices}
              lastUpdate={lastUpdate}
              loading={quotesLoading}
            />
            <InvestmentReportDialog />
            <Button
              size="sm"
              onClick={openNewInvestmentDialog}
            >
              <Plus size={16} className="mr-1" />
              Novo Investimento
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Dialogs */}
        <InvestmentDialog
          open={investmentDialogOpen}
          onOpenChange={setInvestmentDialogOpen}
          investment={editingInvestment}
          onSave={handleSaveInvestment}
        />

        <TransactionDialog
          open={transactionDialogOpen}
          onOpenChange={setTransactionDialogOpen}
          onSave={handleAddTransaction}
        />

        <AlertDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          onSave={addAlert}
        />

        {selectedGoal && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Contexto da meta</p>
                <h2 className="text-lg font-semibold">{selectedGoal.name}</h2>
                <p className="text-sm text-muted-foreground">
                  A carteira vinculada cobre {formatCurrency(selectedGoal.metrics?.effective_current_amount ?? selectedGoal.current_amount)} de {formatCurrency(selectedGoal.target_amount)}.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/metas?tab=investments')}>
                  Ver Meta
                </Button>
                <Button onClick={() => setActiveTab('portfolio')}>
                  Ver Ativos Vinculados
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        <PortfolioSummaryCards
          totalInvested={metrics.totalInvested}
          currentValue={metrics.currentValue}
          totalReturn={metrics.totalReturn}
          returnPercentage={metrics.returnPercentage}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="portfolio">
              <BarChart3 className="mr-2 h-4 w-4" />
              Portfólio
            </TabsTrigger>
            <TabsTrigger value="transactions">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="dividends">
              <DollarSign className="mr-2 h-4 w-4" />
              Dividendos
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="mr-2 h-4 w-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          </TabsList>

          {/* Aba Portfólio */}
          <TabsContent value="portfolio" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Minha Carteira</h2>
              <Button
                size="sm"
                onClick={() => {
                  setEditingInvestment(null);
                  setInvestmentDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Portfólio</CardTitle>
              </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Tipo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Símbolo</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Quantidade</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Preço Médio</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Cotação</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Rentabilidade</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Metas</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentsWithMarketData.map((investment) => {
                    const totalInv = resolveInvestmentTotalInvested(investment);
                    const totalCur = resolveInvestmentDisplayValue(investment);
                    const gain = totalCur - totalInv;
                    const percentG = totalInv > 0 ? (gain / totalInv) * 100 : 0;

                    return (
                      <tr key={investment.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{getTypeLabel(investment.type)}</td>
                        <td className="py-3 px-4 text-sm font-medium">{investment.ticker || investment.name}</td>
                        <td className="py-3 px-4 text-sm text-right">{investment.quantity}</td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(investment.purchase_price)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {formatCurrency(resolveInvestmentDisplayPrice(investment))}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          {formatCurrency(totalCur)}
                        </td>
                        <td
                          className={`py-3 px-4 text-sm text-right font-semibold ${
                            percentG >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {percentG >= 0 ? '+' : ''}
                          {percentG.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex flex-wrap gap-2">
                            {(relatedGoalsByInvestment.get(investment.id) || []).length === 0 ? (
                              <span className="text-muted-foreground">Sem vínculo</span>
                            ) : (
                              (relatedGoalsByInvestment.get(investment.id) || []).map((goal) => (
                                <Badge
                                  key={goal.id}
                                  variant={goal.id === selectedGoalId ? 'default' : 'secondary'}
                                  className="cursor-pointer"
                                  onClick={() => navigate(`/metas?tab=investments`)}
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
          </TabsContent>

          {/* Aba Transações */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Histórico de Transações</h2>
              <Button
                size="sm"
                onClick={() => setTransactionDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </div>

            <TransactionTimeline
              transactions={transactions}
              onDelete={handleDeleteTransaction}
            />
          </TabsContent>

          {/* Aba Dividendos */}
          <TabsContent value="dividends" className="space-y-6">
            <div className="space-y-6">
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
          </TabsContent>

          {/* Aba Alertas */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Alertas de Preço</h2>
              <Button
                size="sm"
                onClick={() => setAlertDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Alerta
              </Button>
            </div>

            <AlertsList
              alerts={alerts}
              onDelete={deleteAlert}
              onToggle={toggleAlert}
            />
          </TabsContent>

          {/* Aba Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Ana Clara Insights Widget - Destaque no topo */}
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

            {/* SPRINT 5: Diversification Score Card */}
            <DiversificationScoreCard investments={investmentsWithMarketData} />

            {/* SPRINT 5: Performance Heat Map */}
            <PerformanceHeatMap />

            {/* SPRINT 5: Benchmark Comparison */}
            <BenchmarkComparison />

            {/* Grid de gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alocação por Categoria */}
              <AssetAllocationChart
                data={Object.values(metrics.allocation)}
              />

              {/* Evolução do Portfólio */}
              <PortfolioEvolutionChart
                totalInvested={metrics.totalInvested}
                currentValue={metrics.currentValue}
              />
            </div>

            {/* Performance por Ativo (full width) */}
            <PerformanceBarChart investments={investmentsWithMarketData} />

            {/* Investment Radar - Ana Clara */}
            <OpportunityFeed />

            {/* Smart Rebalance */}
            <SmartRebalanceWidget investments={investmentsWithMarketData} />

            {/* Badges - Gamificação */}
            <BadgesDisplay />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
