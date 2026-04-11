import { useMemo, useState, type CSSProperties, type ComponentType } from 'react';
import { Edit2, Eye, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/formatters';
import type { Category } from '@/types/categories';
import { CategoryTransactionsDialog } from './CategoryTransactionsDialog';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';

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

function formatTransactionLabel(count: number) {
  return `${count} ${count === 1 ? 'lançamento' : 'lançamentos'}`;
}

export function CategoryCard({
  category,
  stats,
  isDefault,
  onTransactionsChanged,
}: CategoryCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);

  const iconMap = LucideIcons as unknown as Record<
    string,
    ComponentType<{ className?: string; style?: CSSProperties }>
  >;

  const IconComponent =
    category.icon && iconMap[category.icon] ? iconMap[category.icon] : LucideIcons.Tag;

  const keywordsText = useMemo(() => {
    if (!category.keywords || category.keywords.length === 0) {
      return 'Palavras-chave: sem palavras-chave';
    }

    return `Palavras-chave: ${category.keywords.slice(0, 5).join(', ')}`;
  }, [category.keywords]);

  return (
    <>
      <article className="rounded-[24px] border border-border/70 bg-card/95 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-colors hover:bg-surface/55 dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border shadow-sm"
              style={{
                backgroundColor: `${category.color}18`,
                borderColor: `${category.color}35`,
              }}
            >
              <IconComponent className="h-6 w-6" style={{ color: category.color }} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {category.name}
                </h3>
                <span
                  className="h-6 w-6 shrink-0 rounded-md border border-border/70 shadow-sm"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                {isDefault ? (
                  <span className="inline-flex items-center rounded-full border border-border/70 bg-surface/75 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Padrão
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-sm font-medium text-foreground/90">
                {formatTransactionLabel(stats.transactionCount)} • {formatCurrency(stats.totalAmount)}
              </p>
              <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{keywordsText}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 lg:shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setTransactionsDialogOpen(true)}
              disabled={stats.transactionCount === 0}
            >
              <Eye className="h-4 w-4" />
              Ver
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit2 className="h-4 w-4" />
              Editar
            </Button>

            {!isDefault ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-danger/30 text-danger hover:bg-danger-subtle hover:text-danger"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : null}
          </div>
        </div>
      </article>

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
