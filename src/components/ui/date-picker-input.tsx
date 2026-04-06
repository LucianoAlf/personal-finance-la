import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';
import { formatDateOnly, parseDateOnly } from '@/utils/formatters';

interface DatePickerInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  disableFuture?: boolean;
  disablePast?: boolean;
  minDate?: Date;
  maxDate?: Date;
  enableMonthYearNavigation?: boolean;
  fromYear?: number;
  toYear?: number;
}

export function DatePickerInput({
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Selecione uma data',
  disableFuture = false,
  disablePast = false,
  minDate,
  maxDate,
  enableMonthYearNavigation = false,
  fromYear,
  toYear,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = value ? parseDateOnly(value) : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;

    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);
    onChange?.(formatDateOnly(safeDate));
    setOpen(false);
  };

  const isDateDisabled = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const min = minDate ? new Date(minDate) : undefined;
    const max = maxDate ? new Date(maxDate) : undefined;

    min?.setHours(0, 0, 0, 0);
    max?.setHours(0, 0, 0, 0);

    if (disableFuture && d > today) return true;
    if (disablePast && d < today) return true;
    if (min && d < min) return true;
    if (max && d > max) return true;

    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'P', { locale: ptBR }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          captionLayout={enableMonthYearNavigation ? 'dropdown-buttons' : undefined}
          fromYear={fromYear}
          toYear={toYear}
          defaultMonth={selectedDate ?? minDate ?? maxDate ?? today}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
