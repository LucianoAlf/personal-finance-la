import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Target,
  Wallet,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  formatCurrency, 
  Comparison, 
  PotentialSavings, 
  TopIncrease,
  BiggestExpense,
  getBillTypeLabel
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

export function BehaviorAlerts({
  comparison,
  potentialSavings,
  topIncreases,
  biggestExpense,
  overdueCount
}: BehaviorAlertsProps) {
  // Gerar alertas baseado nos dados
  const alerts: Alert[] = [];

  // Alerta de variação de gastos
  if (comparison.variation_percent > 10) {
    alerts.push({
      id: 'spending_up',
      type: 'warning',
      icon: TrendingUp,
      title: 'Gastos em alta',
      message: `Você está gastando ${comparison.variation_percent.toFixed(0)}% mais que o período anterior`,
      value: `+${formatCurrency(comparison.difference)}`
    });
  } else if (comparison.variation_percent < -10) {
    alerts.push({
      id: 'spending_down',
      type: 'success',
      icon: TrendingDown,
      title: 'Economia detectada',
      message: `Você está gastando ${Math.abs(comparison.variation_percent).toFixed(0)}% menos que o período anterior`,
      value: formatCurrency(Math.abs(comparison.difference))
    });
  }

  // Alerta de contas vencidas
  if (overdueCount > 0) {
    alerts.push({
      id: 'overdue',
      type: 'danger',
      icon: AlertTriangle,
      title: `${overdueCount} conta${overdueCount > 1 ? 's' : ''} vencida${overdueCount > 1 ? 's' : ''}`,
      message: 'Pague o quanto antes para evitar juros e multas',
      value: formatCurrency(potentialSavings.total_potential_savings)
    });
  }

  // Alerta de economia potencial
  if (potentialSavings.total_potential_savings > 0) {
    alerts.push({
      id: 'savings',
      type: 'info',
      icon: Lightbulb,
      title: 'Economia potencial',
      message: potentialSavings.message,
      value: formatCurrency(potentialSavings.total_potential_savings)
    });
  }

  // Alerta de maior gasto
  if (biggestExpense && biggestExpense.percentage_of_total > 40) {
    alerts.push({
      id: 'biggest',
      type: 'info',
      icon: Target,
      title: 'Maior gasto do período',
      message: `${biggestExpense.description} representa ${biggestExpense.percentage_of_total.toFixed(0)}% do total`,
      value: formatCurrency(biggestExpense.amount)
    });
  }

  // Alertas de contas que mais subiram
  topIncreases.slice(0, 2).forEach((increase, index) => {
    if (increase.variation_percent > 15) {
      alerts.push({
        id: `increase_${index}`,
        type: 'warning',
        icon: TrendingUp,
        title: `${increase.description} subiu ${increase.variation_percent.toFixed(0)}%`,
        message: `Era ${formatCurrency(increase.previous_amount)}, agora é ${formatCurrency(increase.current_amount)}`,
        value: `+${formatCurrency(increase.difference)}`
      });
    }
  });

  // Se não há alertas, mostrar mensagem positiva
  if (alerts.length === 0) {
    alerts.push({
      id: 'all_good',
      type: 'success',
      icon: Wallet,
      title: 'Tudo em ordem!',
      message: 'Suas finanças estão sob controle. Continue assim!'
    });
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-red-200 dark:border-red-900',
          icon: 'text-red-600 dark:text-red-400',
          bar: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/20',
          border: 'border-orange-200 dark:border-orange-900',
          icon: 'text-orange-600 dark:text-orange-400',
          bar: 'bg-orange-500'
        };
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-950/20',
          border: 'border-green-200 dark:border-green-900',
          icon: 'text-green-600 dark:text-green-400',
          bar: 'bg-green-500'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-900',
          icon: 'text-blue-600 dark:text-blue-400',
          bar: 'bg-blue-500'
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          Alertas e Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {alerts.map((alert, index) => {
            const styles = getAlertStyles(alert.type);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'relative overflow-hidden rounded-lg border p-3',
                  styles.bg,
                  styles.border
                )}
              >
                {/* Barra lateral */}
                <div className={cn(
                  'absolute left-0 top-0 bottom-0 w-1',
                  styles.bar
                )} />

                <div className="flex items-start gap-3 pl-2">
                  <div className={cn(
                    'rounded-full p-1.5',
                    styles.bg
                  )}>
                    <alert.icon className={cn('h-4 w-4', styles.icon)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {alert.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.message}
                        </p>
                      </div>
                      {alert.value && (
                        <span className={cn(
                          'text-sm font-bold whitespace-nowrap',
                          styles.icon
                        )}>
                          {alert.value}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
