import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Repeat, TrendingUp, Layers } from 'lucide-react';

export type RecurrenceTypeFilter = 'all' | 'fixed' | 'variable' | 'subscription';

interface RecurrenceTypeFilterProps {
  value: RecurrenceTypeFilter;
  onChange: (value: RecurrenceTypeFilter) => void;
}

const RECURRENCE_OPTIONS: { value: RecurrenceTypeFilter; label: string; icon: React.ReactNode; description: string }[] = [
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
    description: 'Valor sempre igual'
  },
  { 
    value: 'variable', 
    label: 'Variáveis', 
    icon: <TrendingUp className="h-4 w-4 text-orange-500" />,
    description: 'Valor muda (água, luz, gás)'
  },
  { 
    value: 'subscription', 
    label: 'Assinaturas', 
    icon: <Repeat className="h-4 w-4 text-purple-500" />,
    description: 'Netflix, Spotify, etc.'
  },
];

export function RecurrenceTypeFilter({ value, onChange }: RecurrenceTypeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RecurrenceTypeFilter)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      <SelectContent>
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
