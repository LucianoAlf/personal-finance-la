'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import * as LucideIcons from 'lucide-react';

interface CategoryMultiSelectProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function CategoryMultiSelect({
  selectedIds,
  onSelectionChange,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { categories } = useCategories();

  // Separar categorias por tipo
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  const toggleCategory = (categoryId: string) => {
    const isSelected = selectedIds.includes(categoryId);
    if (isSelected) {
      onSelectionChange(selectedIds.filter(id => id !== categoryId));
    } else {
      onSelectionChange([...selectedIds, categoryId]);
    }
  };

  const renderCategoryIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={16} style={{ color }} />;
  };

  const selectedCount = selectedIds.length;
  const displayText = selectedCount === 0 
    ? 'Todas as categorias' 
    : selectedCount === 1 
    ? categories.find(c => c.id === selectedIds[0])?.name || '1 selecionada'
    : `${selectedCount} selecionadas`;

  // Renderiza uma categoria individual
  const renderCategory = (category: typeof categories[0]) => {
    const isSelected = selectedIds.includes(category.id);
    
    return (
      <button
        key={category.id}
        type="button"
        onClick={() => toggleCategory(category.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left",
          isSelected && "bg-purple-50"
        )}
      >
        {/* Checkbox */}
        <div
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
            isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300"
          )}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </div>

        {/* Ícone da categoria */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${category.color}20` }}
        >
          {renderCategoryIcon(category.icon, category.color)}
        </div>
        
        {/* Nome */}
        <span className="flex-1 text-sm text-gray-900">{category.name}</span>
      </button>
    );
  };

  // Limpar seleção
  const handleClear = () => {
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          <span className={cn(selectedCount === 0 && "text-gray-500")}>
            {displayText}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <div className="max-h-[350px] overflow-y-auto p-2">
          {/* Seção de Despesas */}
          {expenseCategories.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-700">
                <span>💸</span>
                <span>DESPESAS</span>
                <span className="text-xs font-normal text-gray-500">
                  ({expenseCategories.length})
                </span>
              </div>
              <div className="space-y-0.5">
                {expenseCategories.map(renderCategory)}
              </div>
            </div>
          )}

          {/* Divisor */}
          {expenseCategories.length > 0 && incomeCategories.length > 0 && (
            <div className="my-2 border-t border-gray-200" />
          )}

          {/* Seção de Receitas */}
          {incomeCategories.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-green-700">
                <span>💰</span>
                <span>RECEITAS</span>
                <span className="text-xs font-normal text-gray-500">
                  ({incomeCategories.length})
                </span>
              </div>
              <div className="space-y-0.5">
                {incomeCategories.map(renderCategory)}
              </div>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        {selectedCount > 0 && (
          <div className="border-t p-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {selectedCount} selecionada(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs h-7"
            >
              Limpar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
