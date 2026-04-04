import { useState } from 'react';
import { ChevronRight, ChevronDown, ChevronUp, Eye, Edit2, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { parseDateOnlyAsLocal } from '@/utils/dateOnly';

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
      
      // Lazy load das transações
      if (!transactions[invoiceId]) {
        setLoadingTransactions(prev => new Set(prev).add(invoiceId));
        
        const { data } = await supabase
          .from('credit_card_transactions')
          .select(`
            purchase_date,
            description,
            amount,
            categories (
              name,
              color,
              icon
            )
          `)
          .eq('invoice_id', invoiceId)
          .order('purchase_date', { ascending: false });

        setTransactions(prev => ({ ...prev, [invoiceId]: data || [] }));
        setLoadingTransactions(prev => {
          const next = new Set(prev);
          next.delete(invoiceId);
          return next;
        });
      }
    }
    
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      paid: {
        style: 'bg-green-100 text-green-800',
        icon: CheckCircle2,
        label: 'Pago'
      },
      open: {
        style: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        label: 'Pendente'
      },
      overdue: {
        style: 'bg-red-100 text-red-800',
        icon: XCircle,
        label: 'Atrasado'
      },
      partial: {
        style: 'bg-orange-100 text-orange-800',
        icon: AlertCircle,
        label: 'Parcial'
      },
      closed: {
        style: 'bg-blue-100 text-blue-800',
        icon: Package,
        label: 'Fechada'
      },
    } as const;

    const statusConfig = config[status as keyof typeof config] || config.open;
    const Icon = statusConfig.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.style}`}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </span>
    );
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sorting.column !== column) return null;
    return sorting.direction === 'asc' 
      ? <ChevronUp className="inline h-4 w-4 ml-1" />
      : <ChevronDown className="inline h-4 w-4 ml-1" />;
  };

  const totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-700 font-medium">Nenhuma fatura encontrada com os filtros aplicados</p>
        <p className="text-gray-500 mt-1 text-sm">Dicas: ajuste o período, selecione outros cartões, reduza a faixa de valores ou limpe a busca.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => onSortChange('reference_month')}
              >
                Mês <SortIcon column="reference_month" />
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => onSortChange('credit_card_id')}
              >
                Cartão <SortIcon column="credit_card_id" />
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => onSortChange('total_amount')}
              >
                Total <SortIcon column="total_amount" />
              </th>
              <th 
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => onSortChange('paid_amount')}
              >
                Pago <SortIcon column="paid_amount" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Restante
              </th>
              <th 
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => onSortChange('status')}
              >
                Status <SortIcon column="status" />
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoices.map((invoice) => {
              const isExpanded = expandedRows.has(invoice.id);
              const remaining = invoice.total_amount - (invoice.paid_amount || 0);

              return (
                <>
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(invoice.id)}
                        className="p-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(parseDateOnlyAsLocal(invoice.reference_month), 'MMM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {invoice.credit_cards?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.credit_cards?.brand || ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {formatCurrency(invoice.paid_amount || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 hover:bg-blue-50"
                          onClick={() => toggleRow(invoice.id)}
                          title="Ver transações"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 hover:bg-gray-100"
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
                          className="p-1 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (onDeleteInvoice) {
                              onDeleteInvoice(invoice.id);
                            } else {
                              toast({ title: 'Excluir fatura', description: 'Funcionalidade em desenvolvimento', variant: 'destructive' });
                            }
                          }}
                          title="Excluir fatura"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>

                  {/* Linha Expansível */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Transações de {format(parseDateOnlyAsLocal(invoice.reference_month), 'MMMM/yyyy', { locale: ptBR })}
                          </h4>

                          {loadingTransactions.has(invoice.id) ? (
                            <div className="space-y-2">
                              {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-12 w-full" />
                              ))}
                            </div>
                          ) : transactions[invoice.id]?.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-white">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Categoria</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {transactions[invoice.id].map((tx, idx) => (
                                    <tr key={idx} className="bg-white">
                                      <td className="px-3 py-2 text-gray-900">
                                        {tx.purchase_date ? format(parseDateOnlyAsLocal(tx.purchase_date), 'dd/MM/yyyy') : ''}
                                      </td>
                                      <td className="px-3 py-2 text-gray-900">{tx.description}</td>
                                      <td className="px-3 py-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                                          {tx.categories?.name || 'Sem categoria'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                                        {formatCurrency(tx.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-white border-t-2">
                                  <tr>
                                    <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total:</td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                                      {formatCurrency(invoice.total_amount)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">Nenhuma transação encontrada</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Mostrando {(pagination.page - 1) * pagination.pageSize + 1}-
          {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} de {pagination.totalItems}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={pagination.pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
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
          >
            Anterior
          </Button>

          <span className="text-sm text-gray-600">
            Página {pagination.page} de {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </Card>
  );
}
