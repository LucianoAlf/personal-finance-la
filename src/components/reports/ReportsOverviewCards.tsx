import { Gauge, PiggyBank, Target, Wallet } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import type { ReportIntelligenceContext } from '@/utils/reports/intelligence-contract';
import { buildReportsOverviewCards } from '@/utils/reports/view-model';

interface ReportsOverviewCardsProps {
  context: ReportIntelligenceContext | null;
  loading?: boolean;
}

const CARD_ICONS = [Gauge, PiggyBank, Wallet, Target] as const;
const CARD_STYLES = [
  {
    shell: 'border-sky-400/20',
    line: 'via-sky-300/80',
    glow: 'bg-sky-400/12',
    icon: 'from-sky-500 to-blue-600 shadow-[0_14px_24px_rgba(59,130,246,0.28)] ring-sky-300/20',
  },
  {
    shell: 'border-emerald-400/20',
    line: 'via-emerald-300/80',
    glow: 'bg-emerald-400/12',
    icon: 'from-emerald-500 to-emerald-600 shadow-[0_14px_24px_rgba(16,185,129,0.28)] ring-emerald-300/20',
  },
  {
    shell: 'border-slate-400/20',
    line: 'via-slate-300/80',
    glow: 'bg-slate-400/12',
    icon: 'from-slate-500 to-slate-600 shadow-[0_14px_24px_rgba(71,85,105,0.26)] ring-slate-300/20',
  },
  {
    shell: 'border-violet-400/20',
    line: 'via-violet-300/80',
    glow: 'bg-violet-400/12',
    icon: 'from-violet-500 to-fuchsia-500 shadow-[0_14px_24px_rgba(139,92,246,0.28)] ring-violet-300/20',
  },
] as const;

export function ReportsOverviewCards({
  context,
  loading = false,
}: ReportsOverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="rounded-[1.75rem] border-border/70 bg-surface/92 shadow-[0_18px_42px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_48px_rgba(2,6,23,0.26)]"
          >
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-4 w-32" />
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
        const style = CARD_STYLES[index];
        const isCurrencyValue = card.value.includes('R$');
        const isLongValue = card.value.length >= 10;

        return (
          <Card
            key={card.title}
            data-testid={`reports-overview-card-${index}`}
            className={cn(
              'group relative overflow-hidden rounded-[1.75rem] border bg-surface/92 shadow-[0_18px_42px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-surface-elevated/92 hover:shadow-[0_24px_50px_rgba(3,8,20,0.24)] dark:shadow-[0_20px_48px_rgba(2,6,23,0.28)]',
              style.shell,
            )}
          >
            <div
              className={cn(
                'absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80',
                style.line,
              )}
            />
            <div
              className={cn(
                'pointer-events-none absolute -right-10 top-4 h-24 w-24 rounded-full blur-3xl opacity-80',
                style.glow,
              )}
            />

            <CardContent className="relative p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="space-y-2">
                    <p
                      className={cn(
                        'max-w-full font-semibold tracking-tight text-foreground',
                        isCurrencyValue
                          ? 'whitespace-nowrap text-[clamp(1.55rem,1.7vw,2rem)] leading-[1.05]'
                          : 'text-[clamp(1.85rem,2vw,2.15rem)] leading-[1.02]',
                        isLongValue && 'text-[clamp(1.45rem,1.6vw,1.85rem)]',
                      )}
                    >
                      {card.value}
                    </p>
                    <p className="max-w-[28ch] text-sm leading-6 text-muted-foreground">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ring-1',
                    style.icon,
                  )}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
