import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useInsights, Insight } from '@/hooks/useInsights';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const typeStyles = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-900',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  tip: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-900',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
};

function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss: () => void }) {
  const Icon = insight.icon;
  const styles = typeStyles[insight.type];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-4 hover:shadow-md transition-shadow relative`}>
      <button
        onClick={onDismiss}
        className={`absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors ${styles.text}`}
        aria-label="Dispensar insight"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className={`${styles.iconBg} p-2 rounded-lg flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${styles.text} mb-1`}>
            {insight.title}
          </h4>
          <p className={`text-sm ${styles.text} opacity-80`}>
            {insight.description}
          </p>
          {insight.action && (
            <Button
              variant="ghost"
              size="sm"
              className={`mt-2 h-8 ${styles.text}`}
              onClick={insight.action.onClick}
            >
              {insight.action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsPanel() {
  const { data: analyticsData, loading } = useAnalytics();
  const allInsights = useInsights(analyticsData);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleInsights = allInsights.filter(insight => !dismissedIds.includes(insight.id));

  const handleDismiss = (insightId: string) => {
    setDismissedIds(prev => [...prev, insightId]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Insights Inteligentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (visibleInsights.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Insights Inteligentes</h2>
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Bell className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum insight no momento
          </h3>
          <p className="text-gray-600">
            Continue usando seus cartões para receber insights personalizados
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Insights Inteligentes</h2>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">{visibleInsights.length} insights</span>
        </div>
      </div>

      {/* Desktop: Grid | Mobile: Carrossel */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {visibleInsights.map((insight) => (
          <InsightCard 
            key={insight.id} 
            insight={insight} 
            onDismiss={() => handleDismiss(insight.id)}
          />
        ))}
      </div>

      {/* Mobile: Carrossel horizontal */}
      <div className="md:hidden overflow-x-auto pb-4 -mx-6 px-6">
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {visibleInsights.map((insight) => (
            <div key={insight.id} className="w-[85vw] flex-shrink-0">
              <InsightCard 
                insight={insight} 
                onDismiss={() => handleDismiss(insight.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
