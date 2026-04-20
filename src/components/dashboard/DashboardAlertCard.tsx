import { AlertCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/utils/formatters';

export interface DashboardAlertCardProps {
  overdueCount: number;
  overdueAmount: number;
  topItems: { name: string; dueLabel: string }[];
}

export function DashboardAlertCard({ overdueCount, overdueAmount, topItems }: DashboardAlertCardProps) {
  if (overdueCount <= 0) return null;

  const preview = topItems.slice(0, 2);
  const label = overdueCount === 1 ? 'conta vencida' : 'contas vencidas';

  return (
    <div
      role="alert"
      className={cn(
        'lg:hidden',
        'rounded-2xl border border-destructive/40 bg-destructive/10 p-4 shadow-sm',
        'flex flex-col gap-3',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
          <AlertCircle size={20} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-foreground">
            {overdueCount} {label}
          </div>
          <div className="mt-1 text-sm font-medium text-destructive">
            {formatCurrency(overdueAmount)}
          </div>
        </div>
      </div>

      {preview.length > 0 && (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {preview.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3">
              <span className="truncate">{item.name}</span>
              <span className="flex-shrink-0 text-xs">{item.dueLabel}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/contas-pagar"
        className="inline-flex items-center justify-between rounded-xl border border-destructive/40 bg-background/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-background/70"
      >
        <span>Ver contas a pagar</span>
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
