import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
import { CalendarFilters, type AdvancedAgendaFilters } from './CalendarFilters';

interface CalendarFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  advancedFilters: AdvancedAgendaFilters;
  onAdvancedFiltersChange: (filters: AdvancedAgendaFilters) => void;
}

export function CalendarFiltersSheet({
  open,
  onOpenChange,
  enabledCategories,
  onToggleCategory,
  advancedFilters,
  onAdvancedFiltersChange,
}: CalendarFiltersSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader title="Filtros" onClose={() => onOpenChange(false)} />
      <ResponsiveDialogBody>
        <CalendarFilters
          enabledCategories={enabledCategories}
          onToggleCategory={onToggleCategory}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={onAdvancedFiltersChange}
        />
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
