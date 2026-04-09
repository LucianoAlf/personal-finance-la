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
  price_above: 'Preço acima',
  price_below: 'Preço abaixo',
  percent_change: 'Variação %',
};

const alertToneClasses = {
  price_above: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  price_below: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300',
  percent_change: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300',
};

export function AlertsList({ alerts, onDelete, onToggle }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card className="border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-surface shadow-sm">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">Nenhum alerta configurado</h3>
          <p className="text-sm text-muted-foreground">
            Crie alertas para ser notificado sobre mudanças de preço.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const Icon = alertIcons[alert.alert_type];
        const label = alertLabels[alert.alert_type];
        const toneClass = alertToneClasses[alert.alert_type];
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
          <Card
            key={alert.id}
            className={`border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)] ${
              isTriggered ? 'ring-1 ring-emerald-500/20' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className={`rounded-2xl border p-2.5 shadow-sm ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{alert.ticker}</span>
                      <Badge variant="outline" className="rounded-full">
                        {label}
                      </Badge>
                      {!alert.is_active ? <Badge variant="secondary">Inativo</Badge> : null}
                      {isTriggered ? (
                        <Badge variant="success" className="rounded-full">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Disparado
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mb-2 text-sm text-muted-foreground">
                      Alvo:{' '}
                      {alert.alert_type === 'percent_change'
                        ? `${alert.target_value}%`
                        : formatCurrency(alert.target_value)}
                      {currentValue > 0 ? <> • Atual: {formatCurrency(currentValue)}</> : null}
                    </div>

                    {alert.alert_type !== 'percent_change' && currentValue > 0 && !isTriggered ? (
                      <div className="space-y-1.5">
                        <Progress value={progress} className="h-2 bg-muted/80" />
                        <p className="text-xs text-muted-foreground">{progress.toFixed(1)}% do objetivo</p>
                      </div>
                    ) : null}

                    {isTriggered && alert.triggered_at ? (
                      <p className="mt-2 text-xs text-emerald-500">
                        Disparado em{' '}
                        {format(new Date(alert.triggered_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    ) : null}

                    {!isTriggered && alert.last_checked ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Última verificação:{' '}
                        {format(new Date(alert.last_checked), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    {onToggle ? (
                      <DropdownMenuItem onClick={() => onToggle(alert.id, !alert.is_active)}>
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
                    ) : null}

                    {onDelete ? (
                      <DropdownMenuItem
                        onClick={() => onDelete(alert.id)}
                        className="text-rose-500 focus:text-rose-500"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    ) : null}
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
