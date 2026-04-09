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
        <h2 className="mb-2 text-[1.75rem] font-semibold tracking-tight text-foreground">
          Analises Avancadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Insights detalhados sobre seus padroes de consumo
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopCategoriesCard scope={scope} />
        <TopMerchantsCard scope={scope} />
        <CardComparisonCard scope={scope} />
        <SpendingPatternsCard scope={scope} />

        <div className="lg:col-span-2">
          <TemporalAnalysisCard scope={scope} />
        </div>
      </div>
    </div>
  );
}
