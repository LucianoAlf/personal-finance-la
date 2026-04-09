import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { useInsights, Insight } from '@/hooks/useInsights';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const typeStyles = {
  warning: {
    shell: 'border-warning-border/70 bg-warning-subtle/80',
    iconBg: 'border-warning-border/70 bg-warning/10 text-warning',
    accent: 'text-warning',
  },
  info: {
    shell: 'border-info-border/70 bg-info-subtle/80',
    iconBg: 'border-info-border/70 bg-info/10 text-info',
    accent: 'text-info',
  },
  success: {
    shell: 'border-success-border/70 bg-success-subtle/80',
    iconBg: 'border-success-border/70 bg-success/10 text-success',
    accent: 'text-success',
  },
  tip: {
    shell: 'border-primary/20 bg-primary/10',
    iconBg: 'border-primary/20 bg-primary/12 text-primary',
    accent: 'text-primary',
  },
};

function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss: () => void }) {
  const Icon = insight.icon;
  const styles = typeStyles[insight.type];

  return (
    <div
      data-testid={`analytics-insight-card-${insight.id}`}
      className={cn(
        'relative rounded-[28px] border border-border/70 p-5 shadow-[0_18px_44px_rgba(3,8,20,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(3,8,20,0.18)] dark:shadow-[0_20px_48px_rgba(2,6,23,0.24)]',
        styles.shell,
      )}
    >
      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-full border border-border/60 bg-background/45 p-1.5 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
        aria-label="Dispensar insight"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm', styles.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            data-testid={`analytics-insight-title-${insight.id}`}
            className="mb-1 text-lg font-semibold tracking-tight text-foreground"
          >
            {insight.title}
          </h4>
          <p
            data-testid={`analytics-insight-copy-${insight.id}`}
            className="text-sm leading-6 text-muted-foreground"
          >
            {insight.description}
          </p>
          {insight.action && (
            <Button
              variant="ghost"
              size="sm"
              className={cn('mt-3 h-9 rounded-xl px-3 text-sm font-semibold hover:bg-background/60', styles.accent)}
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

interface InsightsPanelProps {
  analyticsData: AnalyticsData | null;
  loading: boolean;
}

export function InsightsPanel({ analyticsData, loading }: InsightsPanelProps) {
  const allInsights = useInsights(analyticsData);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleInsights = allInsights.filter(insight => !dismissedIds.includes(insight.id));

  const handleDismiss = (insightId: string) => {
    setDismissedIds(prev => [...prev, insightId]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Insights Inteligentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 rounded-[28px]" />
          ))}
        </div>
      </div>
    );
  }

  if (visibleInsights.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Insights Inteligentes</h2>
        <div className="rounded-[28px] border border-border/70 bg-card/95 py-12 text-center shadow-[0_18px_42px_rgba(3,8,20,0.12)] dark:shadow-[0_20px_48px_rgba(2,6,23,0.24)]">
          <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground/70" />
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Nenhum insight no momento
          </h3>
          <p className="text-muted-foreground">
            Continue usando seus cartoes para receber insights personalizados
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-foreground">Insights Inteligentes</h2>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{visibleInsights.length} insights</span>
        </div>
      </div>

      {/* Desktop: Grid | Mobile: Carrossel */}
      <div className="hidden gap-5 md:grid md:grid-cols-2">
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
