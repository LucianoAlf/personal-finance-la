import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, AlertTriangle, CalendarDays, Repeat } from 'lucide-react';

export type PeriodOption = 'all' | 'next_7_days' | 'this_month' | 'overdue' | 'recurring';

interface PeriodFilterProps {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
}

const PERIOD_OPTIONS: { value: PeriodOption; label: string; icon: React.ReactNode }[] = [
  { 
    value: 'all', 
    label: 'Todas as contas', 
    icon: <CalendarDays className="h-4 w-4" />
  },
  { 
    value: 'next_7_days', 
    label: 'Próximos 7 dias', 
    icon: <Clock className="h-4 w-4 text-blue-500" />
  },
  { 
    value: 'this_month', 
    label: 'Este mês', 
    icon: <Calendar className="h-4 w-4 text-green-500" />
  },
  { 
    value: 'overdue', 
    label: 'Vencidas', 
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />
  },
  { 
    value: 'recurring', 
    label: 'Recorrentes', 
    icon: <Repeat className="h-4 w-4 text-purple-500" />
  },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodOption)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Período" />
      </SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
