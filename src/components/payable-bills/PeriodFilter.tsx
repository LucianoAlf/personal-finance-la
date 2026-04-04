import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, CalendarDays, Repeat, Hash, Pin } from 'lucide-react';

export type PeriodOption = 'all' | 'next_7_days' | 'this_month' | 'recurring' | 'installments' | 'one_time';

interface PeriodFilterProps {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
}

// Mapeamento para exibir o label selecionado
const OPTION_LABELS: Record<PeriodOption, { label: string; icon: React.ReactNode }> = {
  all: { label: 'Todos os meses', icon: <CalendarDays className="h-4 w-4" /> },
  next_7_days: { label: 'Próximos 7 dias', icon: <Clock className="h-4 w-4 text-blue-500" /> },
  this_month: { label: 'Mês selecionado', icon: <Calendar className="h-4 w-4 text-green-500" /> },
  recurring: { label: 'Recorrentes', icon: <Repeat className="h-4 w-4 text-purple-500" /> },
  installments: { label: 'Parceladas', icon: <Hash className="h-4 w-4 text-orange-500" /> },
  one_time: { label: 'Avulsas', icon: <Pin className="h-4 w-4 text-slate-500" /> },
};

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const selectedOption = OPTION_LABELS[value];
  
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodOption)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            {selectedOption.icon}
            <span>{selectedOption.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Todas */}
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>Todos os meses</span>
          </div>
        </SelectItem>
        
        <SelectSeparator />
        
        {/* Por Período */}
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground font-semibold">
            Por Período
          </SelectLabel>
          <SelectItem value="next_7_days">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Próximos 7 dias</span>
            </div>
          </SelectItem>
          <SelectItem value="this_month">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span>Mês selecionado</span>
            </div>
          </SelectItem>
        </SelectGroup>
        
        <SelectSeparator />
        
        {/* Por Tipo */}
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground font-semibold">
            Por Tipo
          </SelectLabel>
          <SelectItem value="recurring">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-purple-500" />
              <span>Recorrentes</span>
            </div>
          </SelectItem>
          <SelectItem value="installments">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-orange-500" />
              <span>Parceladas</span>
            </div>
          </SelectItem>
          <SelectItem value="one_time">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-slate-500" />
              <span>Avulsas</span>
            </div>
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
