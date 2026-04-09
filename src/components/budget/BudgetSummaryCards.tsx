import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { AlertTriangle, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface BudgetSummaryCardsProps {
  totalPlanned: number;
  totalActual: number;
  totalDifference: number;
  month: string;
}

function formatMonthYear(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function BudgetSummaryCards({
  totalPlanned,
  totalActual,
  totalDifference,
  month,
}: BudgetSummaryCardsProps) {
  const execPct = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  const diffPositive = totalDifference >= 0;

  const container = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.12, delayChildren: 0.05 },
    },
  } as const;

  const item = {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
  } as const;

  return (
    <motion.div
      key={month}
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={item}>
        <Card className="rounded-[1.6rem] border-border/70 bg-surface/92 p-5 shadow-[0_18px_36px_rgba(8,15,32,0.12)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total dos Limites</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatMonthYear(month)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[1.6rem] font-semibold tracking-tight text-foreground">
              {formatCurrency(totalPlanned)}
            </h3>
            <div className="rounded-2xl border border-border/60 bg-surface-elevated/60 px-4 py-3 text-sm text-muted-foreground">
              Limites planejados para sustentar o mês com mais previsibilidade por categoria.
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="rounded-[1.6rem] border-border/70 bg-surface/92 p-5 shadow-[0_18px_36px_rgba(8,15,32,0.12)]">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Gasto</p>
              <p className="mt-1 text-xs text-muted-foreground">Uso consolidado do período</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-subtle text-danger">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[1.6rem] font-semibold tracking-tight text-danger">
              {formatCurrency(totalActual)}
            </h3>
            <div className="rounded-2xl border border-border/60 bg-surface-elevated/60 px-4 py-4">
              <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-overlay">
                {totalPlanned > 0 ? (
                  <motion.div
                    key={`exec-bar-${month}-${totalActual}`}
                    className={`h-2 rounded-full ${execPct > 100 ? 'bg-danger' : 'bg-warning'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, execPct)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                ) : (
                  <motion.div
                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-warning/40 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{execPct.toFixed(0)}% dos limites</span>
                {execPct > 100 ? (
                  <span className="font-semibold text-danger">
                    +{(execPct - 100).toFixed(0)}%
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card
          className={`rounded-[1.6rem] p-5 shadow-[0_18px_36px_rgba(8,15,32,0.12)] ${
            diffPositive
              ? 'border-success-border/70 bg-success-subtle/60'
              : 'border-danger-border/70 bg-danger-subtle/55'
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Diferença</p>
              <p className="mt-1 text-xs text-muted-foreground">Leitura rápida do mês</p>
            </div>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                diffPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
              }`}
            >
              {diffPositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3
              className={`text-[1.6rem] font-semibold tracking-tight ${
                diffPositive ? 'text-success' : 'text-danger'
              }`}
            >
              {diffPositive ? '' : '-'}
              {formatCurrency(Math.abs(totalDifference))}
            </h3>
            <div className="rounded-2xl border border-current/10 bg-background/40 px-4 py-3 text-sm">
              {diffPositive ? (
                <span className="text-success">Dentro do planejado</span>
              ) : (
                <span className="text-danger">Acima dos limites</span>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
