import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
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
          <Card className="border border-green-200 bg-green-50 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-semibold text-green-800">Parabéns!</div>
              <div className="text-sm text-green-700">
                Você está dentro do orçamento em todas as categorias de {formatMonthYear(month)}.
              </div>
            </div>
          </Card>
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
      {totalDifference < 0 && (
        <Card className="border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">Orçamento ultrapassado</div>
            <div className="text-sm text-red-700">
              Você gastou {formatCurrency(Math.abs(totalDifference))} a mais que o planejado em {formatMonthYear(month)}.
            </div>
          </div>
        </Card>
      )}

      {exceeded.length > 0 && (
        <Card className="border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <div className="font-semibold text-red-800">Categorias acima do limite</div>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-red-700">
                {exceeded.map((b) => (
                  <li key={b.id}>
                    {b.category_name}: {formatCurrency(b.actual_amount)} / {formatCurrency(b.planned_amount)} ({Math.round(b.percentage)}%)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {warning.length > 0 && (
        <Card className="border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <div className="font-semibold text-yellow-800">Atenção</div>
            <div className="text-sm text-yellow-700">
              {warning.length} {warning.length === 1 ? 'categoria está' : 'categorias estão'} próximas do limite (&gt;80%).
            </div>
          </div>
        </Card>
      )}
      </motion.div>
    </AnimatePresence>
  );
}
