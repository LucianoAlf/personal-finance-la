import { useMemo, useState } from 'react';
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import { ReportsAnaSection } from '@/components/reports/ReportsAnaSection';
import { ReportsBalanceSheetSection } from '@/components/reports/ReportsBalanceSheetSection';
import { ReportsEmptyState } from '@/components/reports/ReportsEmptyState';
import { ReportsExportButton } from '@/components/reports/ReportsExportButton';
import { ReportsGoalsSection } from '@/components/reports/ReportsGoalsSection';
import { ReportsInvestmentsSection } from '@/components/reports/ReportsInvestmentsSection';
import { ReportsObligationsSection } from '@/components/reports/ReportsObligationsSection';
import { ReportsOverviewCards } from '@/components/reports/ReportsOverviewCards';
import { ReportsPeriodFilter } from '@/components/reports/ReportsPeriodFilter';
import { ReportsSpendingSection } from '@/components/reports/ReportsSpendingSection';
import { ReportsTrendSection } from '@/components/reports/ReportsTrendSection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useReportAnaInsights } from '@/hooks/useReportAnaInsights';
import { hasRenderableReportData } from '@/utils/reports/intelligence-contract';
import { hasDisplayableDeterministicReportData } from '@/utils/reports/view-model';
import {
  buildReportsPeriod,
  getDefaultReportsPeriod,
  useReportsIntelligence,
  type ReportsPeriodPreset,
} from '@/hooks/useReportsIntelligence';

export function Reports() {
  const [periodPreset, setPeriodPreset] = useState<ReportsPeriodPreset>(
    getDefaultReportsPeriod().preset,
  );
  const period = useMemo(() => buildReportsPeriod(periodPreset), [periodPreset]);
  const {
    data: context,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useReportsIntelligence(period);
  const hasDeterministicContext = Boolean(
    context && hasDisplayableDeterministicReportData(context),
  );
  const anaContextFingerprint = useMemo(() => {
    if (!context) {
      return 'no-context';
    }

    return JSON.stringify({
      overview: context.overview,
      cashflow: context.cashflow,
      spending: context.spending,
      balanceSheet: context.balanceSheet,
      obligations: context.obligations,
      goals: context.goals,
      investments: context.investments,
      quality: {
        overview: context.quality.overview,
        cashflow: context.quality.cashflow,
        spending: context.quality.spending,
        balanceSheet: context.quality.balanceSheet,
        obligations: context.quality.obligations,
        goals: context.quality.goals,
        investments: context.quality.investments,
      },
    });
  }, [context]);
  const {
    data: anaPayload,
    isLoading: isAnaLoading,
    refetch: refetchAna,
  } = useReportAnaInsights({
    startDate: period.startDate,
    endDate: period.endDate,
    periodLabel: period.label,
    contextFingerprint: anaContextFingerprint,
    enabled: hasDeterministicContext,
  });

  const exportContext = useMemo(() => {
    if (!context) {
      return null;
    }

    if (!anaPayload) {
      return context;
    }

    return {
      ...context,
      ana: anaPayload.ana,
      quality: {
        ...context.quality,
        ana: anaPayload.quality,
      },
    };
  }, [anaPayload, context]);

  const showRenderableSections =
    isLoading || Boolean(context && hasDisplayableDeterministicReportData(context));
  const showEmptyState =
    !isLoading && Boolean(context) && !hasDisplayableDeterministicReportData(context);
  const showAnaSection =
    isLoading ||
    Boolean(
      context &&
        (hasDisplayableDeterministicReportData(context) || hasRenderableReportData(context)),
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Relatórios"
        subtitle="Análises detalhadas da sua vida financeira"
        icon={<BarChart3 size={24} />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void Promise.all([refetch(), refetchAna()]);
              }}
              disabled={isFetching}
            >
              <RefreshCw size={16} className="mr-1" />
              Atualizar
            </Button>
            <ReportsExportButton
              context={exportContext}
              period={period}
              disabled={isLoading || isFetching}
            />
          </div>
        }
      />

      <div className="space-y-6 p-6">
        <ReportsPeriodFilter
          value={periodPreset}
          onChange={setPeriodPreset}
          periodLabel={period.label}
          disabled={isFetching}
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível atualizar o relatório agora</AlertTitle>
            <AlertDescription>
              {error instanceof Error
                ? error.message
                : 'O contexto canônico de relatórios falhou para este período.'}
            </AlertDescription>
          </Alert>
        )}

        {showEmptyState && <ReportsEmptyState periodLabel={period.label} />}

        {showRenderableSections && (
          <>
            <ReportsOverviewCards context={context} loading={isLoading} />
            <ReportsSpendingSection context={context} loading={isLoading} />
            <ReportsTrendSection context={context} loading={isLoading} />
            <ReportsBalanceSheetSection context={context} loading={isLoading} />
            <ReportsObligationsSection context={context} loading={isLoading} />
            <ReportsGoalsSection context={context} loading={isLoading} />
            <ReportsInvestmentsSection context={context} loading={isLoading} />
          </>
        )}

        {showAnaSection && (
          <ReportsAnaSection
            context={exportContext}
            loading={isLoading || (hasDeterministicContext && isAnaLoading)}
          />
        )}
      </div>
    </div>
  );
}
