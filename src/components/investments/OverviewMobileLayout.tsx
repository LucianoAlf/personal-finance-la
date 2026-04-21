import type { ReactNode } from 'react';
import type { Investment } from '@/types/database.types';
import { AssetAllocationChart } from './AssetAllocationChart';
import { PortfolioEvolutionChart } from './PortfolioEvolutionChart';
import { PerformanceBarChart } from './PerformanceBarChart';
import { AnaInvestmentInsights } from './AnaInvestmentInsights';

interface AllocationData {
  category: string;
  value: number;
  percentage: number;
  count: number;
}

export interface OverviewMobileLayoutProps {
  allocationData?: AllocationData[];
  totalInvested?: number;
  currentValue?: number;
  investments?: Investment[];
}

function CardBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-2 rounded-xl border border-border/60 bg-surface-elevated/60 p-3">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function OverviewMobileLayout({
  allocationData = [],
  totalInvested = 0,
  currentValue = 0,
  investments = [],
}: OverviewMobileLayoutProps) {
  return (
    <div className="lg:hidden space-y-3 pb-4 pt-2">
      <CardBox title="Alocação por Tipo">
        <AssetAllocationChart data={allocationData} />
      </CardBox>

      <CardBox title="Evolução do Patrimônio">
        <PortfolioEvolutionChart totalInvested={totalInvested} currentValue={currentValue} />
      </CardBox>

      <CardBox title="Performance por Ativo">
        <PerformanceBarChart investments={investments} />
      </CardBox>

      <div className="mx-2 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-3">
        <AnaInvestmentInsights investments={investments} />
      </div>
    </div>
  );
}
