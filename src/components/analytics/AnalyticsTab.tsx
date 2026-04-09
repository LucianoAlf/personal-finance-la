import { useState, useMemo } from 'react';
import { PeriodMetrics } from './PeriodMetrics';
import { InsightsPanel } from './InsightsPanel';
import { ChartsSection } from './ChartsSection';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { AnalyticsFilters, PeriodOption, getPeriodDates } from './AnalyticsFilters';
import { useAnalytics } from '@/hooks/useAnalytics';

export function AnalyticsTab() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('3m');
  const dateRange = useMemo(() => getPeriodDates(selectedPeriod), [selectedPeriod]);
  const analyticsScope = useMemo(
    () => ({
      cardId: selectedCardId,
      startDate: dateRange.start,
      endDate: dateRange.end,
    }),
    [selectedCardId, dateRange]
  );

  const { data, loading, error } = useAnalytics(analyticsScope);

  if (error) {
    return (
      <div className="space-y-8">
        <div className="rounded-[28px] border border-danger/20 bg-danger-subtle/80 p-6 text-center shadow-[0_18px_42px_rgba(220,38,38,0.08)]">
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Erro ao carregar analises
          </h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-xl border border-danger/20 bg-danger px-4 py-2 text-danger-foreground shadow-sm transition-colors hover:bg-danger/90"
          >
            Recarregar Pagina
          </button>
        </div>
      </div>
    );
  }

  // Renderizar com proteção contra erros
  try {
    return (
      <div className="space-y-8">
        {/* Filtros */}
        <AnalyticsFilters
          selectedCardId={selectedCardId}
          selectedPeriod={selectedPeriod}
          onCardChange={setSelectedCardId}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Seção 1: Métricas do Período */}
        <PeriodMetrics analyticsData={data} loading={loading} selectedPeriod={selectedPeriod} />

        {/* Seção 2: Insights Inteligentes */}
        <InsightsPanel analyticsData={data} loading={loading} />

        {/* Seção 3: Gráficos Interativos */}
        <ChartsSection analyticsData={data} loading={loading} />

        {/* Seção 4: Análises Avançadas */}
        <AdvancedAnalytics scope={analyticsScope} />
      </div>
    );
  } catch (err) {
    console.error('Erro ao renderizar AnalyticsTab:', err);
    return (
      <div className="space-y-8">
        <div className="rounded-[28px] border border-danger/20 bg-danger-subtle/80 p-6 text-center shadow-[0_18px_42px_rgba(220,38,38,0.08)]">
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Erro ao renderizar analises
          </h3>
          <p className="text-sm text-muted-foreground">{String(err)}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-xl border border-danger/20 bg-danger px-4 py-2 text-danger-foreground shadow-sm transition-colors hover:bg-danger/90"
          >
            Recarregar Pagina
          </button>
        </div>
      </div>
    );
  }
}
