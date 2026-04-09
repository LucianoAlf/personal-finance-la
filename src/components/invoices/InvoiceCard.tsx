import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCardInvoice, CreditCard } from '@/types/database.types';
import { getInvoiceStatusInfo } from '@/utils/creditCardUtils';
import { formatCurrency } from '@/utils/formatters';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';
import { cn } from '@/lib/utils';

import { InvoiceStatusBadge } from './InvoiceStatusBadge';

interface InvoiceCardProps {
  invoice: CreditCardInvoice;
  card: CreditCard;
  isHighlighted?: boolean;
  onViewDetails: () => void;
  onPayInvoice?: () => void;
}

export function InvoiceCard({
  invoice,
  card,
  isHighlighted = false,
  onViewDetails,
  onPayInvoice,
}: InvoiceCardProps) {
  const dueDate = parseDateOnlyAsLocal(invoice.due_date);
  const referenceMonth = parseDateOnlyAsLocal(invoice.reference_month);
  const usagePercentage = card.credit_limit > 0 ? (invoice.total_amount / card.credit_limit) * 100 : 0;
  const daysUntilDue = differenceInDays(dueDate, new Date());

  const statusInfo = getInvoiceStatusInfo(
    invoice.closing_date,
    invoice.due_date,
    invoice.total_amount,
    invoice.paid_amount,
    invoice.status,
  );

  const isOverdue = statusInfo.status === 'overdue';
  const isPaid = statusInfo.status === 'paid';
  const hasPartialPayment = Number(invoice.paid_amount) > 0 && Number(invoice.paid_amount) < Number(invoice.total_amount);
  const displayAmount = hasPartialPayment ? Number(invoice.remaining_amount) : Number(invoice.total_amount);

  const progressToneClass =
    usagePercentage >= 90
      ? 'bg-danger'
      : usagePercentage >= 70
        ? 'bg-warning'
        : usagePercentage >= 45
          ? 'bg-info'
          : 'bg-success';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Card
        className={cn(
          'group overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)] dark:hover:shadow-[0_28px_65px_rgba(2,6,23,0.38)]',
          isOverdue && 'border-danger/40 shadow-[0_20px_48px_rgba(220,38,38,0.12)]',
          isPaid && 'opacity-[0.86]',
          isHighlighted && 'ring-2 ring-primary/40 ring-offset-0 shadow-[0_28px_65px_rgba(139,92,246,0.18)]',
        )}
      >
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{card.name}</span>
                <span className="text-foreground/60">{`•••• ${card.last_four_digits}`}</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-[1.35rem] font-semibold tracking-tight text-foreground">
                  Fatura de {format(referenceMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Ciclo atual do cartao com visao de limite, vencimento e pagamento.
                </p>
              </div>
            </div>

            <InvoiceStatusBadge
              closingDate={invoice.closing_date}
              dueDate={invoice.due_date}
              totalAmount={invoice.total_amount}
              paidAmount={invoice.paid_amount}
              currentStatus={invoice.status}
              size="md"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div
              data-testid="invoice-value-panel"
              className="rounded-[24px] border border-border/70 bg-gradient-to-br from-primary/[0.05] via-surface-elevated/80 to-surface/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:from-primary/[0.08] dark:via-surface-elevated/60 dark:to-surface/95"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {hasPartialPayment ? 'Valor Restante' : 'Valor Total'}
                  </p>
                  <p className="text-[1.72rem] font-semibold tracking-tight text-foreground sm:text-[1.78rem]">
                    {formatCurrency(displayAmount)}
                  </p>
                </div>

                {hasPartialPayment ? (
                  <div className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    Pago {formatCurrency(invoice.paid_amount)}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-border/65 bg-background/50 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p className="text-[0.74rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/90">
                    Vencimento
                  </p>
                  <p
                    data-testid="invoice-due-value"
                    className={cn(
                      'mt-2 whitespace-nowrap text-[1.08rem] font-semibold leading-tight text-foreground',
                      isOverdue && 'text-danger',
                    )}
                  >
                    {format(dueDate, "dd 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {isPaid
                      ? 'Fatura quitada'
                      : isOverdue
                        ? `Vencida ha ${Math.abs(daysUntilDue)} dias`
                        : daysUntilDue <= 0
                          ? 'Vence hoje'
                          : `Vence em ${daysUntilDue} dias`}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/65 bg-background/50 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <p
                    data-testid="invoice-limit-label"
                    className="text-[0.74rem] font-medium uppercase tracking-[0.14em] text-muted-foreground/90"
                  >
                    Uso do limite
                  </p>
                  <p className="mt-2 text-[1.08rem] font-semibold leading-tight text-foreground">
                    {usagePercentage.toFixed(1)}%
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Limite total {formatCurrency(card.credit_limit)}
                  </p>
                </div>
              </div>
            </div>

            <div
              data-testid="invoice-usage-panel"
              className="rounded-[24px] border border-border/70 bg-gradient-to-br from-info/[0.045] via-surface-elevated/80 to-surface/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:from-info/[0.08] dark:via-surface-elevated/60 dark:to-surface/95"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Uso do limite</span>
                <span className={cn('font-semibold text-foreground', usagePercentage >= 80 && 'text-danger')}>
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>

              <div className="mt-3 h-2 rounded-full bg-surface-overlay/80">
                <div
                  className={cn('h-full rounded-full transition-all', progressToneClass)}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(invoice.total_amount)} usado</span>
                <span>Limite {formatCurrency(card.credit_limit)}</span>
              </div>

              <div className="mt-5 rounded-2xl border border-border/60 bg-background/55 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex items-center justify-between text-sm">
                  <span
                    data-testid="invoice-explore-title"
                    className="text-sm font-semibold text-foreground"
                  >
                    Explorar conteudo
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p
                  data-testid="invoice-explore-copy"
                  className="mt-2 text-[0.84rem] leading-6 text-muted-foreground"
                >
                  Veja transacoes, categorias, parcelas e historico de pagamentos desta fatura.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-border/60 pt-5">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-border/70 bg-surface/75 hover:bg-surface-elevated"
              onClick={onViewDetails}
            >
              Ver Detalhes
            </Button>
            {!isPaid && onPayInvoice ? (
              <Button
                className="flex-1 rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90"
                onClick={onPayInvoice}
              >
                Pagar Fatura
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
