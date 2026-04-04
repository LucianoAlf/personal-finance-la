import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addYears, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthRangePickerProps {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function MonthRangePicker({ start, end, onChange, minDate, maxDate }: MonthRangePickerProps) {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempStart, setTempStart] = useState<Date | null>(null);

  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const handleMonthClick = (monthIndex: number) => {
    const selectedDate = new Date(viewYear, monthIndex, 1);

    // Verificar limites
    if (minDate && selectedDate < startOfMonth(minDate)) return;
    if (maxDate && selectedDate > startOfMonth(maxDate)) return;

    if (selectingStart) {
      // Selecionando início
      setTempStart(selectedDate);
      setSelectingStart(false);
    } else {
      // Selecionando fim
      if (tempStart && selectedDate < tempStart) {
        // Se fim < início, inverte
        onChange(startOfMonth(selectedDate), endOfMonth(tempStart));
      } else {
        onChange(startOfMonth(tempStart!), endOfMonth(selectedDate));
      }
      setTempStart(null);
      setSelectingStart(true);
    }
  };

  const isSelected = (monthIndex: number) => {
    const date = new Date(viewYear, monthIndex, 1);
    const dateTime = date.getTime();
    const startTime = startOfMonth(start).getTime();
    const endTime = startOfMonth(end).getTime();
    return dateTime >= startTime && dateTime <= endTime;
  };

  const isDisabled = (monthIndex: number) => {
    const date = new Date(viewYear, monthIndex, 1);
    if (minDate && date < startOfMonth(minDate)) return true;
    if (maxDate && date > startOfMonth(maxDate)) return true;
    return false;
  };

  const isTempStart = (monthIndex: number) => {
    if (!tempStart) return false;
    return tempStart.getMonth() === monthIndex && tempStart.getFullYear() === viewYear;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Navegação de ano */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewYear(viewYear - 1)}
          disabled={minDate && viewYear <= minDate.getFullYear()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-lg">{viewYear}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewYear(viewYear + 1)}
          disabled={maxDate && viewYear >= maxDate.getFullYear()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid de meses */}
      <div className="grid grid-cols-4 gap-2">
        {months.map((month, index) => {
          const selected = isSelected(index);
          const disabled = isDisabled(index);
          const tempStartMonth = isTempStart(index);

          return (
            <Button
              key={month}
              variant={selected ? 'default' : tempStartMonth ? 'secondary' : 'outline'}
              size="sm"
              disabled={disabled}
              onClick={() => handleMonthClick(index)}
              className={`
                ${selected ? 'bg-primary text-primary-foreground' : ''}
                ${tempStartMonth ? 'bg-blue-100 border-blue-400' : ''}
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}
              `}
            >
              {month}
            </Button>
          );
        })}
      </div>

      {/* Indicador de seleção */}
      <div className="text-sm text-center text-gray-600">
        {selectingStart ? (
          <span>Selecione o <strong>mês inicial</strong></span>
        ) : (
          <span>Selecione o <strong>mês final</strong></span>
        )}
      </div>

      {/* Período selecionado */}
      <div className="text-center pt-2 border-t">
        <span className="text-sm font-medium">
          {format(start, 'MMM yyyy', { locale: ptBR })} até {format(end, 'MMM yyyy', { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}
