import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  MoreVertical,
  Trash2,
  Power,
  PowerOff,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InvestmentAlert } from '@/hooks/useInvestmentAlerts';

interface AlertsListProps {
  alerts: InvestmentAlert[];
  onDelete?: (id: string) => void;
  onToggle?: (id: string, isActive: boolean) => void;
}

const alertIcons = {
  price_above: TrendingUp,
  price_below: TrendingDown,
  percent_change: Percent,
};

const alertLabels = {
  price_above: 'Preço Acima',
  price_below: 'Preço Abaixo',
  percent_change: 'Variação %',
};

const alertColors = {
  price_above: 'text-green-600 bg-green-50',
  price_below: 'text-red-600 bg-red-50',
  percent_change: 'text-blue-600 bg-blue-50',
};

export function AlertsList({ alerts, onDelete, onToggle }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Nenhum alerta configurado</h3>
        <p className="text-sm text-muted-foreground">
          Crie alertas para ser notificado sobre mudanças de preço
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const Icon = alertIcons[alert.alert_type];
        const label = alertLabels[alert.alert_type];
        const colorClass = alertColors[alert.alert_type];

        // Calculate progress (proximity to target)
        const currentValue = alert.current_value || 0;
        const targetValue = alert.target_value;
        let progress = 0;

        if (alert.alert_type === 'price_above' && currentValue > 0) {
          progress = Math.min((currentValue / targetValue) * 100, 100);
        } else if (alert.alert_type === 'price_below' && targetValue > 0) {
          progress = Math.min((currentValue / targetValue) * 100, 100);
        }

        const isTriggered = alert.triggered_at !== null;

        return (
          <Card key={alert.id} className={isTriggered ? 'border-green-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icon */}
                  <div className={`rounded-lg p-2 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{alert.ticker}</span>
                      <Badge variant="outline">{label}</Badge>
                      {!alert.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      {isTriggered && (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Disparado
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      Alvo:{' '}
                      {alert.alert_type === 'percent_change'
                        ? `${alert.target_value}%`
                        : formatCurrency(alert.target_value)}
                      {currentValue > 0 && (
                        <> • Atual: {formatCurrency(currentValue)}</>
                      )}
                    </div>

                    {/* Progress bar for price alerts */}
                    {alert.alert_type !== 'percent_change' &&
                      currentValue > 0 &&
                      !isTriggered && (
                        <div className="space-y-1">
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {progress.toFixed(1)}% do objetivo
                          </p>
                        </div>
                      )}

                    {/* Timestamp */}
                    {isTriggered && alert.triggered_at && (
                      <p className="text-xs text-green-600 mt-2">
                        Disparado em{' '}
                        {format(new Date(alert.triggered_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    )}

                    {!isTriggered && alert.last_checked && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Última verificação:{' '}
                        {format(new Date(alert.last_checked), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onToggle && (
                      <DropdownMenuItem
                        onClick={() => onToggle(alert.id, !alert.is_active)}
                      >
                        {alert.is_active ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(alert.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
