import { useState } from 'react';
import { Edit2, Eye, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import type { Category } from '@/types/categories';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { CategoryTransactionsDialog } from './CategoryTransactionsDialog';

interface CategoryCardProps {
  category: Category;
  stats: {
    transactionCount: number;
    totalAmount: number;
    payableBillsCount: number;
    financialGoalsCount: number;
    legacyBudgetsCount: number;
  };
  isDefault: boolean;
  onTransactionsChanged?: () => void | Promise<void>;
}

export function CategoryCard({ category, stats, isDefault, onTransactionsChanged }: CategoryCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);

  // Obter ícone dinamicamente
  const IconComponent = category.icon
    ? (LucideIcons as any)[category.icon]
    : LucideIcons.Tag;

  // Truncar keywords para exibição
  const keywordsDisplay = category.keywords && category.keywords.length > 0
    ? category.keywords.slice(0, 5).join(', ') + (category.keywords.length > 5 ? '...' : '')
    : 'Nenhuma palavra-chave';

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          {/* Ícone e Info */}
          <div className="flex items-start gap-4 flex-1">
            {/* Ícone */}
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <IconComponent
                className="h-6 w-6"
                style={{ color: category.color }}
              />
            </div>

            {/* Informações */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {category.name}
                </h3>
                <div
                  className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                  title={category.color}
                />
              </div>

              {/* Estatísticas */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <span>
                  {stats.transactionCount} {stats.transactionCount === 1 ? 'transação' : 'transações'}
                </span>
                <span>•</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(stats.totalAmount)}
                </span>
              </div>

              {/* Palavras-chave */}
              <div className="text-sm text-gray-500">
                <span className="font-medium">Palavras-chave:</span> {keywordsDisplay}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransactionsDialogOpen(true)}
              disabled={stats.transactionCount === 0}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </Button>
            {!isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        categoryType={category.type}
        editCategory={category}
      />

      <DeleteCategoryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        category={category}
        dependencies={{
          ledgerTransactionCount: stats.transactionCount,
          payableBillsCount: stats.payableBillsCount,
          financialGoalsCount: stats.financialGoalsCount,
          legacyBudgetsCount: stats.legacyBudgetsCount,
        }}
      />

      <CategoryTransactionsDialog
        open={transactionsDialogOpen}
        onOpenChange={setTransactionsDialogOpen}
        category={category}
        onRecategorizeSuccess={onTransactionsChanged}
      />
    </>
  );
}
