import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/cn';

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
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    
    date.setHours(0, 0, 0, 0);
    
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    
    onChange?.(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const isDateDisabled = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    if (disableFuture && d > today) return true;
    if (disablePast && d < today) return true;
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;

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
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
