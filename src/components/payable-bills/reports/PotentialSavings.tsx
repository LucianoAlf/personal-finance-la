import { motion } from 'framer-motion';
import { AlertTriangle, Percent, PiggyBank } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  type PotentialSavings as PotentialSavingsType,
} from '@/hooks/useBillReports';

interface PotentialSavingsProps {
  savings: PotentialSavingsType;
}

export function PotentialSavings({ savings }: PotentialSavingsProps) {
  const hasOverdue = savings.overdue_bills_count > 0;

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[1.75rem] border-border/70 bg-card/95 shadow-[0_20px_50px_rgba(2,6,23,0.2)]',
        hasOverdue ? 'border-warning-border/60' : 'border-success-border/60',
      )}
    >
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-[1.1rem] font-semibold tracking-tight">
          <PiggyBank className={cn('h-5 w-5', hasOverdue ? 'text-warning' : 'text-success')} />
          Economia Potencial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {hasOverdue ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.4rem] border border-warning-border/50 bg-warning-subtle/65 px-5 py-5 shadow-[0_16px_36px_rgba(2,6,23,0.12)]"
            >
              <p className="text-sm text-muted-foreground">Se você quitar tudo em dia, pode economizar</p>
              <p className="mt-2 text-[2rem] font-semibold leading-tight tracking-tight text-warning">
                {formatCurrency(savings.total_potential_savings)}
                <span className="ml-1 text-sm font-medium text-muted-foreground">/ mês</span>
              </p>
            </motion.div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.2rem] border border-border/60 bg-surface/60 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">Multas estimadas</span>
                </div>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(savings.estimated_fines)}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/60 bg-surface/60 px-4 py-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Percent className="h-4 w-4 text-danger" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">Juros estimados</span>
                </div>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(savings.estimated_interest)}
                </p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-danger-border/40 bg-danger-subtle/60 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-danger-border/40 bg-danger/10 font-semibold text-danger">
                    {savings.overdue_bills_count}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {savings.overdue_bills_count} conta{savings.overdue_bills_count > 1 ? 's' : ''} em atraso
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Priorize essa quitação para evitar novos encargos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.5rem] border border-success-border/50 bg-success-subtle/65 px-5 py-10 text-center shadow-[0_18px_40px_rgba(2,6,23,0.12)]"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-success-border/40 bg-success/10">
              <PiggyBank className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-success">Parabéns!</h3>
            <p className="mt-2 text-sm text-foreground">Você está em dia com todas as contas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue assim para evitar juros e multas nas próximas competências.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
