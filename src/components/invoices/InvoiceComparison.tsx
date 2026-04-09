import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';

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
  currentTotal,
}: InvoiceComparisonProps) {
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreviousInvoice = async () => {
      try {
        setLoading(true);

        const currentDate = new Date(referenceMonth);
        const previousDate = subMonths(currentDate, 1);
        const previousMonthStr = format(previousDate, 'yyyy-MM-01');

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
        const percentageChange = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;

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
      } catch (error) {
        console.error('Erro ao buscar comparativo:', error);
        setComparison(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPreviousInvoice();
  }, [invoiceId, creditCardId, referenceMonth, currentTotal]);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-[24px]" />;
  }

  if (!comparison) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/35 px-5 py-4 text-center text-sm text-muted-foreground">
        Sem dados do mes anterior para comparacao.
      </div>
    );
  }

  const trendClass =
    comparison.trend === 'up'
      ? 'text-danger border-danger/20 bg-danger/10'
      : comparison.trend === 'down'
        ? 'text-success border-success/20 bg-success/10'
        : 'text-muted-foreground border-border/60 bg-surface/70';

  const TrendIcon =
    comparison.trend === 'up' ? TrendingUp : comparison.trend === 'down' ? TrendingDown : Minus;

  const differenceIcon =
    comparison.difference > 0 ? ArrowUpRight : comparison.difference < 0 ? ArrowDownRight : Minus;

  const DifferenceIcon = differenceIcon;

  return (
    <div className="rounded-[26px] border border-border/70 bg-surface-elevated/45 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Comparativo com {comparison.previousMonth}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Veja se o ciclo atual esta maior, menor ou estavel em relacao ao mes anterior.
          </p>
        </div>

        <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold', trendClass)}>
          <TrendIcon className="h-4 w-4" />
          {comparison.trend === 'up' ? 'Aumento' : comparison.trend === 'down' ? 'Reducao' : 'Estavel'}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] border border-border/60 bg-background/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mes anterior</p>
          <p className="mt-3 text-[1.35rem] font-semibold tracking-tight text-foreground">
            {formatCurrency(comparison.previousTotal)}
          </p>
        </div>

        <div className="rounded-[20px] border border-border/60 bg-background/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Diferenca</p>
          <div
            className={cn(
              'mt-3 inline-flex items-center gap-2 text-[1.2rem] font-semibold tracking-tight',
              comparison.difference > 0
                ? 'text-danger'
                : comparison.difference < 0
                  ? 'text-success'
                  : 'text-foreground',
            )}
          >
            <DifferenceIcon className="h-4 w-4" />
            <span>
              {comparison.difference > 0 ? '+' : ''}
              {formatCurrency(comparison.difference)}
            </span>
          </div>
        </div>

        <div className="rounded-[20px] border border-border/60 bg-background/55 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Variacao</p>
          <p className="mt-3 text-[1.2rem] font-semibold tracking-tight text-foreground">
            {comparison.percentageChange > 0 ? '+' : ''}
            {comparison.percentageChange.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">sobre o valor do ciclo anterior</p>
        </div>
      </div>
    </div>
  );
}
