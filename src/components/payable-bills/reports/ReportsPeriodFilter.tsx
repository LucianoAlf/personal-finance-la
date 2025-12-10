import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PeriodPreset, PERIOD_LABELS } from '@/hooks/useBillReports';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ReportsPeriodFilterProps {
  periodPreset: PeriodPreset;
  onPeriodChange: (preset: PeriodPreset) => void;
  customDateRange: { start: Date; end: Date } | null;
  onCustomDateChange: (range: { start: Date; end: Date }) => void;
  periodLabel: string;
}

export function ReportsPeriodFilter({
  periodPreset,
  onPeriodChange,
  customDateRange,
  onCustomDateChange,
  periodLabel
}: ReportsPeriodFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange ? { from: customDateRange.start, to: customDateRange.end } : undefined
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onCustomDateChange({ start: range.from, end: range.to });
      setCalendarOpen(false);
    }
  };

  const presets: PeriodPreset[] = [
    'this_month',
    'last_month',
    'last_3_months',
    'last_6_months',
    'last_12_months',
    'this_year'
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Chips de período rápido */}
      <div className="flex flex-wrap gap-1">
        {presets.slice(0, 4).map((preset) => (
          <Button
            key={preset}
            variant={periodPreset === preset ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange(preset)}
            className="h-8 text-xs"
          >
            {PERIOD_LABELS[preset]}
          </Button>
        ))}
      </div>

      {/* Select para mais opções */}
      <Select
        value={presets.slice(4).includes(periodPreset) ? periodPreset : ''}
        onValueChange={(value) => onPeriodChange(value as PeriodPreset)}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="Mais períodos" />
        </SelectTrigger>
        <SelectContent>
          {presets.slice(4).map((preset) => (
            <SelectItem key={preset} value={preset}>
              {PERIOD_LABELS[preset]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Calendário personalizado */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={periodPreset === 'custom' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 justify-start text-left font-normal',
              periodPreset === 'custom' && 'bg-primary text-primary-foreground'
            )}
            onClick={() => {
              if (periodPreset !== 'custom') {
                onPeriodChange('custom');
              }
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {periodPreset === 'custom' && customDateRange ? (
              <span className="text-xs">
                {format(customDateRange.start, 'dd/MM')} - {format(customDateRange.end, 'dd/MM')}
              </span>
            ) : (
              <span className="text-xs">Personalizado</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Label do período selecionado */}
      <div className="ml-2 text-sm text-muted-foreground capitalize">
        {periodLabel}
      </div>
    </div>
  );
}
