import { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface HistoryDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type QuickFilter = '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom';

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: '7days', label: '7 dias' },
  { id: '30days', label: '30 dias' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'this_year', label: 'Este ano' },
];

export function HistoryDateFilter({ value, onChange }: HistoryDateFilterProps) {
  const [activeFilter, setActiveFilter] = useState<QuickFilter>('this_month');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleQuickFilter = (filter: QuickFilter) => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (filter) {
      case '7days':
        from = subDays(today, 7);
        to = today;
        break;
      case '30days':
        from = subDays(today, 30);
        to = today;
        break;
      case 'this_month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      case 'this_year':
        from = startOfYear(today);
        to = endOfYear(today);
        break;
      default:
        return;
    }

    setActiveFilter(filter);
    onChange({ from, to });
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (range) {
      setActiveFilter('custom');
      onChange(range);
    }
  };

  const handleClear = () => {
    setActiveFilter('this_month');
    const today = new Date();
    onChange({
      from: startOfMonth(today),
      to: endOfMonth(today),
    });
  };

  const formatDateRange = () => {
    if (!value.from) return 'Selecione um período';
    if (!value.to) return format(value.from, "dd 'de' MMM", { locale: ptBR });
    
    const sameMonth = value.from.getMonth() === value.to.getMonth();
    const sameYear = value.from.getFullYear() === value.to.getFullYear();
    
    if (sameMonth && sameYear) {
      return `${format(value.from, 'dd', { locale: ptBR })} - ${format(value.to, "dd 'de' MMM yyyy", { locale: ptBR })}`;
    }
    
    if (sameYear) {
      return `${format(value.from, "dd MMM", { locale: ptBR })} - ${format(value.to, "dd MMM yyyy", { locale: ptBR })}`;
    }
    
    return `${format(value.from, "dd MMM yyyy", { locale: ptBR })} - ${format(value.to, "dd MMM yyyy", { locale: ptBR })}`;
  };

  const getDaysCount = () => {
    if (!value.from || !value.to) return null;
    const diffTime = Math.abs(value.to.getTime() - value.from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="space-y-4">
      {/* Chips de Atalho */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => (
          <motion.button
            key={filter.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickFilter(filter.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-all",
              activeFilter === filter.id
                ? "border-primary/30 bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(139,92,246,0.22)]"
                : "border-border/70 bg-card/90 text-foreground hover:bg-surface"
            )}
          >
            {filter.label}
          </motion.button>
        ))}
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[280px] justify-start rounded-xl border-border/70 bg-surface/85 text-left font-medium shadow-none",
                !value.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.from}
              selected={value}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
            <div className="flex items-center justify-between p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={() => setCalendarOpen(false)}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Info do período */}
        {getDaysCount() && (
          <span className="text-sm text-muted-foreground">
            ({getDaysCount()} dias)
          </span>
        )}

        {/* Botão limpar */}
        {activeFilter === 'custom' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
