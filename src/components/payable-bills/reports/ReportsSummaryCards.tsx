import { motion } from 'framer-motion';
import {
  CheckCircle2,
  DollarSign,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent, type Comparison } from '@/hooks/useBillReports';

interface ReportsSummaryCardsProps {
  totalAmount: number;
  totalBills: number;
  comparison: Comparison;
  forecastAmount: number;
  forecastMonths: number;
  onTimeRate: number;
  paidCount: number;
  totalPaid: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  tone: 'blue' | 'red' | 'purple' | 'green';
}

const toneStyles = {
  blue: {
    shell:
      'bg-[linear-gradient(145deg,rgba(59,130,246,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(59,130,246,0.14),rgba(15,23,42,0)_76%)]',
    iconBox: 'border-info-border/60 bg-info/10 text-info',
  },
  red: {
    shell:
      'bg-[linear-gradient(145deg,rgba(239,68,68,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(239,68,68,0.14),rgba(15,23,42,0)_76%)]',
    iconBox: 'border-danger-border/60 bg-danger/10 text-danger',
  },
  purple: {
    shell:
      'bg-[linear-gradient(145deg,rgba(139,92,246,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(139,92,246,0.14),rgba(15,23,42,0)_76%)]',
    iconBox: 'border-primary/18 bg-primary/10 text-primary',
  },
  green: {
    shell:
      'bg-[linear-gradient(145deg,rgba(16,185,129,0.12),rgba(255,255,255,0)_45%)] dark:bg-[linear-gradient(145deg,rgba(16,185,129,0.14),rgba(15,23,42,0)_76%)]',
    iconBox: 'border-success-border/60 bg-success/10 text-success',
  },
} as const;

function MetricCard({ title, value, subtitle, icon: Icon, tone }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-border/70 bg-card/95 p-3 md:p-5 shadow-[0_18px_44px_rgba(3,8,20,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(3,8,20,0.18)] dark:shadow-[0_22px_48px_rgba(2,6,23,0.28)]',
        toneStyles[tone].shell,
      )}
    >
      <div className="mb-3 md:mb-5 flex items-start justify-between gap-4">
        <div className={cn('flex h-8 w-8 md:h-11 md:w-11 items-center justify-center rounded-xl border shadow-sm', toneStyles[tone].iconBox)}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      </div>
      <h3 className="mb-1 text-xs md:text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="text-base md:text-[1.52rem] font-semibold leading-tight tracking-tight text-foreground [font-variant-numeric:tabular-nums] lg:text-[1.68rem]">
        {value}
      </p>
      <p className="hidden md:block mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function ReportsSummaryCards({
  totalAmount,
  totalBills,
  comparison,
  forecastAmount,
  forecastMonths,
  onTimeRate,
  paidCount,
  totalPaid,
}: ReportsSummaryCardsProps) {
  const comparisonIcon =
    comparison.trend === 'up' ? TrendingUp : comparison.trend === 'down' ? TrendingDown : Minus;
  const comparisonTone: MetricCardProps['tone'] =
    comparison.trend === 'down' ? 'green' : comparison.trend === 'stable' ? 'red' : 'red';

  const cards: MetricCardProps[] = [
    {
      title: 'Total do Período',
      value: formatCurrency(totalAmount),
      subtitle: `${totalBills} conta${totalBills === 1 ? '' : 's'}`,
      icon: DollarSign,
      tone: 'blue',
    },
    {
      title: 'vs Período Anterior',
      value: formatPercent(comparison.variation_percent),
      subtitle: `${comparison.trend === 'up' ? '+' : comparison.trend === 'down' ? '' : ''}${formatCurrency(comparison.difference)}`,
      icon: comparisonIcon,
      tone: comparisonTone,
    },
    {
      title: 'Previsão Próx. Mês',
      value: formatCurrency(forecastAmount),
      subtitle: `Baseado em ${forecastMonths} ${forecastMonths === 1 ? 'mês' : 'meses'}`,
      icon: Target,
      tone: 'purple',
    },
    {
      title: 'Taxa de Pontualidade',
      value: `${onTimeRate.toFixed(0)}%`,
      subtitle: totalPaid > 0 ? `${paidCount}/${totalPaid} em dia` : 'Sem histórico de pagamento',
      icon: CheckCircle2,
      tone: 'green',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
        >
          <MetricCard {...card} />
        </motion.div>
      ))}
    </div>
  );
}
