import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown } from 'lucide-react';

export type SortOption = 
  | 'recent' 
  | 'oldest' 
  | 'due_soon' 
  | 'due_late'
  | 'amount_high' 
  | 'amount_low'
  | 'overdue_first';

interface BillSortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: Record<SortOption, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigas',
  due_soon: 'Vencimento próximo',
  due_late: 'Vencimento distante',
  amount_high: 'Maior valor',
  amount_low: 'Menor valor',
  overdue_first: 'Atrasadas primeiro',
};

export function BillSortSelect({ value, onChange }: BillSortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[200px]">
        <ArrowUpDown className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Ordenar por" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SORT_OPTIONS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
