import { useEffect, useState } from 'react';
import { Calendar, CreditCard, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreditCardPayments } from '@/hooks/useCreditCardPayments';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';

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
  }, [fetchPaymentsWithAccount, invoiceId]);

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = totalAmount - totalPaid;
  const progressPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      total: 'Total',
      minimum: 'Minimo',
      partial: 'Parcial',
    };

    return labels[type] || type;
  };

  const getPaymentTypeClass = (type: string) => {
    const classes: Record<string, string> = {
      total: 'border-success/20 bg-success/10 text-success',
      minimum: 'border-warning/20 bg-warning/10 text-warning',
      partial: 'border-info/20 bg-info/10 text-info',
    };

    return classes[type] || 'border-border/60 bg-surface/70 text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-[24px]" />
        <Skeleton className="h-24 w-full rounded-[24px]" />
        <Skeleton className="h-24 w-full rounded-[24px]" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/35 px-5 py-10 text-center text-muted-foreground">
        <FileText className="mx-auto mb-3 h-10 w-10" />
        <p className="text-sm">Nenhum pagamento registrado para esta fatura.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-border/70 bg-surface-elevated/45 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Progresso do pagamento</p>
            <p className="mt-1 text-sm text-muted-foreground">Veja quanto ja foi quitado e quanto ainda resta pagar.</p>
          </div>
          <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {progressPercentage.toFixed(0)}%
          </div>
        </div>

        <div className="mt-4 h-3 rounded-full bg-surface-overlay/80">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.92),rgba(139,92,246,0.92))]"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-border/60 bg-background/55 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-[20px] border border-success/20 bg-success/10 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success/80">Pago</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-success">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-[20px] border border-warning/20 bg-warning/10 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning/80">Restante</p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-warning">{formatCurrency(remaining)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Historico de pagamentos ({payments.length})
        </h4>

        {payments.map((payment) => (
          <div
            key={payment.id}
            className="rounded-[24px] border border-border/70 bg-card/95 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.12)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('rounded-full border px-3 py-1 text-xs font-semibold shadow-sm', getPaymentTypeClass(payment.payment_type))}>
                    {getPaymentTypeLabel(payment.payment_type)}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(payment.payment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>

                  {payment.account ? (
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {payment.account.name}
                      {payment.account.bank ? ` • ${payment.account.bank}` : ''}
                    </span>
                  ) : null}
                </div>

                {payment.notes ? (
                  <div className="rounded-[18px] border border-border/60 bg-surface-elevated/45 px-3 py-2 text-sm text-muted-foreground">
                    {payment.notes}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[1.1rem] font-semibold tracking-tight text-foreground">
                  {formatCurrency(payment.amount)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Pagamento registrado</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
