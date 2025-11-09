import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Removido DropdownMenu para evitar erro de elemento indefinido
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import type { InvestmentTransaction } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';

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

const transactionColors = {
  buy: 'text-green-600 bg-green-50 border-green-200',
  sell: 'text-red-600 bg-red-50 border-red-200',
  dividend: 'text-blue-600 bg-blue-50 border-blue-200',
  split: 'text-purple-600 bg-purple-50 border-purple-200',
  bonus: 'text-amber-600 bg-amber-50 border-amber-200',
};

const transactionLabels = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  split: 'Desdobramento',
  bonus: 'Bonificação',
};

function getBadgeVariant(type: string): 'default' | 'success' | 'danger' | 'info' | 'warning' {
  switch (type) {
    case 'buy':
      return 'success';
    case 'sell':
      return 'danger';
    case 'dividend':
      return 'info';
    case 'split':
      return 'warning';
    default:
      return 'default';
  }
}

function getTransactionLabel(type: string): string {
  return transactionLabels[type as keyof typeof transactionLabels] || type;
}

export function TransactionTimeline({
  transactions,
  onDelete,
}: TransactionTimelineProps) {
  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const grouped: Record<string, InvestmentTransaction[]> = {};

    transactions.forEach((transaction) => {
      const date = format(new Date(transaction.transaction_date as any), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(transaction);
    });

    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    
    return sortedDates.map((date) => ({
      date,
      transactions: grouped[date],
    }));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Nenhuma transação</h3>
        <p className="text-sm text-muted-foreground">
          Registre sua primeira transação para começar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTransactions.map(({ date, transactions: dayTransactions }) => {
        const dateObj = parseISO(date);
        const isToday =
          format(new Date(), 'yyyy-MM-dd') === format(dateObj, 'yyyy-MM-dd');

        return (
          <div key={date} className="relative">
            {/* Date header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <div
                  className={`rounded-lg p-3 ${
                    isToday
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="text-xs font-medium">
                    {format(dateObj, 'MMM', { locale: ptBR }).toUpperCase()}
                  </div>
                  <div className="text-2xl font-bold">{format(dateObj, 'dd')}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">
                  {format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dayTransactions.length} transaç
                  {dayTransactions.length === 1 ? 'ão' : 'ões'}
                </p>
              </div>
            </div>

            {/* Transactions for this date */}
            <div className="ml-[72px] space-y-3">
              {dayTransactions.map((transaction) => {
                const type = transaction.transaction_type as keyof typeof transactionIcons;
                const Icon = (transactionIcons[type] ?? DollarSign) as React.ComponentType<any>;
                const colorClass = transactionColors[type] ?? 'text-gray-600 bg-gray-50 border-gray-200';
                const label = transactionLabels[type as keyof typeof transactionLabels] ?? String(type);

                return (
                  <Card key={transaction.id} className="border-l-4">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Icon */}
                          <div
                            className={`rounded-lg p-2 border ${colorClass}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{label}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(transaction.transaction_date as any), 'HH:mm')}
                              </span>
                            </div>

                            {transaction.quantity && transaction.price && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {transaction.quantity} × {formatCurrency(transaction.price)}
                              </p>
                            )}

                            {transaction.fees && transaction.fees > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Taxas: {formatCurrency(transaction.fees)}
                              </p>
                            )}

                            {transaction.notes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                {transaction.notes}
                              </p>
                            )}
                          </div>

                          {/* Value */}
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${
                                type === 'buy' || type === 'dividend'
                                  ? 'text-green-600'
                                  : type === 'sell'
                                  ? 'text-red-600'
                                  : ''
                              }`}
                            >
                              {type === 'sell' ? '-' : type === 'buy' ? '+' : ''}
                              {formatCurrency(transaction.total_value)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 ml-2 text-red-600"
                            onClick={() => onDelete(transaction.id)}
                            aria-label="Deletar transação"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
