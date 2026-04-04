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
import { 
  ArrowUpDown, 
  Calendar, 
  CalendarClock,
  TrendingUp, 
  TrendingDown, 
  Clock, 
  History,
  Hourglass,
  AlertTriangle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ReactNode } from 'react';

export type SortOption = 
  | 'recent' 
  | 'oldest' 
  | 'due_soon' 
  | 'due_late'
  | 'amount_high' 
  | 'amount_low'
  | 'overdue_first'
  // Filtros por status
  | 'only_pending'
  | 'only_overdue'
  | 'only_paid';

interface BillSortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

interface OptionConfig {
  key: SortOption;
  label: string;
  icon: ReactNode;
}

const SORT_OPTIONS: OptionConfig[] = [
  { key: 'due_soon', label: 'Vencimento próximo', icon: <Calendar className="h-4 w-4 text-blue-500" /> },
  { key: 'due_late', label: 'Vencimento distante', icon: <CalendarClock className="h-4 w-4 text-slate-500" /> },
  { key: 'amount_high', label: 'Maior valor', icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
  { key: 'amount_low', label: 'Menor valor', icon: <TrendingDown className="h-4 w-4 text-orange-500" /> },
  { key: 'recent', label: 'Mais recentes', icon: <Clock className="h-4 w-4 text-purple-500" /> },
  { key: 'oldest', label: 'Mais antigas', icon: <History className="h-4 w-4 text-gray-500" /> },
];

const STATUS_OPTIONS: OptionConfig[] = [
  { key: 'only_pending', label: 'Apenas pendentes', icon: <Hourglass className="h-4 w-4 text-yellow-500" /> },
  { key: 'only_overdue', label: 'Apenas vencidas', icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
  { key: 'only_paid', label: 'Apenas pagas', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  { key: 'overdue_first', label: 'Vencidas primeiro', icon: <AlertCircle className="h-4 w-4 text-orange-500" /> },
];

// Mapa para exibir o valor selecionado (texto simples)
const ALL_OPTIONS_LABELS: Record<SortOption, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigas',
  due_soon: 'Vencimento próximo',
  due_late: 'Vencimento distante',
  amount_high: 'Maior valor',
  amount_low: 'Menor valor',
  overdue_first: 'Vencidas primeiro',
  only_pending: 'Apenas pendentes',
  only_overdue: 'Apenas vencidas',
  only_paid: 'Apenas pagas',
};

export function BillSortSelect({ value, onChange }: BillSortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[200px]">
        <ArrowUpDown className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Ordenar/Filtrar">
          {ALL_OPTIONS_LABELS[value]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground">Ordenar por</SelectLabel>
          {SORT_OPTIONS.map(({ key, label, icon }) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                {icon}
                {label}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel className="text-xs text-muted-foreground">Filtrar por status</SelectLabel>
          {STATUS_OPTIONS.map(({ key, label, icon }) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                {icon}
                {label}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
