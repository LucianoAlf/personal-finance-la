import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { PeriodFilter, type PeriodOption } from '@/components/payable-bills/PeriodFilter';
import { BillCategoryFilter, type CategoryFilter } from '@/components/payable-bills/BillCategoryFilter';
import { RecurrenceTypeFilter, type RecurrenceTypeOption } from '@/components/payable-bills/RecurrenceTypeFilter';
import { BillSortSelect, type SortOption } from '@/components/payable-bills/BillSortSelect';
import type { Category } from '@/types/categories';

interface BillFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodFilter: PeriodOption;
  onPeriodChange: (value: PeriodOption) => void;
  categoryFilter: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  categories: Category[];
  recurrenceTypeFilter: RecurrenceTypeOption;
  onRecurrenceTypeChange: (value: RecurrenceTypeOption) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function BillFiltersSheet({
  open,
  onOpenChange,
  periodFilter,
  onPeriodChange,
  categoryFilter,
  onCategoryChange,
  categories,
  recurrenceTypeFilter,
  onRecurrenceTypeChange,
  sortOption,
  onSortChange,
}: BillFiltersSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader
        title="Filtros"
        description="Refine sua lista de contas"
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</div>
            <PeriodFilter value={periodFilter} onChange={onPeriodChange} />
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</div>
            <BillCategoryFilter
              categories={categories}
              value={categoryFilter}
              onChange={onCategoryChange}
            />
          </div>
          {periodFilter === 'recurring' && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recorrência</div>
              <RecurrenceTypeFilter value={recurrenceTypeFilter} onChange={onRecurrenceTypeChange} />
            </div>
          )}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordenar por</div>
            <BillSortSelect value={sortOption} onChange={onSortChange} />
          </div>
        </div>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button onClick={() => onOpenChange(false)} className="w-full md:w-auto">
          Aplicar
        </Button>
      </ResponsiveDialogFooter>
    </ResponsiveDialog>
  );
}
