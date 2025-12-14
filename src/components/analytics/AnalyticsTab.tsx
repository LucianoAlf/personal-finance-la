import { useState, useEffect } from 'react';
import { PeriodMetrics } from './PeriodMetrics';
import { InsightsPanel } from './InsightsPanel';
import { ChartsSection } from './ChartsSection';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { AnalyticsFilters, PeriodOption } from './AnalyticsFilters';
import { useAnalytics } from '@/hooks/useAnalytics';

export function AnalyticsTab() {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('3m');
  
  const { data, loading, error } = useAnalytics();

  useEffect(() => {
    console.log('🔍 AnalyticsTab - Debug:', { data, loading, error, selectedCardId, selectedPeriod });
  }, [data, loading, error, selectedCardId, selectedPeriod]);

  if (error) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Erro ao carregar análises
          </h3>
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Recarregar Página
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
        <PeriodMetrics />

        {/* Seção 2: Insights Inteligentes */}
        <InsightsPanel />

        {/* Seção 3: Gráficos Interativos */}
        <ChartsSection />

        {/* Seção 4: Análises Avançadas */}
        <AdvancedAnalytics />
      </div>
    );
  } catch (err) {
    console.error('Erro ao renderizar AnalyticsTab:', err);
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Erro ao renderizar análises
          </h3>
          <p className="text-red-700 text-sm">{String(err)}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }
}
