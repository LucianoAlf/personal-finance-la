import { Gauge, PiggyBank, Target, Wallet } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { buildReportsOverviewCards } from '@/utils/reports/view-model';

interface ReportsOverviewCardsProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

const CARD_ICONS = [Gauge, PiggyBank, Wallet, Target] as const;
const CARD_STYLES = [
  'border-blue-200 bg-blue-50/60 text-blue-700',
  'border-emerald-200 bg-emerald-50/60 text-emerald-700',
  'border-slate-200 bg-slate-50 text-slate-700',
  'border-violet-200 bg-violet-50/60 text-violet-700',
] as const;

export function ReportsOverviewCards({
  context,
  loading = false,
}: ReportsOverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!context) {
    return null;
  }

  const cards = buildReportsOverviewCards(context);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = CARD_ICONS[index];

        return (
          <Card key={card.title} className={CARD_STYLES[index]}>
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className="rounded-full bg-white p-2 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
