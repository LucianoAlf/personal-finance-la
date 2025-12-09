import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tv, 
  Lightbulb, 
  Home, 
  Smartphone, 
  Heart, 
  CreditCard,
  Package,
  Layers
} from 'lucide-react';
import { BillType } from '@/types/payable-bills.types';

export type CategoryFilter = BillType | 'all';

interface BillCategoryFilterProps {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todas as categorias', icon: <Layers className="h-4 w-4" /> },
  { value: 'subscription', label: 'Assinaturas', icon: <Tv className="h-4 w-4" /> },
  { value: 'service', label: 'Serviços (Água, Luz, Gás)', icon: <Lightbulb className="h-4 w-4" /> },
  { value: 'housing', label: 'Moradia', icon: <Home className="h-4 w-4" /> },
  { value: 'telecom', label: 'Telecomunicações', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'healthcare', label: 'Saúde', icon: <Heart className="h-4 w-4" /> },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'other', label: 'Outros', icon: <Package className="h-4 w-4" /> },
];

export function BillCategoryFilter({ value, onChange }: BillCategoryFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CategoryFilter)}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Categoria" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_OPTIONS.map((option) => (
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
