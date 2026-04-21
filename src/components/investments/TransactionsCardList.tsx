import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';

export interface TransactionItem {
  id: string;
  ticker: string;
  transaction_type: 'buy' | 'sell' | 'dividend' | 'split' | 'jscp' | string;
  quantity: number;
  price: number;
  total_amount: number;
  transaction_date: string;
}

interface TransactionsCardListProps {
  transactions: TransactionItem[];
  onCardTap: (tx: TransactionItem) => void;
  formatCurrency: (value: number) => string;
}

const TX_BORDER: Record<string, string> = {
  buy: 'border-l-blue-500',
  sell: 'border-l-red-500',
  dividend: 'border-l-emerald-500',
  jscp: 'border-l-emerald-500',
  split: 'border-l-amber-500',
};

const TX_LABEL: Record<string, string> = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  jscp: 'JCP',
  split: 'Split',
};

function groupLabel(isoDate: string): string {
  const date = parseISO(isoDate);
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function TransactionsCardList({
  transactions,
  onCardTap,
  formatCurrency,
}: TransactionsCardListProps) {
  if (transactions.length === 0) {
    return (
      <div className="lg:hidden px-4 py-10 text-center text-sm text-muted-foreground">
        Nenhuma transação registrada ainda.
      </div>
    );
  }

  const groups = new Map<string, TransactionItem[]>();
  for (const tx of transactions) {
    const key = groupLabel(tx.transaction_date);
    const arr = groups.get(key) ?? [];
    arr.push(tx);
    groups.set(key, arr);
  }

  return (
    <div className="lg:hidden pb-4">
      {Array.from(groups.entries()).map(([label, items]) => (
        <section key={label}>
          <h3 className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </h3>
          <ul role="list" className="space-y-2 px-4">
            {items.map((tx) => {
              const borderClass = TX_BORDER[tx.transaction_type] ?? 'border-l-slate-500';
              const actionLabel = TX_LABEL[tx.transaction_type] ?? tx.transaction_type;
              return (
                <li key={tx.id} role="listitem">
                  <button
                    type="button"
                    data-testid="tx-card"
                    onClick={() => onCardTap(tx)}
                    aria-label={`${tx.ticker} ${actionLabel}`}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border-l-[3px] bg-surface-elevated/60 px-3 py-3 text-left transition-colors hover:bg-surface-elevated',
                      borderClass,
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-foreground">
                        {tx.ticker} <span className="ml-1 text-xs font-semibold text-muted-foreground">{actionLabel}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {tx.quantity} un · {formatCurrency(tx.price)}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right text-sm font-bold text-foreground">
                      {formatCurrency(tx.total_amount)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
