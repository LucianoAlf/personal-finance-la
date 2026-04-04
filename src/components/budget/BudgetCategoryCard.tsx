import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, AlertCircle, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BudgetItem } from '@/hooks/useBudgets';
import { formatCurrency } from '@/utils/formatters';

interface BudgetCategoryCardProps {
  budget: BudgetItem;
  onEdit: (categoryId: string, newAmount: number) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
}

export function BudgetCategoryCard({ budget, onEdit, onDelete }: BudgetCategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(String(budget.planned_amount));

  const pct = Math.round(budget.percentage || 0);
  const pctCapped = Math.min(100, pct); // Para a barra visual
  const status = budget.status;
  const StatusIcon = status === 'exceeded' ? AlertTriangle : status === 'warning' ? AlertCircle : CheckCircle2;
  const statusColor = status === 'exceeded' ? 'text-red-600' : status === 'warning' ? 'text-yellow-600' : 'text-green-600';
  const barColor = status === 'exceeded' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold text-gray-900">{budget.category_name}</div>
            <div className={`text-xs ${statusColor} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {status === 'exceeded' ? 'Limite ultrapassado' : status === 'warning' ? 'Atenção' : 'Dentro do limite'}
            </div>
          </div>
          <div className={`text-sm font-semibold ${statusColor}`}>{pct}%</div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            key={`progress-${budget.id}-${pct}`}
            className={`h-2 rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${pctCapped}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <div className="mt-2 text-sm text-gray-700 flex items-center justify-between">
          <span>{formatCurrency(budget.actual_amount)} / {formatCurrency(budget.planned_amount)}</span>
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div 
                key="editing"
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <Input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 w-28 text-right"
                />
                <Button size="sm" onClick={async () => { await onEdit(budget.category_id, Number(editValue)); setIsEditing(false); }}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditValue(String(budget.planned_amount)); }}>
                  Cancelar
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="view"
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                {onDelete && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete?.(budget.category_id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {budget.notes && (
          <motion.p 
            className="text-xs text-gray-500 mt-2 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {budget.notes}
          </motion.p>
        )}
      </Card>
  );
}
