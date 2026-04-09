import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Calendar, History, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useInvoices } from '@/hooks/useInvoices';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';

import { InstallmentTimeline } from './InstallmentTimeline';
import { InvoiceComparison } from './InvoiceComparison';
import { InvoicePaymentHistory } from './InvoicePaymentHistory';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoiceSummary } from './InvoiceSummary';
import { InvoiceTransactionsList } from './InvoiceTransactionsList';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onPayInvoice?: () => void;
}

const primaryButtonClass =
  'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';

export function InvoiceDetailsDialog({
  open,
  onOpenChange,
  invoiceId,
  onPayInvoice,
}: InvoiceDetailsDialogProps) {
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { cards } = useCreditCards();

  const invoice = invoices.find((item) => item.id === invoiceId);
  const card = invoice ? cards.find((item) => item.id === invoice.credit_card_id) : null;

  if (invoicesLoading || !invoice || !card) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
          <div className="space-y-4 px-6 py-6">
            <Skeleton className="h-8 w-3/4 rounded-xl" />
            <Skeleton className="h-36 w-full rounded-[24px]" />
            <Skeleton className="h-16 w-full rounded-[24px]" />
            <Skeleton className="h-64 w-full rounded-[24px]" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isPaid = invoice.status === 'paid';
  const paidAmount = Number(invoice.paid_amount) || 0;
  const remainingAmount = Number(invoice.remaining_amount) || Math.max(Number(invoice.total_amount) - paidAmount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-[1.55rem] font-semibold tracking-tight text-foreground">
                Fatura de {format(new Date(`${invoice.reference_month}T12:00:00`), 'MMMM yyyy', { locale: ptBR })} - {card.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Explore transacoes, categorias, parcelas e historico de pagamentos deste ciclo.
              </p>
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
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-[28px] border border-border/70 bg-surface-elevated/45 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Resumo da fatura</h3>
                <p className="mt-1 text-sm text-muted-foreground">Visao rapida do total, vencimento, periodo e saldo restante.</p>
              </div>
              <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Cartao {card.name}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-[22px] border border-border/60 bg-background/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Valor total</p>
                <p className="mt-3 text-[1.55rem] font-semibold tracking-tight text-foreground">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>

              <div className="rounded-[22px] border border-border/60 bg-background/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vencimento</p>
                <p className="mt-3 text-[1.1rem] font-semibold tracking-tight text-foreground">
                  {format(new Date(invoice.due_date), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>

              <div className="rounded-[22px] border border-border/60 bg-background/55 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Periodo</p>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {format(new Date(invoice.closing_date), 'dd/MM', { locale: ptBR })} -{' '}
                  {format(new Date(invoice.due_date), 'dd/MM', { locale: ptBR })}
                </p>
              </div>

              <div
                className={cn(
                  'rounded-[22px] border p-4',
                  paidAmount > 0 ? 'border-success/20 bg-success/10' : 'border-border/60 bg-background/55',
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {paidAmount > 0 ? 'Saldo restante' : 'Status'}
                </p>
                <p className={cn('mt-3 text-[1.1rem] font-semibold tracking-tight text-foreground', paidAmount > 0 && 'text-success')}>
                  {paidAmount > 0 ? formatCurrency(remainingAmount) : 'Aberta'}
                </p>
              </div>
            </div>
          </div>

          <InvoiceComparison
            invoiceId={invoiceId}
            creditCardId={invoice.credit_card_id}
            referenceMonth={typeof invoice.reference_month === 'string' ? invoice.reference_month : format(new Date(invoice.reference_month), 'yyyy-MM-dd')}
            currentTotal={invoice.total_amount}
          />

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList
              data-testid="tabs-list"
              className="grid h-auto w-full grid-cols-4 rounded-[1.3rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]"
            >
              <TabsTrigger
                value="transactions"
                className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-xs font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15 sm:text-sm"
              >
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Transacoes</span>
                <span className="sm:hidden">Trans.</span>
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-xs font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15 sm:text-sm"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
                <span className="sm:hidden">Cat.</span>
              </TabsTrigger>
              <TabsTrigger
                value="installments"
                className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-xs font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15 sm:text-sm"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Parcelas</span>
                <span className="sm:hidden">Parc.</span>
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="flex items-center gap-2 rounded-[1rem] px-4 py-3 text-xs font-semibold text-muted-foreground data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/15 sm:text-sm"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Pagamentos</span>
                <span className="sm:hidden">Pag.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-5">
              <InvoiceTransactionsList invoiceId={invoiceId} />
            </TabsContent>

            <TabsContent value="categories" className="mt-5">
              <InvoiceSummary invoiceId={invoiceId} />
            </TabsContent>

            <TabsContent value="installments" className="mt-5">
              <InstallmentTimeline invoiceId={invoiceId} creditCardId={invoice.credit_card_id} />
            </TabsContent>

            <TabsContent value="payments" className="mt-5">
              <InvoicePaymentHistory invoiceId={invoiceId} totalAmount={invoice.total_amount} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            >
              Fechar
            </Button>
            {!isPaid && onPayInvoice ? (
              <Button onClick={onPayInvoice} className={primaryButtonClass}>
                Pagar Fatura
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
