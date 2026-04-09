import { motion } from 'framer-motion';
import { Building2, Trophy } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency, type TopProvider } from '@/hooks/useBillReports';

interface TopProvidersProps {
  providers: TopProvider[];
  totalAmount: number;
}

const rankShells = [
  'border-warning-border/55 bg-warning-subtle/60 text-warning',
  'border-border/60 bg-surface/70 text-foreground',
  'border-orange-400/30 bg-orange-500/10 text-orange-400',
  'border-primary/22 bg-primary/10 text-primary',
  'border-info-border/35 bg-info-subtle/55 text-info',
];

export function TopProviders({ providers, totalAmount }: TopProvidersProps) {
  if (providers.length === 0) {
    return (
      <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
            <Trophy className="h-5 w-5 text-primary" />
            Top 5 Maiores Gastos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-14 text-center text-muted-foreground">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-border/60 bg-surface/70">
            <Building2 className="h-6 w-6 opacity-60" />
          </div>
          <p className="text-base font-semibold text-foreground">Sem dados para exibir</p>
          <p className="mt-2 text-sm">Os maiores fornecedores vão aparecer aqui conforme você lança contas.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
          <Trophy className="h-5 w-5 text-primary" />
          Top 5 Maiores Gastos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-5">
        {providers.map((provider, index) => {
          const percentage = totalAmount > 0 ? (provider.total / totalAmount) * 100 : 0;

          return (
            <motion.div
              key={provider.provider}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-[1.35rem] border border-border/60 bg-surface/50 p-4"
            >
              <div className="mb-3 flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold shadow-sm',
                    rankShells[index] || rankShells[rankShells.length - 1],
                  )}
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-base font-semibold tracking-tight text-foreground">
                      {provider.provider}
                    </p>
                    <p className="whitespace-nowrap text-sm font-semibold text-foreground">
                      {formatCurrency(provider.total)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{provider.count} conta{provider.count > 1 ? 's' : ''}</span>
                    <span>Ticket médio {formatCurrency(provider.avg)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 rounded-full bg-background/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-info"
                    style={{ width: `${Math.max(percentage, 6)}%` }}
                  />
                </div>
                <div className="text-right text-xs font-medium text-muted-foreground">
                  {percentage.toFixed(1)}% do total do período
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
