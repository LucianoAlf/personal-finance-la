import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Repeat, TrendingUp, Layers } from 'lucide-react';
import { PAYABLE_BILLS_FILTER_SELECT_CONTENT_CLASS } from './filterSelectStyles';

export type RecurrenceTypeOption = 'all' | 'fixed' | 'variable';

interface RecurrenceTypeFilterProps {
  value: RecurrenceTypeOption;
  onChange: (value: RecurrenceTypeOption) => void;
}

const RECURRENCE_OPTIONS: { value: RecurrenceTypeOption; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'all', 
    label: 'Todos os tipos', 
    icon: <Layers className="h-4 w-4" />,
    description: 'Fixas e variáveis'
  },
  { 
    value: 'fixed', 
    label: 'Fixas', 
    icon: <Repeat className="h-4 w-4 text-blue-500" />,
    description: 'Valor sempre igual (aluguel, Netflix...)'
  },
  { 
    value: 'variable', 
    label: 'Variáveis', 
    icon: <TrendingUp className="h-4 w-4 text-orange-500" />,
    description: 'Valor muda (água, luz, gás)'
  },
];

export function RecurrenceTypeFilter({ value, onChange }: RecurrenceTypeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RecurrenceTypeOption)}>
      <SelectTrigger className="h-11 w-[188px] rounded-xl border-border/70 bg-surface/85 text-sm font-semibold shadow-none">
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      <SelectContent className={PAYABLE_BILLS_FILTER_SELECT_CONTENT_CLASS}>
        {RECURRENCE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <div>
                <span className="font-medium">{option.label}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
