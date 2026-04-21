import { Bell, Pencil, Trash2 } from 'lucide-react';

export interface InvestmentAlertItem {
  id: string;
  ticker: string;
  description: string;
  subtitle: string;
  active: boolean;
}

interface AlertsCardListProps {
  alerts: InvestmentAlertItem[];
  onEdit: (alert: InvestmentAlertItem) => void;
  onDelete: (alertId: string) => void;
  onToggle: (alertId: string, active: boolean) => void;
}

export function AlertsCardList({ alerts, onEdit, onDelete }: AlertsCardListProps) {
  if (alerts.length === 0) {
    return (
      <div className="lg:hidden px-2 py-10 text-center text-sm text-muted-foreground">
        Nenhum alerta cadastrado.
      </div>
    );
  }

  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <div className="lg:hidden pb-4">
      <h3 className="px-2 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Ativos · {activeCount}
      </h3>
      <ul role="list" className="space-y-2 px-2">
        {alerts.map((alert) => (
          <li key={alert.id} role="listitem">
            <div className="flex w-full items-start gap-3 rounded-xl border-l-[3px] border-l-amber-500 bg-surface-elevated/60 px-3 py-3">
              <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">{alert.description}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{alert.subtitle}</div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(alert)}
                  aria-label={`Editar alerta ${alert.ticker}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(alert.id)}
                  aria-label={`Remover alerta ${alert.ticker}`}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-overlay hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
