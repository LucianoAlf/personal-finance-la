import { TopCategoriesCard } from './TopCategoriesCard';
import { TopMerchantsCard } from './TopMerchantsCard';
import { CardComparisonCard } from './CardComparisonCard';
import { SpendingPatternsCard } from './SpendingPatternsCard';
import { TemporalAnalysisCard } from './TemporalAnalysisCard';
import { AnalyticsScope } from '@/hooks/analyticsScope';

interface AdvancedAnalyticsProps {
  scope?: AnalyticsScope;
}

export function AdvancedAnalytics({ scope }: AdvancedAnalyticsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Análises Avançadas
        </h2>
        <p className="text-gray-600">
          Insights detalhados sobre seus padrões de consumo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categorias */}
        <TopCategoriesCard scope={scope} />

        {/* Top Estabelecimentos */}
        <TopMerchantsCard scope={scope} />

        {/* Comparação de Cartões */}
        <CardComparisonCard scope={scope} />

        {/* Padrões de Gasto */}
        <SpendingPatternsCard scope={scope} />

        {/* Análise Temporal - Ocupa 2 colunas */}
        <div className="lg:col-span-2">
          <TemporalAnalysisCard scope={scope} />
        </div>
      </div>
    </div>
  );
}
