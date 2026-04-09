import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BudgetItem } from '@/hooks/useBudgets';
import { formatCurrency } from '@/utils/formatters';

interface BudgetInsightsProps {
  budgets: BudgetItem[];
  totalDifference: number;
  month: string;
}

function formatMonthYear(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function InsightCard({
  icon: Icon,
  title,
  description,
  tone,
  children,
}: {
  icon: typeof CheckCircle2;
  title: string;
  description?: string;
  tone: 'success' | 'warning' | 'danger';
  children?: React.ReactNode;
}) {
  const toneClasses = {
    success: 'border-success-border/70 bg-success-subtle/60 text-success',
    warning: 'border-warning-border/70 bg-warning-subtle/60 text-warning',
    danger: 'border-danger-border/70 bg-danger-subtle/60 text-danger',
  } as const;

  return (
    <Card className={`rounded-[1.6rem] border p-5 shadow-[0_18px_36px_rgba(8,15,32,0.12)] ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-background/45">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <div className="font-semibold">{title}</div>
          {description ? <div className="text-sm text-foreground/75">{description}</div> : null}
          {children}
        </div>
      </div>
    </Card>
  );
}

export function BudgetInsights({ budgets, totalDifference, month }: BudgetInsightsProps) {
  const exceeded = budgets.filter((b) => b.status === 'exceeded');
  const warning = budgets.filter((b) => b.status === 'warning');

  if (exceeded.length === 0 && warning.length === 0 && totalDifference >= 0) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`ok-${month}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          <InsightCard
            icon={CheckCircle2}
            title="Parabéns!"
            description={`Você está dentro do planejado em todas as categorias de ${formatMonthYear(month)}.`}
            tone="success"
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`warn-${month}`}
        className="space-y-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
      >
        {totalDifference < 0 ? (
          <InsightCard
            icon={AlertTriangle}
            title="Planejamento ultrapassado"
            description={`Você gastou ${formatCurrency(Math.abs(totalDifference))} a mais que o limite planejado em ${formatMonthYear(month)}.`}
            tone="danger"
          />
        ) : null}

        {exceeded.length > 0 ? (
          <InsightCard icon={AlertTriangle} title="Categorias acima do limite" tone="danger">
            <ul className="mt-2 space-y-1.5 text-sm text-foreground/75">
              {exceeded.map((b) => (
                <li key={b.id}>
                  {b.category_name}: {formatCurrency(b.actual_amount)} / {formatCurrency(b.planned_amount)} ({Math.round(b.percentage)}%)
                </li>
              ))}
            </ul>
          </InsightCard>
        ) : null}

        {warning.length > 0 ? (
          <InsightCard
            icon={AlertCircle}
            title="Atenção"
            description={`${warning.length} ${warning.length === 1 ? 'categoria está' : 'categorias estão'} próximas do limite (>80%).`}
            tone="warning"
          />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
