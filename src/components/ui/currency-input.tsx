import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onValueChange?: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('');

    // Formatar número para moeda brasileira
    const formatCurrency = (num: number): string => {
      return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Converter string para número
    const parseValue = (str: string): number => {
      // Remove tudo exceto dígitos
      const digits = str.replace(/\D/g, '');
      // Converte para número dividindo por 100 (centavos)
      return digits ? parseInt(digits, 10) / 100 : 0;
    };

    // Atualizar display quando value prop mudar
    React.useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatCurrency(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numericValue = parseValue(inputValue);
      
      setDisplayValue(formatCurrency(numericValue));
      onValueChange?.(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Selecionar todo o texto ao focar
      e.target.select();
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          className={cn('pl-10', className)}
          placeholder="0,00"
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
