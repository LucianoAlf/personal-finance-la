import { motion } from 'framer-motion';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  getBillTypeLabel,
  type TopIncrease,
} from '@/hooks/useBillReports';

interface TopIncreasesProps {
  increases: TopIncrease[];
}

export function TopIncreases({ increases }: TopIncreasesProps) {
  if (increases.length === 0) {
    return (
      <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
            <TrendingUp className="h-5 w-5 text-primary" />
            Contas que Mais Subiram
          </CardTitle>
        </CardHeader>
        <CardContent className="py-14 text-center text-muted-foreground">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-border/60 bg-surface/70">
            <TrendingUp className="h-6 w-6 opacity-60" />
          </div>
          <p className="text-base font-semibold text-foreground">Nenhuma variação relevante</p>
          <p className="mt-2 text-sm">Suas contas ficaram estáveis neste recorte.</p>
        </CardContent>
      </Card>
    );
  }

  const maxIncrease = Math.max(...increases.map((item) => item.difference), 1);

  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
          <TrendingUp className="h-5 w-5 text-primary" />
          Contas que Mais Subiram
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {increases.map((increase, index) => {
          const width = (increase.difference / maxIncrease) * 100;
          const isHighVariation = increase.variation_percent > 30;

          return (
            <motion.div
              key={`${increase.description}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-[1.35rem] border border-border/60 bg-surface/50 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-semibold tracking-tight text-foreground">
                    {increase.description}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {increase.provider ? `${increase.provider} • ` : ''}
                    {getBillTypeLabel(increase.bill_type)}
                  </p>
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/55 px-3 py-1 text-xs font-semibold whitespace-nowrap',
                    isHighVariation ? 'text-danger' : 'text-warning',
                  )}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  +{increase.variation_percent.toFixed(0)}%
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 rounded-full bg-background/70">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      isHighVariation
                        ? 'bg-gradient-to-r from-danger to-rose-400'
                        : 'bg-gradient-to-r from-warning to-amber-300',
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(increase.previous_amount)} → {formatCurrency(increase.current_amount)}
                  </span>
                  <span className="font-semibold text-foreground">+{formatCurrency(increase.difference)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
