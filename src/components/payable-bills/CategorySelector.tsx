import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showAll?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  placeholder = 'Selecione uma categoria',
  showAll = true,
}: CategorySelectorProps) {
  const { categories } = useCategories();
  
  // Separar por tipo
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" style={{ color }} /> : null;
  };

  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* Opção Todas */}
        {showAll && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <span>Todas as categorias</span>
            </div>
          </SelectItem>
        )}

        {/* Seção Despesas */}
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-red-600 font-semibold">
            <span>💸</span> DESPESAS ({expenseCategories.length})
          </SelectLabel>
          {expenseCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <div className="flex items-center gap-2">
                {renderIcon(cat.icon, cat.color)}
                <span>{cat.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>

        {/* Seção Receitas */}
        <SelectGroup>
          <SelectLabel className="flex items-center gap-2 text-green-600 font-semibold">
            <span>💰</span> RECEITAS ({incomeCategories.length})
          </SelectLabel>
          {incomeCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <div className="flex items-center gap-2">
                {renderIcon(cat.icon, cat.color)}
                <span>{cat.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
