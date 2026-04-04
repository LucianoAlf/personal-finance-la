import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BudgetSummaryCardsProps {
  totalPlanned: number;
  totalActual: number;
  totalDifference: number;
  month: string; // 'YYYY-MM'
}

function formatMonthYear(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function BudgetSummaryCards({ totalPlanned, totalActual, totalDifference, month }: BudgetSummaryCardsProps) {
  const execPct = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  const diffPositive = totalDifference >= 0;

  // Variants para stagger e transições visíveis
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
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {/* Total Planejado */}
      <motion.div variants={item}>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Planejado</p>
          <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalPlanned)}</h3>
          <p className="text-xs text-gray-500 mt-1">{formatMonthYear(month)}</p>
        </Card>
      </motion.div>

      {/* Total Gasto */}
      <motion.div variants={item}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Gasto</p>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalActual)}</h3>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden relative">
              {totalPlanned > 0 ? (
                <motion.div
                  key={`exec-bar-${month}-${totalActual}`}
                  className={`h-1.5 rounded-full ${execPct > 100 ? 'bg-red-600' : 'bg-red-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, execPct)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ) : (
                <motion.div
                  className="absolute inset-0 -translate-x-full"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                >
                  <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-red-300/60 to-transparent" />
                </motion.div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {execPct.toFixed(0)}% do planejado
              {execPct > 100 && <span className="text-red-600 font-semibold ml-1">(+{(execPct - 100).toFixed(0)}%)</span>}
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Diferença */}
      <motion.div variants={item}>
        <Card className={`p-6 ${diffPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Diferença</p>
            {diffPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </div>
          <h3 className={`text-2xl font-bold ${diffPositive ? 'text-green-600' : 'text-red-600'}`}>
            {diffPositive ? '' : '-'}{formatCurrency(Math.abs(totalDifference))}
          </h3>
          <p className="text-xs mt-1 text-gray-600">
            {diffPositive ? '✅ Dentro do orçamento' : '⚠️ Acima do planejado'}
          </p>
        </Card>
      </motion.div>
    </motion.div>
  );
}
