// src/components/settings/MultipleDaysSelector.tsx
// Componente genérico para selecionar múltiplos valores de um array

import { Label } from '@/components/ui/label';

interface Option {
  value: number;
  label: string;
}

interface MultipleDaysSelectorProps {
  value: number[];
  onChange: (values: number[]) => void;
  options: Option[];
  label?: string;
  disabled?: boolean;
  variant?: 'default' | 'compact';
}

export function MultipleDaysSelector({
  value,
  onChange,
  options,
  label,
  disabled,
  variant = 'default',
}: MultipleDaysSelectorProps) {
  const handleToggle = (optionValue: number) => {
    if (disabled) return;
    
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue].sort((a, b) => b - a); // Ordem decrescente
    
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className={`flex flex-wrap gap-2 ${variant === 'compact' ? 'gap-1' : 'gap-2'}`}>
        {options.map((option) => {
          const isChecked = value.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              disabled={disabled}
              className={`
                ${variant === 'compact' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}
                rounded-md font-medium transition-all
                ${
                  isChecked
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
