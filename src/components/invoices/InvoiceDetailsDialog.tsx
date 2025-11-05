import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceSummary } from './InvoiceSummary';
import { InvoiceTransactionsList } from './InvoiceTransactionsList';
import { useInvoices } from '@/hooks/useInvoices';
import { useCreditCards } from '@/hooks/useCreditCards';
import { formatCurrency } from '@/utils/formatters';
import { INVOICE_STATUS_LABELS } from '@/constants/creditCards';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onPayInvoice?: () => void;
}

export function InvoiceDetailsDialog({
  open,
  onOpenChange,
  invoiceId,
  onPayInvoice,
}: InvoiceDetailsDialogProps) {
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { cards } = useCreditCards();

  const invoice = invoices.find((inv) => inv.id === invoiceId);
  const card = invoice ? cards.find((c) => c.id === invoice.credit_card_id) : null;

  const getBadgeVariant = (status: string): "default" | "outline" | "success" | "warning" | "danger" | "info" => {
    if (status === 'paid') return 'success';
    if (status === 'overdue') return 'danger';
    if (status === 'open') return 'info';
    if (status === 'closed') return 'warning';
    return 'default';
  };

  if (invoicesLoading || !invoice || !card) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Fatura de {format(new Date(invoice.reference_month), 'MMMM yyyy', { locale: ptBR })} - {card.name}
            </span>
            <Badge variant={getBadgeVariant(invoice.status)}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo da Fatura */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo da Fatura</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Vencimento</p>
                <p className="text-lg font-semibold text-gray-900">
                  {format(new Date(invoice.due_date), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Período</p>
                <p className="text-sm font-medium text-gray-900">
                  {format(new Date(invoice.closing_date), 'dd/MM', { locale: ptBR })} -{' '}
                  {format(new Date(invoice.due_date), 'dd/MM', { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="text-sm font-semibold text-gray-900">
                  {INVOICE_STATUS_LABELS[invoice.status]}
                </p>
              </div>
            </div>

            {invoice.paid_amount > 0 && (
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Valor Pago</span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(invoice.paid_amount)}
                  </span>
                </div>
                {invoice.remaining_amount > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600">Valor Restante</span>
                    <span className="text-lg font-semibold text-orange-600">
                      {formatCurrency(invoice.remaining_amount)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gráfico de Despesas */}
          <div>
            <InvoiceSummary invoiceId={invoiceId} />
          </div>

          {/* Lista de Transações */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transações</h3>
            <InvoiceTransactionsList invoiceId={invoiceId} />
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {!isPaid && onPayInvoice && (
              <Button onClick={onPayInvoice}>
                Pagar Fatura
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
