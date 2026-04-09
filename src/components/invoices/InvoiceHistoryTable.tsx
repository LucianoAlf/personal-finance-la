import { Fragment, useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, Eye, Edit2, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';
import { SimpleInvoiceStatusBadge } from './InvoiceStatusBadge';

interface Props {
  invoices: any[];
  loading: boolean;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
  };
  sorting: {
    column: string;
    direction: 'asc' | 'desc';
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (column: string) => void;
  onEditInvoice?: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

const headerCellClassName =
  'px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';

export function InvoiceHistoryTable({
  invoices,
  loading,
  pagination,
  sorting,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onEditInvoice,
  onDeleteInvoice,
}: Props) {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [transactions, setTransactions] = useState<Record<string, any[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Set<string>>(new Set());

  const toggleRow = async (invoiceId: string) => {
    const newExpanded = new Set(expandedRows);

    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);

      if (!transactions[invoiceId]) {
        setLoadingTransactions((prev) => new Set(prev).add(invoiceId));

        const { data } = await supabase
          .from('credit_card_transactions')
          .select(
            `
            purchase_date,
            description,
            amount,
            categories (
              name,
              color,
              icon
            )
          `,
          )
          .eq('invoice_id', invoiceId)
          .order('purchase_date', { ascending: false });

        setTransactions((prev) => ({ ...prev, [invoiceId]: data || [] }));
        setLoadingTransactions((prev) => {
          const next = new Set(prev);
          next.delete(invoiceId);
          return next;
        });
      }
    }

    setExpandedRows(newExpanded);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sorting.column !== column) return null;
    return sorting.direction === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);

  if (loading) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 p-6 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[18px]" />
          ))}
        </div>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="rounded-[30px] border-border/70 bg-card/95 p-12 text-center shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]">
        <p className="font-medium text-foreground">Nenhuma fatura encontrada com os filtros aplicados</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Dicas: ajuste o período, selecione outros cartões, reduza a faixa de valores ou limpe a busca.
        </p>
      </Card>
    );
  }

  return (
    <Card
      data-testid="invoice-history-table"
      className="overflow-hidden rounded-[30px] border-border/70 bg-card/95 shadow-[0_18px_45px_rgba(3,8,20,0.16)] dark:shadow-[0_22px_50px_rgba(2,6,23,0.28)]"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead data-testid="invoice-history-head" className="border-b border-border/60 bg-surface/80">
            <tr>
              <th className={`${headerCellClassName} w-12 text-left`}></th>
              <th
                className={`${headerCellClassName} cursor-pointer text-left transition-colors hover:bg-surface-elevated/70`}
                onClick={() => onSortChange('reference_month')}
              >
                Mês <SortIcon column="reference_month" />
              </th>
              <th
                className={`${headerCellClassName} cursor-pointer text-left transition-colors hover:bg-surface-elevated/70`}
                onClick={() => onSortChange('credit_card_id')}
              >
                Cartão <SortIcon column="credit_card_id" />
              </th>
              <th
                className={`${headerCellClassName} cursor-pointer text-right transition-colors hover:bg-surface-elevated/70`}
                onClick={() => onSortChange('total_amount')}
              >
                Total <SortIcon column="total_amount" />
              </th>
              <th
                className={`${headerCellClassName} cursor-pointer text-right transition-colors hover:bg-surface-elevated/70`}
                onClick={() => onSortChange('paid_amount')}
              >
                Pago <SortIcon column="paid_amount" />
              </th>
              <th className={`${headerCellClassName} text-right`}>Restante</th>
              <th
                className={`${headerCellClassName} cursor-pointer text-center transition-colors hover:bg-surface-elevated/70`}
                onClick={() => onSortChange('status')}
              >
                Status <SortIcon column="status" />
              </th>
              <th className={`${headerCellClassName} text-center`}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {invoices.map((invoice) => {
              const isExpanded = expandedRows.has(invoice.id);
              const remaining = invoice.total_amount - (invoice.paid_amount || 0);

              return (
                <Fragment key={invoice.id}>
                  <tr className="transition-colors hover:bg-surface-elevated/45">
                    <td className="px-4 py-3">
                      <Button
                        data-testid={`invoice-history-expand-${invoice.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(invoice.id)}
                        className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-surface hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {format(parseDateOnlyAsLocal(invoice.reference_month), 'MMM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {invoice.credit_cards?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.credit_cards?.brand || ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-success">
                      {formatCurrency(invoice.paid_amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SimpleInvoiceStatusBadge status={invoice.status as any} size="sm" className="justify-center" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-surface hover:text-foreground"
                          onClick={() => toggleRow(invoice.id)}
                          title="Ver transações"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-surface hover:text-foreground"
                          onClick={() => {
                            if (onEditInvoice) {
                              onEditInvoice(invoice.id);
                            } else {
                              toast({ title: 'Editar fatura', description: 'Funcionalidade em desenvolvimento' });
                            }
                          }}
                          title="Editar fatura"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg p-0 text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => {
                            if (onDeleteInvoice) {
                              onDeleteInvoice(invoice.id);
                            } else {
                              toast({
                                title: 'Excluir fatura',
                                description: 'Funcionalidade em desenvolvimento',
                                variant: 'destructive',
                              });
                            }
                          }}
                          title="Excluir fatura"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded ? (
                    <tr>
                      <td colSpan={8} className="bg-surface/45 p-0">
                        <div
                          data-testid={`invoice-history-expanded-${invoice.id}`}
                          className="space-y-3 border-t border-border/60 bg-surface/45 px-6 py-5"
                        >
                          <h4 className="mb-3 font-semibold text-foreground">
                            Transações de {format(parseDateOnlyAsLocal(invoice.reference_month), 'MMMM/yyyy', { locale: ptBR })}
                          </h4>

                          {loadingTransactions.has(invoice.id) ? (
                            <div className="space-y-2">
                              {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full rounded-[16px]" />
                              ))}
                            </div>
                          ) : transactions[invoice.id]?.length > 0 ? (
                            <div className="overflow-hidden rounded-[22px] border border-border/60 bg-surface-elevated/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-surface/75">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        Data
                                      </th>
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        Descrição
                                      </th>
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        Categoria
                                      </th>
                                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        Valor
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {transactions[invoice.id].map((tx, idx) => (
                                      <tr key={idx} className="bg-transparent transition-colors hover:bg-surface/55">
                                        <td className="px-3 py-2 text-foreground">
                                          {tx.purchase_date ? format(parseDateOnlyAsLocal(tx.purchase_date), 'dd/MM/yyyy') : ''}
                                        </td>
                                        <td className="px-3 py-2 text-foreground">{tx.description}</td>
                                        <td className="px-3 py-2">
                                          <span className="rounded-full border border-border/60 bg-surface px-2.5 py-1 text-xs text-muted-foreground">
                                            {tx.categories?.name || 'Sem categoria'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-foreground">
                                          {formatCurrency(tx.amount)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="border-t border-border/60 bg-surface/70">
                                    <tr>
                                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-foreground">
                                        Total:
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold text-foreground">
                                        {formatCurrency(invoice.total_amount)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <p className="py-4 text-center text-muted-foreground">Nenhuma transação encontrada</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        data-testid="invoice-history-pagination"
        className="flex items-center justify-between border-t border-border/60 bg-surface/55 px-4 py-3"
      >
        <div className="text-sm text-muted-foreground">
          Mostrando {(pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de {pagination.totalItems}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-9 rounded-xl border border-border/70 bg-surface/80 px-3 text-sm text-foreground"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="rounded-xl border-border/70 bg-surface/80 hover:bg-surface-elevated"
          >
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground">
            Página {pagination.page} de {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="rounded-xl border-border/70 bg-surface/80 hover:bg-surface-elevated"
          >
            Próxima
          </Button>
        </div>
      </div>
    </Card>
  );
}
