import { useEffect, useState } from 'react';
import { useCreditCardPayments } from '@/hooks/useCreditCardPayments';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard, FileText } from 'lucide-react';

interface InvoicePaymentHistoryProps {
  invoiceId: string;
  totalAmount: number;
}

export function InvoicePaymentHistory({ invoiceId, totalAmount }: InvoicePaymentHistoryProps) {
  const { fetchPaymentsWithAccount } = useCreditCardPayments();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      setLoading(true);
      const data = await fetchPaymentsWithAccount(invoiceId);
      setPayments(data);
      setLoading(false);
    };

    loadPayments();
  }, [invoiceId]);

  // Calcular total pago
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = totalAmount - totalPaid;
  const progressPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  // Mapear tipo de pagamento para label
  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      total: 'Total',
      minimum: 'Mínimo',
      partial: 'Parcial',
    };
    return labels[type] || type;
  };

  // Mapear tipo de pagamento para cor
  const getPaymentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      total: 'bg-green-100 text-green-800',
      minimum: 'bg-orange-100 text-orange-800',
      partial: 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm">Nenhum pagamento registrado para esta fatura.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo do Progresso */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Progresso do Pagamento</span>
          <span className="text-sm font-semibold text-gray-900">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        {/* Valores */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Pago</p>
            <p className="text-sm font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">Restante</p>
            <p className="text-sm font-bold text-orange-600">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Pagamentos */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Histórico de Pagamentos ({payments.length})
        </h4>

        {payments.map((payment) => (
          <div
            key={payment.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                {/* Linha 1: Tipo e Valor */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getPaymentTypeColor(payment.payment_type)}>
                      {getPaymentTypeLabel(payment.payment_type)}
                    </Badge>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>

                {/* Linha 2: Data */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>

                {/* Linha 3: Conta */}
                {payment.account && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {payment.account.name}
                      {payment.account.bank && ` • ${payment.account.bank}`}
                    </span>
                  </div>
                )}

                {/* Linha 4: Observações */}
                {payment.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-600 italic">{payment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
