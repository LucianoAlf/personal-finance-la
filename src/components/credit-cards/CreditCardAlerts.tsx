import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCardSummary } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreditCardAlertsProps {
  cards: CreditCardSummary[];
  className?: string;
}

interface CardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
  cardName: string;
  priority: number;
}

export function CreditCardAlerts({ cards, className }: CreditCardAlertsProps) {
  const alerts = useMemo(() => {
    const allAlerts: CardAlert[] = [];

    cards.forEach((card) => {
      const usagePercentage = (card.used_limit / card.credit_limit) * 100;
      
      // Alerta de limite 95%+ (Urgente)
      if (usagePercentage >= 95) {
        allAlerts.push({
          id: `limit-critical-${card.id}`,
          type: 'critical',
          icon: <XCircle className="h-5 w-5" />,
          title: 'Limite Crítico!',
          description: `${card.name} está com ${usagePercentage.toFixed(0)}% do limite usado. Apenas ${formatCurrency(card.available_limit)} disponível.`,
          cardName: card.name,
          priority: 1,
        });
      }
      // Alerta de limite 80%+ (Warning)
      else if (usagePercentage >= 80) {
        allAlerts.push({
          id: `limit-warning-${card.id}`,
          type: 'warning',
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Limite Alto',
          description: `${card.name} está com ${usagePercentage.toFixed(0)}% do limite usado. Considere pagar a fatura.`,
          cardName: card.name,
          priority: 2,
        });
      }
      // Alerta de limite 50%+ (Info)
      else if (usagePercentage >= 50) {
        allAlerts.push({
          id: `limit-info-${card.id}`,
          type: 'info',
          icon: <TrendingUp className="h-5 w-5" />,
          title: 'Uso Moderado',
          description: `${card.name} está com ${usagePercentage.toFixed(0)}% do limite usado.`,
          cardName: card.name,
          priority: 4,
        });
      }

      // Alertas de vencimento
      if (card.current_due_date && card.current_invoice_amount && card.current_invoice_amount > 0) {
        const dueDate = typeof card.current_due_date === 'string' 
          ? parseISO(card.current_due_date) 
          : new Date(card.current_due_date);
        const today = new Date();
        const daysUntilDue = differenceInDays(dueDate, today);

        // Fatura vencida
        if (daysUntilDue < 0) {
          allAlerts.push({
            id: `overdue-${card.id}`,
            type: 'critical',
            icon: <XCircle className="h-5 w-5" />,
            title: 'Fatura Vencida!',
            description: `A fatura de ${card.name} venceu há ${Math.abs(daysUntilDue)} dia(s). Valor: ${formatCurrency(card.current_invoice_amount)}`,
            cardName: card.name,
            priority: 0,
          });
        }
        // Vence em até 3 dias
        else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
          allAlerts.push({
            id: `due-soon-${card.id}`,
            type: 'warning',
            icon: <Clock className="h-5 w-5" />,
            title: daysUntilDue === 0 ? 'Vence Hoje!' : `Vence em ${daysUntilDue} dia(s)`,
            description: `Fatura de ${card.name}: ${formatCurrency(card.current_invoice_amount)}`,
            cardName: card.name,
            priority: daysUntilDue === 0 ? 0 : 1,
          });
        }
      }
    });

    // Ordenar por prioridade (menor = mais urgente)
    return allAlerts.sort((a, b) => a.priority - b.priority);
  }, [cards]);

  if (alerts.length === 0) {
    return null;
  }

  const getAlertStyles = (type: CardAlert['type']) => {
    switch (type) {
      case 'critical':
        return {
          container: 'border-red-200 bg-red-50',
          icon: 'text-red-600',
          title: 'text-red-800',
          description: 'text-red-700',
        };
      case 'warning':
        return {
          container: 'border-orange-200 bg-orange-50',
          icon: 'text-orange-600',
          title: 'text-orange-800',
          description: 'text-orange-700',
        };
      case 'info':
        return {
          container: 'border-blue-200 bg-blue-50',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          description: 'text-blue-700',
        };
    }
  };

  // Mostrar apenas os 3 alertas mais importantes
  const visibleAlerts = alerts.slice(0, 3);

  return (
    <div className={cn('space-y-3', className)}>
      {visibleAlerts.map((alert) => {
        const styles = getAlertStyles(alert.type);
        return (
          <Alert key={alert.id} className={cn('border', styles.container)}>
            <div className={styles.icon}>{alert.icon}</div>
            <AlertTitle className={cn('font-semibold', styles.title)}>
              {alert.title}
            </AlertTitle>
            <AlertDescription className={styles.description}>
              {alert.description}
            </AlertDescription>
          </Alert>
        );
      })}
      
      {alerts.length > 3 && (
        <p className="text-sm text-gray-500 text-center">
          +{alerts.length - 3} alerta(s) adicional(is)
        </p>
      )}
    </div>
  );
}
