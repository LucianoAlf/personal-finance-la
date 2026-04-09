import { useEffect, useState } from 'react';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronRight, CreditCard } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';

interface InstallmentTimelineProps {
  invoiceId: string;
  creditCardId: string;
}

interface InstallmentGroup {
  description: string;
  totalInstallments: number;
  currentInstallment: number;
  installmentAmount: number;
  totalAmount: number;
  remainingAmount: number;
  remainingInstallments: number;
  purchaseDate: string;
  installmentGroupId: string;
}

export function InstallmentTimeline({ invoiceId, creditCardId }: InstallmentTimelineProps) {
  const [installments, setInstallments] = useState<InstallmentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstallments = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('credit_card_transactions')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('is_installment', true)
          .order('purchase_date', { ascending: true });

        if (error) throw error;

        const groups: Record<string, InstallmentGroup> = {};

        data?.forEach((transaction) => {
          const groupId = transaction.installment_group_id || transaction.id;
          if (!groups[groupId]) {
            groups[groupId] = {
              description: transaction.description,
              totalInstallments: transaction.total_installments || 1,
              currentInstallment: transaction.current_installment || 1,
              installmentAmount: transaction.amount,
              totalAmount: transaction.amount * (transaction.total_installments || 1),
              remainingAmount:
                transaction.amount *
                ((transaction.total_installments || 1) - (transaction.current_installment || 1)),
              remainingInstallments:
                (transaction.total_installments || 1) - (transaction.current_installment || 1),
              purchaseDate: transaction.purchase_date,
              installmentGroupId: groupId,
            };
          }
        });

        setInstallments(Object.values(groups));
      } catch (error) {
        console.error('Erro ao buscar parcelas:', error);
        setInstallments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstallments();
  }, [creditCardId, invoiceId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-[24px]" />
        <Skeleton className="h-24 w-full rounded-[24px]" />
      </div>
    );
  }

  if (installments.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/35 px-5 py-10 text-center text-muted-foreground">
        <CreditCard className="mx-auto mb-3 h-10 w-10" />
        <p className="text-sm">Nenhuma compra parcelada nesta fatura.</p>
      </div>
    );
  }

  const totalCommitted = installments.reduce((sum, installment) => sum + installment.remainingAmount, 0);
  const totalInstallmentsRemaining = installments.reduce(
    (sum, installment) => sum + installment.remainingInstallments,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[26px] border border-warning/20 bg-warning/10 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Limite comprometido no futuro</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalInstallmentsRemaining} parcelas restantes distribuidas em {installments.length} compras.
            </p>
          </div>
          <p className="text-[1.4rem] font-semibold tracking-tight text-warning">
            {formatCurrency(totalCommitted)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {installments.map((installment) => {
          const progress = (installment.currentInstallment / installment.totalInstallments) * 100;

          return (
            <div
              key={installment.installmentGroupId}
              className="rounded-[24px] border border-border/70 bg-card/95 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.12)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-base font-semibold tracking-tight text-foreground">
                    {installment.description}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(installment.purchaseDate), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold tracking-tight text-foreground">
                    {formatCurrency(installment.installmentAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">por parcela</p>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-border/60 bg-surface-elevated/45 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    Parcela {installment.currentInstallment} de {installment.totalInstallments}
                  </span>
                  <span className="font-semibold text-foreground">{progress.toFixed(0)}%</span>
                </div>

                <div className="mt-3 h-2 rounded-full bg-surface-overlay/80">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      progress >= 80 ? 'bg-success' : progress >= 50 ? 'bg-info' : 'bg-warning',
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Faltam {installment.remainingInstallments} parcelas
                  </span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(installment.remainingAmount)} restante
                  </span>
                </div>
              </div>

              {installment.remainingInstallments > 0 && installment.remainingInstallments <= 6 ? (
                <div className="mt-4 border-t border-border/60 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Proximos meses
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: Math.min(installment.remainingInstallments, 6) }).map((_, index) => {
                      const futureDate = addMonths(new Date(), index + 1);
                      return (
                        <div
                          key={`${installment.installmentGroupId}-${index}`}
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                        >
                          <span>{format(futureDate, 'MMM', { locale: ptBR })}</span>
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      );
                    })}
                    {installment.remainingInstallments > 6 ? (
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                        +{installment.remainingInstallments - 6} meses
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
