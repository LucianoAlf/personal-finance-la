import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  type BiggestExpense,
  type Comparison,
  type PotentialSavings,
  type TopIncrease,
} from '@/hooks/useBillReports';

interface BehaviorAlertsProps {
  comparison: Comparison;
  potentialSavings: PotentialSavings;
  topIncreases: TopIncrease[];
  biggestExpense: BiggestExpense | null;
  overdueCount: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  icon: React.ElementType;
  title: string;
  message: string;
  value?: string;
}

const toneStyles = {
  danger: {
    shell: 'border-danger-border/60 bg-danger-subtle/65',
    icon: 'border-danger-border/60 bg-danger/10 text-danger',
    value: 'text-danger',
  },
  warning: {
    shell: 'border-warning-border/60 bg-warning-subtle/65',
    icon: 'border-warning-border/60 bg-warning/10 text-warning',
    value: 'text-warning',
  },
  info: {
    shell: 'border-info-border/60 bg-info-subtle/65',
    icon: 'border-info-border/60 bg-info/10 text-info',
    value: 'text-info',
  },
  success: {
    shell: 'border-success-border/60 bg-success-subtle/65',
    icon: 'border-success-border/60 bg-success/10 text-success',
    value: 'text-success',
  },
} as const;

export function BehaviorAlerts({
  comparison,
  potentialSavings,
  topIncreases,
  biggestExpense,
  overdueCount,
}: BehaviorAlertsProps) {
  const alerts: Alert[] = [];

  if (comparison.variation_percent > 10) {
    alerts.push({
      id: 'spending_up',
      type: 'warning',
      icon: TrendingUp,
      title: 'Gastos em alta',
      message: `Você está gastando ${comparison.variation_percent.toFixed(0)}% mais que o período anterior.`,
      value: `+${formatCurrency(comparison.difference)}`,
    });
  } else if (comparison.variation_percent < -10) {
    alerts.push({
      id: 'spending_down',
      type: 'success',
      icon: TrendingDown,
      title: 'Economia detectada',
      message: `Você está gastando ${Math.abs(comparison.variation_percent).toFixed(0)}% menos que o período anterior.`,
      value: formatCurrency(Math.abs(comparison.difference)),
    });
  }

  if (overdueCount > 0) {
    alerts.push({
      id: 'overdue',
      type: 'danger',
      icon: AlertTriangle,
      title: `${overdueCount} conta${overdueCount > 1 ? 's' : ''} vencida${overdueCount > 1 ? 's' : ''}`,
      message: 'Pague o quanto antes para evitar juros e multas nas próximas competências.',
      value: formatCurrency(potentialSavings.total_potential_savings),
    });
  }

  if (potentialSavings.total_potential_savings > 0) {
    alerts.push({
      id: 'savings',
      type: 'info',
      icon: Lightbulb,
      title: 'Economia potencial',
      message: potentialSavings.message,
      value: formatCurrency(potentialSavings.total_potential_savings),
    });
  }

  if (biggestExpense && biggestExpense.percentage_of_total > 40) {
    alerts.push({
      id: 'biggest',
      type: 'info',
      icon: Target,
      title: 'Maior gasto do período',
      message: `${biggestExpense.description} representa ${biggestExpense.percentage_of_total.toFixed(0)}% do total desse recorte.`,
      value: formatCurrency(biggestExpense.amount),
    });
  }

  topIncreases.slice(0, 2).forEach((increase, index) => {
    if (increase.variation_percent > 15) {
      alerts.push({
        id: `increase_${index}`,
        type: 'warning',
        icon: TrendingUp,
        title: `${increase.description} subiu ${increase.variation_percent.toFixed(0)}%`,
        message: `Era ${formatCurrency(increase.previous_amount)} e agora está em ${formatCurrency(increase.current_amount)}.`,
        value: `+${formatCurrency(increase.difference)}`,
      });
    }
  });

  if (alerts.length === 0) {
    alerts.push({
      id: 'all_good',
      type: 'success',
      icon: Wallet,
      title: 'Tudo em ordem',
      message: 'Seu fluxo de contas está saudável neste período. Continue assim.',
    });
  }

  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
          <Bell className="h-5 w-5 text-primary" />
          Alertas e Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {alerts.map((alert, index) => {
          const styles = toneStyles[alert.type];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'rounded-[1.35rem] border p-4 shadow-[0_16px_36px_rgba(2,6,23,0.12)]',
                styles.shell,
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm',
                    styles.icon,
                  )}
                >
                  <alert.icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold tracking-tight text-foreground">
                        {alert.title}
                      </h4>
                      <p className="text-sm leading-6 text-muted-foreground">{alert.message}</p>
                    </div>
                    {alert.value ? (
                      <span
                        className={cn(
                          'rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-semibold whitespace-nowrap',
                          styles.value,
                        )}
                      >
                        {alert.value}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
