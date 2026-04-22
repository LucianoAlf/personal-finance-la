import { addMonths, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SpendingMonthSelectorProps {
  selectedMonth: Date;
  onChange: (next: Date) => void;
}

export function SpendingMonthSelector({ selectedMonth, onChange }: SpendingMonthSelectorProps) {
  return (
    <div className="lg:hidden mx-2 mt-3 flex items-center justify-between rounded-full border border-border/60 bg-surface-elevated/60 px-3 py-2">
      <button
        type="button"
        onClick={() => onChange(subMonths(selectedMonth, 1))}
        aria-label="Mês anterior"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="text-sm font-semibold text-foreground capitalize">
        {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
      </span>
      <button
        type="button"
        onClick={() => onChange(addMonths(selectedMonth, 1))}
        aria-label="Próximo mês"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-overlay hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
