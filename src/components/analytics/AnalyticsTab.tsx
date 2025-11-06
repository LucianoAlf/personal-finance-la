import { PeriodMetrics } from './PeriodMetrics';
import { InsightsPanel } from './InsightsPanel';
import { ChartsSection } from './ChartsSection';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useEffect } from 'react';

export function AnalyticsTab() {
  const { data, loading, error } = useAnalytics();

  useEffect(() => {
    console.log('🔍 AnalyticsTab - Debug:', { data, loading, error });
  }, [data, loading, error]);

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
        {/* Seção 1: Métricas do Período */}
        <PeriodMetrics />

        {/* Seção 2: Insights Inteligentes */}
        <InsightsPanel />

        {/* Seção 3: Gráficos Interativos */}
        <ChartsSection />

        {/* Seção 4: Análises Avançadas */}
        <AdvancedAnalytics />

        {/* Seções futuras - Em breve */}
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Mais seções em breve...
          </h3>
          <p className="text-gray-600">
            Histórico completo e metas de gastos
          </p>
        </div>
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
