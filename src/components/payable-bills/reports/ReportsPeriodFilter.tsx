import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PERIOD_LABELS, type PeriodPreset } from '@/hooks/useBillReports';

interface ReportsPeriodFilterProps {
  periodPreset: PeriodPreset;
  onPeriodChange: (preset: PeriodPreset) => void;
  customDateRange: { start: Date; end: Date } | null;
  onCustomDateChange: (range: { start: Date; end: Date }) => void;
  periodLabel: string;
}

const QUICK_PRESETS: PeriodPreset[] = [
  'this_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'last_12_months',
  'this_year',
];

export function ReportsPeriodFilter({
  periodPreset,
  onPeriodChange,
  customDateRange,
  onCustomDateChange,
  periodLabel,
}: ReportsPeriodFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    customDateRange ? { from: customDateRange.start, to: customDateRange.end } : undefined,
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onCustomDateChange({ start: range.from, end: range.to });
      setCalendarOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-2">
        {QUICK_PRESETS.slice(0, 4).map((preset) => {
          const active = periodPreset === preset;
          return (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onPeriodChange(preset)}
              className={cn(
                'h-10 rounded-xl border-border/70 px-4 text-sm font-semibold shadow-sm transition-all',
                active
                  ? 'border-primary/25 bg-primary/12 text-primary hover:bg-primary/14'
                  : 'bg-background/55 text-foreground hover:bg-surface-elevated',
              )}
            >
              {PERIOD_LABELS[preset]}
            </Button>
          );
        })}

        <Select
          value={QUICK_PRESETS.slice(4).includes(periodPreset) ? periodPreset : ''}
          onValueChange={(value) => onPeriodChange(value as PeriodPreset)}
        >
          <SelectTrigger className="h-10 w-[168px] rounded-xl border-border/70 bg-background/55 text-sm font-semibold shadow-none">
            <SelectValue placeholder="Mais períodos" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/70 bg-background/98 shadow-[0_24px_70px_rgba(2,6,23,0.32)]">
            {QUICK_PRESETS.slice(4).map((preset) => (
              <SelectItem key={preset} value={preset}>
                {PERIOD_LABELS[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                'h-10 rounded-xl border-border/70 px-4 text-sm font-semibold shadow-sm transition-all hover:bg-surface-elevated',
                periodPreset === 'custom'
                  ? 'border-primary/25 bg-primary/12 text-primary'
                  : 'bg-background/55 text-foreground',
              )}
              onClick={() => {
                if (periodPreset !== 'custom') onPeriodChange('custom');
              }}
            >
              <CalendarIcon className="h-4 w-4" />
              {periodPreset === 'custom' && customDateRange
                ? `${format(customDateRange.start, 'dd/MM')} - ${format(customDateRange.end, 'dd/MM')}`
                : 'Personalizado'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto rounded-[1.4rem] border-border/70 bg-background/98 p-0 shadow-[0_24px_70px_rgba(2,6,23,0.3)]"
          >
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
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
        <CalendarIcon className="h-4 w-4" />
        <span className="capitalize">{periodLabel}</span>
      </div>
    </div>
  );
}
