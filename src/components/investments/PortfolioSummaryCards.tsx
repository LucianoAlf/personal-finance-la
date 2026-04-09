import { DollarSign, Percent, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatCurrency } from '@/utils/formatters';

interface PortfolioSummaryCardsProps {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  returnPercentage: number;
}

export function PortfolioSummaryCards({
  totalInvested,
  currentValue,
  totalReturn,
  returnPercentage,
}: PortfolioSummaryCardsProps) {
  const isPositive = totalReturn >= 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total Investido"
        value={formatCurrency(totalInvested)}
        subtitle="Capital aportado no portfólio"
        icon={Wallet}
        gradient="blue"
        valueClassName="text-[1.52rem] sm:text-[1.65rem]"
      />

      <StatCard
        title="Valor Atual"
        value={formatCurrency(currentValue)}
        subtitle="Patrimônio marcado na carteira"
        icon={DollarSign}
        gradient="purple"
        valueClassName="text-[1.52rem] sm:text-[1.65rem]"
      />

      <StatCard
        title="Valorização"
        value={formatCurrency(totalReturn)}
        subtitle={isPositive ? 'Ganho acumulado até agora' : 'Variação acumulada da carteira'}
        icon={isPositive ? TrendingUp : TrendingDown}
        gradient={isPositive ? 'green' : 'red'}
        valueClassName="text-[1.52rem] sm:text-[1.65rem]"
      />

      <StatCard
        title="Rentabilidade"
        value={`${returnPercentage >= 0 ? '+' : ''}${returnPercentage.toFixed(2)}%`}
        subtitle="Retorno percentual consolidado"
        icon={Percent}
        gradient={isPositive ? 'green' : 'red'}
        valueClassName="text-[1.52rem] sm:text-[1.65rem]"
      />
    </div>
  );
}
