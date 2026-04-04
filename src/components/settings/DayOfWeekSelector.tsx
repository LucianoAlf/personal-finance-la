// src/components/settings/DayOfWeekSelector.tsx
// Componente para selecionar múltiplos dias da semana

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DayOfWeekSelectorProps {
  value: number[];
  onChange: (days: number[]) => void;
  label?: string;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

export function DayOfWeekSelector({ value, onChange, label, disabled }: DayOfWeekSelectorProps) {
  const handleToggle = (dayValue: number) => {
    if (disabled) return;
    
    const newValue = value.includes(dayValue)
      ? value.filter((d) => d !== dayValue)
      : [...value, dayValue].sort((a, b) => a - b);
    
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map((day) => {
          const isChecked = value.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => handleToggle(day.value)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-md text-sm font-medium transition-all
                ${
                  isChecked
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={day.fullLabel}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
