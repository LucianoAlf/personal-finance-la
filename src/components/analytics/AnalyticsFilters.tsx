import { Filter, Calendar, CreditCard } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreditCards } from '@/hooks/useCreditCards';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodOption = '1m' | '3m' | '6m' | '12m' | 'all';

interface AnalyticsFiltersProps {
  selectedCardId: string | null;
  selectedPeriod: PeriodOption;
  onCardChange: (cardId: string | null) => void;
  onPeriodChange: (period: PeriodOption) => void;
}

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: '1m', label: 'Último mês' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Último ano' },
  { value: 'all', label: 'Todo o período' },
];

export function AnalyticsFilters({
  selectedCardId,
  selectedPeriod,
  onCardChange,
  onPeriodChange,
}: AnalyticsFiltersProps) {
  const { cardsSummary } = useCreditCards();

  // Calcular datas baseado no período
  const getDateRange = (period: PeriodOption) => {
    const now = new Date();
    const end = endOfMonth(now);
    
    switch (period) {
      case '1m':
        return { start: startOfMonth(now), end };
      case '3m':
        return { start: startOfMonth(subMonths(now, 2)), end };
      case '6m':
        return { start: startOfMonth(subMonths(now, 5)), end };
      case '12m':
        return { start: startOfMonth(subMonths(now, 11)), end };
      case 'all':
      default:
        return { start: null, end };
    }
  };

  const dateRange = getDateRange(selectedPeriod);

  return (
    <div className="rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-[0_18px_42px_rgba(3,8,20,0.16)] backdrop-blur-xl dark:shadow-[0_20px_48px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-surface-elevated/75 text-muted-foreground shadow-sm">
            <Filter className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Filtros</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Filtro por Cartão */}
          <Select
            value={selectedCardId || 'all'}
            onValueChange={(value) => onCardChange(value === 'all' ? null : value)}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm hover:bg-surface-elevated focus:ring-1 focus:ring-primary/20 sm:w-[220px] dark:bg-surface-elevated/70">
              <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Todos os cartões" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {cardsSummary.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: card.color }}
                    />
                    {card.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Período */}
          <Select
            value={selectedPeriod}
            onValueChange={(value) => onPeriodChange(value as PeriodOption)}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm hover:bg-surface-elevated focus:ring-1 focus:ring-primary/20 sm:w-[220px] dark:bg-surface-elevated/70">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Indicador de período selecionado */}
      {dateRange.start && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">
            Exibindo dados de{' '}
            <span className="font-medium text-foreground">
              {format(dateRange.start, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            {' '}até{' '}
            <span className="font-medium text-foreground">
              {format(dateRange.end, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// Helper para calcular datas do período
export function getPeriodDates(period: PeriodOption): { start: Date | null; end: Date } {
  const now = new Date();
  const end = endOfMonth(now);
  
  switch (period) {
    case '1m':
      return { start: startOfMonth(now), end };
    case '3m':
      return { start: startOfMonth(subMonths(now, 2)), end };
    case '6m':
      return { start: startOfMonth(subMonths(now, 5)), end };
    case '12m':
      return { start: startOfMonth(subMonths(now, 11)), end };
    case 'all':
    default:
      return { start: null, end };
  }
}
