import { AlertTriangle, TrendingUp, TrendingDown, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface VariationAlert {
  bill_id: string;
  description: string;
  provider_name: string;
  current_amount: number;
  previous_amount: number;
  variation_percent: number;
  severity: 'warning' | 'danger';
  month: string;
}

interface RecurringBillVariationAlertProps {
  alerts: VariationAlert[];
  onViewHistory?: (bill_id: string) => void;
  maxAlerts?: number;
}

export function RecurringBillVariationAlert({
  alerts,
  onViewHistory,
  maxAlerts = 3
}: RecurringBillVariationAlertProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  
  // Carregar alertas descartados do localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissed_variation_alerts');
    if (dismissed) {
      try {
        const parsed = JSON.parse(dismissed);
        // Remover alertas com mais de 7 dias
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const valid = parsed.filter((item: any) => item.timestamp > weekAgo);
        setDismissedAlerts(valid.map((item: any) => item.id));
        localStorage.setItem('dismissed_variation_alerts', JSON.stringify(valid));
      } catch (e) {
        localStorage.removeItem('dismissed_variation_alerts');
      }
    }
  }, []);

  const handleDismiss = (alertId: string) => {
    const newDismissed = [
      ...dismissedAlerts,
      alertId
    ];
    setDismissedAlerts(newDismissed);
    
    // Salvar no localStorage com timestamp
    const toSave = newDismissed.map(id => ({
      id,
      timestamp: Date.now()
    }));
    localStorage.setItem('dismissed_variation_alerts', JSON.stringify(toSave));
  };

  // Filtrar alertas não descartados
  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.includes(alert.bill_id))
    .slice(0, maxAlerts);

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {visibleAlerts.map((alert, index) => (
          <motion.div
            key={alert.bill_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div
              className={cn(
                'relative overflow-hidden rounded-lg border p-4 shadow-sm transition-all hover:shadow-md',
                alert.severity === 'danger'
                  ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20'
                  : 'border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20'
              )}
            >
              {/* Barra lateral de severidade */}
              <div
                className={cn(
                  'absolute left-0 top-0 bottom-0 w-1',
                  alert.severity === 'danger' ? 'bg-red-500' : 'bg-orange-500'
                )}
              />

              <div className="flex items-start gap-3 pl-2">
                {/* Ícone */}
                <div
                  className={cn(
                    'rounded-full p-2',
                    alert.severity === 'danger'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  )}
                >
                  {alert.variation_percent > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        {alert.description}
                        {alert.provider_name && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({alert.provider_name})
                          </span>
                        )}
                      </h4>
                      <p
                        className={cn(
                          'text-sm font-medium mt-1',
                          alert.severity === 'danger' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                        )}
                      >
                        {alert.variation_percent > 0 ? 'Aumentou' : 'Diminuiu'}{' '}
                        <span className="font-bold">{Math.abs(alert.variation_percent).toFixed(1)}%</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(alert.current_amount)}{' '}
                        (era{' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(alert.previous_amount)}{' '}
                        em {alert.month})
                      </p>
                    </div>

                    {/* Botão descartar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDismiss(alert.bill_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Ações */}
                  {onViewHistory && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => onViewHistory(alert.bill_id)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        Ver Histórico
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Badge de severidade */}
              {alert.severity === 'danger' && (
                <div className="absolute top-2 right-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Atenção
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
