import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceTransactionsListProps {
  invoiceId: string;
  groupByCategory?: boolean;
}

export function InvoiceTransactionsList({
  invoiceId,
  groupByCategory = false,
}: InvoiceTransactionsListProps) {
  const { transactions, loading } = useCreditCardTransactions();

  // Filtrar transações da fatura
  const invoiceTransactions = transactions.filter((t) => t.invoice_id === invoiceId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (invoiceTransactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma transação nesta fatura
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invoiceTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {transaction.description}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                📅 {format(new Date(transaction.transaction_date), "dd 'de' MMM", { locale: ptBR })}
              </span>
              {transaction.installment_number && (
                <span>
                  • {transaction.installment_number}/{transaction.total_installments}x
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(transaction.amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
