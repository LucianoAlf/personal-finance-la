import { CalendarDays } from 'lucide-react';

export interface DividendPaidItem {
  id: string;
  ticker: string;
  subtitle: string;
  amount: number;
  date: string;
}

export interface DividendUpcomingItem {
  id: string;
  ticker: string;
  subtitle: string;
  amount: number;
  date: string;
}

interface DividendsCardListProps {
  paidThisMonth: DividendPaidItem[];
  upcoming30Days: DividendUpcomingItem[];
  formatCurrency: (value: number) => string;
  onOpenCalendar: () => void;
}

export function DividendsCardList({
  paidThisMonth,
  upcoming30Days,
  formatCurrency,
  onOpenCalendar,
}: DividendsCardListProps) {
  const paidTotal = paidThisMonth.reduce((acc, item) => acc + item.amount, 0);
  const hasAnything = paidThisMonth.length > 0 || upcoming30Days.length > 0;

  return (
    <div className="lg:hidden pb-4">
      <div className="px-3 pt-2">
        <button
          type="button"
          onClick={onOpenCalendar}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface-elevated/60 px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Abrir calendário
        </button>
      </div>

      {!hasAnything ? (
        <div className="px-3 py-10 text-center text-sm text-muted-foreground">
          Sem dividendos registrados ou previstos.
        </div>
      ) : null}

      {paidThisMonth.length > 0 ? (
        <section>
          <h3 className="flex items-center justify-between px-3 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Este mês</span>
            <span className="text-emerald-400">{formatCurrency(paidTotal)}</span>
          </h3>
          <ul role="list" className="space-y-2 px-3">
            {paidThisMonth.map((item) => (
              <li key={item.id} role="listitem">
                <div className="flex w-full items-start gap-3 rounded-xl border-l-[3px] border-l-emerald-500 bg-surface-elevated/60 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{item.ticker}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-emerald-400">
                      +{formatCurrency(item.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.date}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming30Days.length > 0 ? (
        <section>
          <h3 className="px-3 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Próximos 30 dias
          </h3>
          <ul role="list" className="space-y-2 px-3">
            {upcoming30Days.map((item) => (
              <li key={item.id} role="listitem">
                <div className="flex w-full items-start gap-3 rounded-xl border-l-[3px] border-l-purple-500 bg-surface-elevated/60 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground">{item.ticker}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-foreground">
                      ≈ {formatCurrency(item.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.date}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
