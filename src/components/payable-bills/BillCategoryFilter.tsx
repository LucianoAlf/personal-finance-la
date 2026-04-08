/**
 * BillCategoryFilter - Filtro de categorias para Contas a Pagar
 * 
 * Usa o banco de dados como fonte única de verdade via useCategories()
 * Atualizado em: 16/12/2025 - Corrigido para usar banco de dados
 */

import type { Category } from '@/types/categories';
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

export type CategoryFilter = string | 'all';

interface BillCategoryFilterProps {
  categories: Category[];
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

export function BillCategoryFilter({ categories, value, onChange }: BillCategoryFilterProps) {
  // Separar por tipo
  const expenseCategories = categories.filter(cat => cat.type === 'expense');
  const incomeCategories = categories.filter(cat => cat.type === 'income');

  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" style={{ color }} /> : null;
  };

  return (
    <Select value={value} onValueChange={(v) => onChange(v as CategoryFilter)}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Categoria" />
      </SelectTrigger>
      <SelectContent>
        {/* Opção Todas */}
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <span>Todas as categorias</span>
          </div>
        </SelectItem>

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
