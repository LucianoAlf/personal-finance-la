import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number;
  onValueChange?: (value: number) => void;
  onBlur?: () => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value = 0, onValueChange, onBlur, ...props }, ref) => {
    
    // Formatar número para exibição (0,00)
    const formatForDisplay = (num: number): string => {
      if (num === 0) return '';
      return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Parsear string para número
    const parseToNumber = (str: string): number => {
      if (!str || str.trim() === '') return 0;
      // Remove tudo exceto dígitos e vírgula
      const cleaned = str.replace(/[^\d,]/g, '');
      // Substitui vírgula por ponto para parseFloat
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Estado para controlar se o usuário está editando ativamente
    const [isEditing, setIsEditing] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState<string>('');
    
    // Ref para armazenar o último valor do form
    const lastFormValue = React.useRef<number>(value || 0);

    // Sincronizar com value externo SOMENTE quando:
    // 1. Não está editando (usuário não está no campo)
    // 2. O valor do form realmente mudou (ex: ao abrir outro registro)
    React.useEffect(() => {
      const externalValue = value || 0;
      
      // Se não está editando, sempre sincroniza
      if (!isEditing) {
        setDisplayValue(formatForDisplay(externalValue));
        lastFormValue.current = externalValue;
      }
    }, [value, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Permitir apenas dígitos, vírgula e ponto
      let cleaned = inputValue.replace(/[^\d.,]/g, '');
      
      // Substituir ponto por vírgula (padrão brasileiro)
      cleaned = cleaned.replace(/\./g, ',');
      
      // Garantir apenas uma vírgula
      const parts = cleaned.split(',');
      if (parts.length > 2) {
        cleaned = parts[0] + ',' + parts.slice(1).join('');
      }
      
      // Limitar casas decimais a 2
      if (parts.length === 2 && parts[1].length > 2) {
        cleaned = parts[0] + ',' + parts[1].slice(0, 2);
      }

      setDisplayValue(cleaned);
      
      // Notificar valor numérico IMEDIATAMENTE
      const numericValue = parseToNumber(cleaned);
      onValueChange?.(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsEditing(true);
      // Selecionar todo o texto ao focar
      setTimeout(() => {
        e.target.select();
      }, 0);
    };

    const handleBlur = () => {
      // Formatar ao sair do campo
      const numericValue = parseToNumber(displayValue);
      
      if (numericValue > 0) {
        setDisplayValue(formatForDisplay(numericValue));
      } else {
        setDisplayValue('');
      }
      
      // Notificar o valor final ao form
      onValueChange?.(numericValue);
      
      // Marcar que não está mais editando DEPOIS de atualizar o display
      setIsEditing(false);
      
      onBlur?.();
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
          R$
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
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
