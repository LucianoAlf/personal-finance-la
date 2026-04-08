import { motion } from 'framer-motion';
import { Loader2, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBillReports } from '@/hooks/useBillReports';
import type { PayableBill } from '@/types/payable-bills.types';
import { ReportsPeriodFilter } from './ReportsPeriodFilter';
import { ReportsSummaryCards } from './ReportsSummaryCards';
import { BehaviorAlerts } from './BehaviorAlerts';
import { CategoryDistributionChart } from './CategoryDistributionChart';
import { TopIncreases } from './TopIncreases';
import { TopProviders } from './TopProviders';
import { PotentialSavings } from './PotentialSavings';
import { MonthlyEvolutionChart } from './MonthlyEvolutionChart';
import { ExportButton } from '../ExportButton';

interface BillReportsDashboardProps {
  /** Lista já carregada pela página (evita segundo fetch + Realtime duplicado). */
  bills: PayableBill[];
}

export function BillReportsDashboard({ bills }: BillReportsDashboardProps) {
  const {
    data,
    loading,
    error,
    refresh,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    periodLabel
  } = useBillReports();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-sm text-muted-foreground mb-4">
            Erro ao carregar relatórios
          </p>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-sm text-muted-foreground">
            Dados insuficientes para gerar relatórios
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre algumas contas para ver os relatórios
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header com filtros e ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Relatórios e Análises</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visão completa dos seus gastos e comportamento financeiro
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <ExportButton bills={bills} />
        </div>
      </div>

      {/* Filtro de período */}
      <ReportsPeriodFilter
        periodPreset={periodPreset}
        onPeriodChange={setPeriodPreset}
        customDateRange={customDateRange}
        onCustomDateChange={setCustomDateRange}
        periodLabel={periodLabel}
      />

      {/* Seção 1: Cards de Resumo */}
      <section>
        <ReportsSummaryCards
          totalAmount={data.totals.total_amount}
          totalBills={data.totals.total_bills}
          comparison={data.comparison}
          forecastAmount={data.forecast.next_month_prediction}
          forecastMonths={data.forecast.based_on_months}
          onTimeRate={data.performance.on_time_payment_rate}
          paidCount={data.performance.paid_on_time_count}
          totalPaid={data.totals.paid_count}
        />
      </section>

      {/* Seção 2: Alertas e Insights */}
      <section className="grid gap-6 lg:grid-cols-2">
        <BehaviorAlerts
          comparison={data.comparison}
          potentialSavings={data.potential_savings}
          topIncreases={data.top_increases}
          biggestExpense={data.biggest_expense?.description ? data.biggest_expense : null}
          overdueCount={data.totals.overdue_count}
        />
        
        <PotentialSavings savings={data.potential_savings} />
      </section>

      {/* Seção 3: Gráfico de Evolução */}
      <section>
        <MonthlyEvolutionChart data={data.monthly_totals} />
      </section>

      {/* Seção 4: Análises Detalhadas */}
      <section className="grid gap-6 lg:grid-cols-2">
        <CategoryDistributionChart
          distribution={data.by_type}
          totalAmount={data.totals.total_amount}
        />
        
        <TopIncreases increases={data.top_increases} />
      </section>

      {/* Seção 5: Top Fornecedores */}
      <section>
        <TopProviders
          providers={data.top_providers}
          totalAmount={data.totals.total_amount}
        />
      </section>

      {/* Info Card */}
      <section className="bg-muted/50 rounded-lg p-4 border border-border">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Sobre os Relatórios
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Os dados são atualizados em tempo real conforme você cadastra e paga contas</li>
          <li>• A comparação é feita com o período anterior de mesmo tamanho</li>
          <li>• A previsão é baseada na média dos últimos 3 meses</li>
          <li>• Economia potencial considera 2% de multa + 1% de juros ao mês</li>
        </ul>
      </section>
    </motion.div>
  );
}
