import { useEffect, useState } from 'react';
import { Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

        // Buscar transações parceladas da fatura atual
        const { data, error } = await supabase
          .from('credit_card_transactions')
          .select('*')
          .eq('invoice_id', invoiceId)
          .eq('is_installment', true)
          .order('purchase_date', { ascending: true });

        if (error) throw error;

        // Agrupar por installment_group_id
        const groups: Record<string, InstallmentGroup> = {};

        data?.forEach((tx) => {
          const groupId = tx.installment_group_id || tx.id;
          
          if (!groups[groupId]) {
            groups[groupId] = {
              description: tx.description,
              totalInstallments: tx.total_installments || 1,
              currentInstallment: tx.current_installment || 1,
              installmentAmount: tx.amount,
              totalAmount: tx.amount * (tx.total_installments || 1),
              remainingAmount: tx.amount * ((tx.total_installments || 1) - (tx.current_installment || 1)),
              remainingInstallments: (tx.total_installments || 1) - (tx.current_installment || 1),
              purchaseDate: tx.purchase_date,
              installmentGroupId: groupId,
            };
          }
        });

        setInstallments(Object.values(groups));
      } catch (err) {
        console.error('Erro ao buscar parcelas:', err);
        setInstallments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstallments();
  }, [invoiceId, creditCardId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (installments.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Nenhuma compra parcelada nesta fatura</p>
      </div>
    );
  }

  // Calcular totais
  const totalCommitted = installments.reduce((sum, i) => sum + i.remainingAmount, 0);
  const totalInstallmentsRemaining = installments.reduce((sum, i) => sum + i.remainingInstallments, 0);

  return (
    <div className="space-y-4">
      {/* Resumo de Parcelas */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-700 font-medium">Limite comprometido futuro</p>
            <p className="text-xs text-amber-600 mt-1">
              {totalInstallmentsRemaining} parcelas restantes em {installments.length} compras
            </p>
          </div>
          <p className="text-xl font-bold text-amber-700">
            {formatCurrency(totalCommitted)}
          </p>
        </div>
      </div>

      {/* Lista de Parcelas */}
      <div className="space-y-3">
        {installments.map((installment) => {
          const progress = (installment.currentInstallment / installment.totalInstallments) * 100;
          
          return (
            <div 
              key={installment.installmentGroupId}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 line-clamp-1">
                    {installment.description}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(installment.purchaseDate), "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(installment.installmentAmount)}
                  </p>
                  <p className="text-xs text-gray-500">por parcela</p>
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Parcela {installment.currentInstallment} de {installment.totalInstallments}</span>
                  <span>{progress.toFixed(0)}% pago</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      progress >= 80 ? "bg-green-500" : 
                      progress >= 50 ? "bg-blue-500" : "bg-amber-500"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Detalhes */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Faltam {installment.remainingInstallments} parcelas
                </span>
                <span className="font-medium text-amber-600">
                  {formatCurrency(installment.remainingAmount)} restante
                </span>
              </div>

              {/* Timeline Visual */}
              {installment.remainingInstallments > 0 && installment.remainingInstallments <= 6 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Próximas parcelas:</p>
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {Array.from({ length: Math.min(installment.remainingInstallments, 6) }).map((_, idx) => {
                      const futureDate = addMonths(new Date(), idx + 1);
                      return (
                        <div 
                          key={idx}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
                        >
                          <span className="text-gray-600">
                            {format(futureDate, 'MMM', { locale: ptBR })}
                          </span>
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                        </div>
                      );
                    })}
                    {installment.remainingInstallments > 6 && (
                      <span className="text-xs text-gray-500">
                        +{installment.remainingInstallments - 6} meses
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
