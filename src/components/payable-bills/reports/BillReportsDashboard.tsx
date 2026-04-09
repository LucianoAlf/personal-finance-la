import { motion } from 'framer-motion';
import { FileText, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBillReports } from '@/hooks/useBillReports';
import type { PayableBill } from '@/types/payable-bills.types';

import { ExportButton } from '../ExportButton';
import { BehaviorAlerts } from './BehaviorAlerts';
import { CategoryDistributionChart } from './CategoryDistributionChart';
import { MonthlyEvolutionChart } from './MonthlyEvolutionChart';
import { PotentialSavings } from './PotentialSavings';
import { ReportsPeriodFilter } from './ReportsPeriodFilter';
import { ReportsSummaryCards } from './ReportsSummaryCards';
import { TopIncreases } from './TopIncreases';
import { TopProviders } from './TopProviders';

const secondaryButtonClass =
  'h-11 rounded-xl border-border/70 bg-surface/85 px-4 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-surface-elevated';

interface LocalBillReportsDashboardProps {
  /** Lista já carregada pela página (evita segundo fetch + Realtime duplicado). */
  bills: PayableBill[];
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[380px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-surface/80 shadow-[0_18px_42px_rgba(2,6,23,0.18)]">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function BillReportsDashboard({ bills }: LocalBillReportsDashboardProps) {
  const {
    data,
    loading,
    error,
    refresh,
    periodPreset,
    setPeriodPreset,
    customDateRange,
    setCustomDateRange,
    periodLabel,
  } = useBillReports();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-surface/80 shadow-[0_18px_42px_rgba(2,6,23,0.18)]">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">Carregando relatórios...</p>
          <p className="mt-2 text-sm text-muted-foreground">Organizando seus indicadores financeiros.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Erro ao carregar relatórios"
        description="Não foi possível montar essa visão agora. Tente atualizar para buscar os dados novamente."
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Dados insuficientes para gerar relatórios"
        description="Cadastre algumas contas para ver tendências, categorias e oportunidades de economia."
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-[1.85rem] font-semibold tracking-tight text-foreground">
            Relatórios e Análises
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Visão completa dos seus gastos e comportamento financeiro
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className={secondaryButtonClass} onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <ExportButton bills={bills} />
        </div>
      </div>

      <Card className="rounded-[1.75rem] border-border/70 bg-surface/75 shadow-[0_22px_54px_rgba(2,6,23,0.22)]">
        <CardContent className="space-y-4 p-5">
          <ReportsPeriodFilter
            periodPreset={periodPreset}
            onPeriodChange={setPeriodPreset}
            customDateRange={customDateRange}
            onCustomDateChange={setCustomDateRange}
            periodLabel={periodLabel}
          />

          <div className="rounded-[1.2rem] border border-border/60 bg-background/55 px-4 py-3 text-sm text-muted-foreground">
            Exibindo dados consolidados de <span className="font-medium text-foreground">{periodLabel}</span>.
          </div>
        </CardContent>
      </Card>

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

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <BehaviorAlerts
          comparison={data.comparison}
          potentialSavings={data.potential_savings}
          topIncreases={data.top_increases}
          biggestExpense={data.biggest_expense?.description ? data.biggest_expense : null}
          overdueCount={data.totals.overdue_count}
        />
        <PotentialSavings savings={data.potential_savings} />
      </section>

      <section>
        <MonthlyEvolutionChart data={data.monthly_totals} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CategoryDistributionChart
          distribution={data.by_type}
          totalAmount={data.totals.total_amount}
        />
        <TopIncreases increases={data.top_increases} />
      </section>

      <section>
        <TopProviders providers={data.top_providers} totalAmount={data.totals.total_amount} />
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-surface/75 p-5 shadow-[0_20px_50px_rgba(2,6,23,0.18)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-foreground">Sobre os Relatórios</h4>
            <p className="text-sm text-muted-foreground">
              Contexto rápido para interpretar os números dessa visão.
            </p>
          </div>
        </div>
        <ul className="grid gap-3 text-sm leading-6 text-muted-foreground md:grid-cols-2">
          <li className="rounded-[1.2rem] border border-border/60 bg-background/55 px-4 py-3">
            Os dados são atualizados em tempo real conforme você cadastra e paga contas.
          </li>
          <li className="rounded-[1.2rem] border border-border/60 bg-background/55 px-4 py-3">
            A comparação é feita com o período anterior de mesmo tamanho.
          </li>
          <li className="rounded-[1.2rem] border border-border/60 bg-background/55 px-4 py-3">
            A previsão é baseada na média dos últimos 3 meses.
          </li>
          <li className="rounded-[1.2rem] border border-border/60 bg-background/55 px-4 py-3">
            Economia potencial considera multa e juros estimados sobre contas em atraso.
          </li>
        </ul>
      </section>
    </motion.div>
  );
}
