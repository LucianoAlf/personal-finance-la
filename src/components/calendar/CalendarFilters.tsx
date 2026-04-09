import { Check, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import {
  AGENDA_FILTER_CATEGORIES,
  CATEGORY_STYLES,
  type AgendaFilterCategory,
} from './calendar-utils';

const FILTER_CATEGORY_LABELS: Record<AgendaFilterCategory, string> = {
  personal: 'Pessoal',
  work: 'Trabalho',
  mentoring: 'Mentoria',
  financial: 'Financeiro',
  external: 'Externo',
};

export interface CalendarFiltersProps {
  enabledCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  advancedFilters: AdvancedAgendaFilters;
  onAdvancedFiltersChange: (filters: AdvancedAgendaFilters) => void;
  className?: string;
}

export interface AdvancedAgendaFilters {
  source: 'all' | 'internal' | 'external';
  interactivity: 'all' | 'editable' | 'readonly';
  actionableOnly: boolean;
}

const SOURCE_OPTIONS: Array<{ value: AdvancedAgendaFilters['source']; label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'internal', label: 'So do app' },
  { value: 'external', label: 'Apenas externos' },
];

const INTERACTIVITY_OPTIONS: Array<{ value: AdvancedAgendaFilters['interactivity']; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'editable', label: 'Editaveis' },
  { value: 'readonly', label: 'Somente leitura' },
];

function countActiveAdvancedFilters(filters: AdvancedAgendaFilters) {
  let count = 0;
  if (filters.source !== 'all') count++;
  if (filters.interactivity !== 'all') count++;
  if (filters.actionableOnly) count++;
  return count;
}

export function CalendarFilters({
  enabledCategories,
  onToggleCategory,
  advancedFilters,
  onAdvancedFiltersChange,
  className,
}: CalendarFiltersProps) {
  const activeAdvancedFilters = countActiveAdvancedFilters(advancedFilters);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm',
        className,
      )}
      data-testid="calendar-category-filters"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categorias
          </span>
          {AGENDA_FILTER_CATEGORIES.map((cat) => {
            const style = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.personal;
            const rowLabel = FILTER_CATEGORY_LABELS[cat];
            const checked = enabledCategories.has(cat);

            return (
              <Button
                key={cat}
                type="button"
                variant={checked ? 'secondary' : 'outline'}
                aria-pressed={checked}
                onClick={() => onToggleCategory(cat)}
                className={cn(
                  'h-8 rounded-full px-3 text-xs shadow-none transition-all',
                  checked
                    ? 'border-transparent bg-surface-elevated text-foreground'
                    : 'border-border/60 bg-transparent text-muted-foreground hover:bg-surface-elevated/70 hover:text-foreground',
                )}
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: style.color }}
                  aria-hidden
                />
                <span>{rowLabel}</span>
              </Button>
            );
          })}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-border/60 bg-surface text-foreground hover:bg-surface-elevated"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Mais filtros</span>
              {activeAdvancedFilters > 0 ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {activeAdvancedFilters}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="z-[80] w-[22rem] rounded-2xl border-border/60 bg-surface p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Origem
                </p>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={advancedFilters.source === option.value ? 'secondary' : 'outline'}
                      onClick={() =>
                        onAdvancedFiltersChange({ ...advancedFilters, source: option.value })
                      }
                      className="h-8 rounded-full px-3 text-xs shadow-none"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Interacao
                </p>
                <div className="flex flex-wrap gap-2">
                  {INTERACTIVITY_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={advancedFilters.interactivity === option.value ? 'secondary' : 'outline'}
                      onClick={() =>
                        onAdvancedFiltersChange({ ...advancedFilters, interactivity: option.value })
                      }
                      className="h-8 rounded-full px-3 text-xs shadow-none"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Capacidades
                </p>
                <Button
                  type="button"
                  variant={advancedFilters.actionableOnly ? 'secondary' : 'outline'}
                  onClick={() =>
                    onAdvancedFiltersChange({
                      ...advancedFilters,
                      actionableOnly: !advancedFilters.actionableOnly,
                    })
                  }
                  className="h-9 w-full justify-start rounded-xl px-3 text-sm shadow-none"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 transition-opacity',
                      advancedFilters.actionableOnly ? 'opacity-100' : 'opacity-25',
                    )}
                  />
                  Apenas itens com acao
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
