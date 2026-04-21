import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div
      data-testid="calendar-filters-sheet-root"
      aria-hidden={!open}
      className={cn(
        'fixed inset-0 z-[80] lg:hidden',
        !open && 'pointer-events-none',
      )}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar filtros"
        onClick={() => onOpenChange(false)}
        className={cn(
          'absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros da agenda"
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.35)]',
          'transition-transform duration-300 ease-out pb-[env(safe-area-inset-bottom)]',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">Filtros</span>
            <span className="text-xs text-muted-foreground">Escolha o que aparece na agenda</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <CalendarFilters
            enabledCategories={enabledCategories}
            onToggleCategory={onToggleCategory}
            advancedFilters={advancedFilters}
            onAdvancedFiltersChange={onAdvancedFiltersChange}
          />
        </div>
      </div>
    </div>
  );
}
