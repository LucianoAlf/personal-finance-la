import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Trash2,
} from 'lucide-react';
import type { InvestmentTransaction } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import { getTransactionCalendarKey } from '@/utils/investments/transaction-date';

interface TransactionTimelineProps {
  transactions: InvestmentTransaction[];
  onDelete?: (id: string) => void;
}

const transactionIcons = {
  buy: TrendingUp,
  sell: TrendingDown,
  dividend: DollarSign,
  split: Zap,
  bonus: Zap,
};

const transactionLabels = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  split: 'Desdobramento',
  bonus: 'Bonificação',
};

const transactionChipClasses = {
  buy: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  sell: 'border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300',
  dividend: 'border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300',
  split: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-300',
  bonus: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

export function TransactionTimeline({ transactions, onDelete }: TransactionTimelineProps) {
  const groupedTransactions = useMemo(() => {
    const grouped: Record<string, InvestmentTransaction[]> = {};

    transactions.forEach((transaction) => {
      const date = getTransactionCalendarKey(transaction.transaction_date as any);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((date) => ({
      date,
      transactions: grouped[date],
    }));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <Card className="border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border/70 bg-surface shadow-sm">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">Nenhuma transação registrada</h3>
          <p className="text-sm text-muted-foreground">
            Adicione uma movimentação para começar a acompanhar sua carteira.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTransactions.map(({ date, transactions: dayTransactions }) => {
        const dateObj = parseISO(date);
        const isToday = format(new Date(), 'yyyy-MM-dd') === format(dateObj, 'yyyy-MM-dd');

        return (
          <div key={date} className="relative">
            <div className="mb-4 flex items-center gap-4">
              <div
                className={`flex-shrink-0 rounded-2xl border px-4 py-3 text-center shadow-sm ${
                  isToday
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-border/70 bg-card/95 text-foreground'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                  {format(dateObj, 'MMM', { locale: ptBR })}
                </div>
                <div className="text-2xl font-bold leading-none">{format(dateObj, 'dd')}</div>
              </div>

              <div>
                <h3 className="font-semibold capitalize text-foreground">
                  {format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dayTransactions.length} {dayTransactions.length === 1 ? 'transação' : 'transações'}
                </p>
              </div>
            </div>

            <div className="ml-[88px] space-y-3">
              {dayTransactions.map((transaction) => {
                const type = transaction.transaction_type as keyof typeof transactionIcons;
                const Icon = transactionIcons[type] ?? DollarSign;
                const chipClass =
                  transactionChipClasses[type] ??
                  'border-border/70 bg-surface/85 text-muted-foreground';
                const label = transactionLabels[type] ?? String(type);
                const valueClassName =
                  type === 'buy' || type === 'dividend'
                    ? 'text-emerald-500'
                    : type === 'sell'
                    ? 'text-rose-500'
                    : 'text-foreground';

                return (
                  <Card
                    key={transaction.id}
                    className="border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-colors hover:bg-surface/65 dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className={`rounded-2xl border p-2.5 shadow-sm ${chipClass}`}>
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full">
                                {label}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(transaction.transaction_date as any), 'HH:mm')}
                              </span>
                            </div>

                            {transaction.quantity && transaction.price ? (
                              <p className="text-sm text-muted-foreground">
                                {transaction.quantity} × {formatCurrency(transaction.price)}
                              </p>
                            ) : null}

                            {transaction.fees && transaction.fees > 0 ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Taxas: {formatCurrency(transaction.fees)}
                              </p>
                            ) : null}

                            {transaction.notes ? (
                              <p className="mt-2 text-sm text-muted-foreground">{transaction.notes}</p>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <p className={`text-lg font-semibold ${valueClassName}`}>
                              {type === 'sell' ? '-' : type === 'buy' ? '+' : ''}
                              {formatCurrency(transaction.total_value)}
                            </p>
                          </div>
                        </div>

                        {onDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                            onClick={() => onDelete(transaction.id)}
                            aria-label="Deletar transação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
