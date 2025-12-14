import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InvoiceComparisonProps {
  invoiceId: string;
  creditCardId: string;
  referenceMonth: string;
  currentTotal: number;
}

interface ComparisonData {
  previousTotal: number;
  previousMonth: string;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'same';
}

export function InvoiceComparison({ 
  invoiceId, 
  creditCardId, 
  referenceMonth, 
  currentTotal 
}: InvoiceComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreviousInvoice = async () => {
      try {
        setLoading(true);
        
        // Calcular mês anterior
        const currentDate = new Date(referenceMonth);
        const previousDate = subMonths(currentDate, 1);
        const previousMonthStr = format(previousDate, 'yyyy-MM-01');

        // Buscar fatura do mês anterior
        const { data, error } = await supabase
          .from('credit_card_invoices')
          .select('total_amount, reference_month')
          .eq('credit_card_id', creditCardId)
          .eq('reference_month', previousMonthStr)
          .single();

        if (error || !data) {
          setComparison(null);
          return;
        }

        const previousTotal = data.total_amount || 0;
        const difference = currentTotal - previousTotal;
        const percentageChange = previousTotal > 0 
          ? ((difference / previousTotal) * 100) 
          : 0;

        let trend: 'up' | 'down' | 'same' = 'same';
        if (Math.abs(percentageChange) < 1) {
          trend = 'same';
        } else if (difference > 0) {
          trend = 'up';
        } else {
          trend = 'down';
        }

        setComparison({
          previousTotal,
          previousMonth: format(previousDate, 'MMMM', { locale: ptBR }),
          difference,
          percentageChange,
          trend,
        });
      } catch (err) {
        console.error('Erro ao buscar comparativo:', err);
        setComparison(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviousInvoice();
  }, [invoiceId, creditCardId, referenceMonth, currentTotal]);

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!comparison) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
        Sem dados do mês anterior para comparação
      </div>
    );
  }

  const getTrendIcon = () => {
    if (comparison.trend === 'up') {
      return <TrendingUp className="h-5 w-5 text-red-500" />;
    }
    if (comparison.trend === 'down') {
      return <TrendingDown className="h-5 w-5 text-green-500" />;
    }
    return <Minus className="h-5 w-5 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (comparison.trend === 'up') return 'text-red-600 bg-red-50';
    if (comparison.trend === 'down') return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getTrendLabel = () => {
    if (comparison.trend === 'up') return 'Aumento';
    if (comparison.trend === 'down') return 'Redução';
    return 'Estável';
  };

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
        {getTrendIcon()}
        Comparativo com {comparison.previousMonth}
      </h4>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Mês Anterior */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Mês anterior</p>
          <p className="text-lg font-semibold text-gray-700">
            {formatCurrency(comparison.previousTotal)}
          </p>
        </div>

        {/* Diferença */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Diferença</p>
          <div className="flex items-center gap-1">
            {comparison.difference > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            ) : comparison.difference < 0 ? (
              <ArrowDownRight className="h-4 w-4 text-green-500" />
            ) : null}
            <p className={`text-lg font-semibold ${
              comparison.difference > 0 ? 'text-red-600' : 
              comparison.difference < 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              {comparison.difference > 0 ? '+' : ''}{formatCurrency(comparison.difference)}
            </p>
          </div>
        </div>

        {/* Variação % */}
        <div>
          <p className="text-xs text-gray-500 mb-1">Variação</p>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getTrendColor()}`}>
            {comparison.percentageChange > 0 ? '+' : ''}
            {comparison.percentageChange.toFixed(1)}%
            <span className="ml-1 text-xs">({getTrendLabel()})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
