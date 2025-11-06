import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { formatCurrency } from '@/utils/formatters';
import { formatShortDateBR } from '@/lib/date-utils';
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
            <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{/* getCategoryIcon(transaction.category_id) */}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    {transaction.total_installments && transaction.total_installments > 1 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {transaction.installment_number}/{transaction.total_installments}x
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {format(new Date(transaction.purchase_date), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <p className="font-semibold text-gray-900">{formatCurrency(transaction.amount)}</p>
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
