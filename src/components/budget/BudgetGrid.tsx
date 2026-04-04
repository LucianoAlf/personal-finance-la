import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BudgetItem } from '@/hooks/useBudgets';
import { BudgetCategoryCard } from './BudgetCategoryCard';

interface BudgetGridProps {
  budgets: BudgetItem[];
  loading: boolean;
  onEdit: (categoryId: string, amount: number) => Promise<void>;
  onDelete?: (categoryId: string) => Promise<void>;
  onAddCategory: () => void;
  month?: string;
}

function formatMonthYear(month?: string) {
  if (!month) return '';
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function BudgetGrid({ budgets, loading, onEdit, onDelete, onAddCategory, month }: BudgetGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-6 w-2/3 bg-gray-200 rounded mb-3" />
            <div className="h-2 w-full bg-gray-200 rounded mb-2" />
            <div className="h-2 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-1/3 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3 }}
        transition={{ duration: 0.35 }}
      >
        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum orçamento para {formatMonthYear(month)}</h3>
        <p className="text-gray-600 mb-6">Adicione categorias para começar a planejar seus gastos.</p>
        <Button onClick={onAddCategory}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Categoria
        </Button>
      </motion.div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.25, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  } as const;

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {budgets.map((b) => (
          <motion.div
            key={b.id}
            variants={itemVariants}
            layout
            layoutId={`budget-${b.id}`}
          >
            <BudgetCategoryCard budget={b} onEdit={onEdit} onDelete={onDelete} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Card Adicionar */}
      <motion.div variants={itemVariants} layout>
        <Card
          className="p-4 border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center"
          onClick={onAddCategory}
        >
          <div className="text-center">
            <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Adicionar Categoria</p>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
