'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoryIcon,
  type MasterCategory,
  type CategoryType,
} from '@/constants/master-categories';

export interface CategorySelectProps {
  /** Tipo de categorias a exibir: 'expense', 'income' ou 'all' */
  type?: CategoryType | 'all';
  /** Permite seleção múltipla (para filtros) */
  multiSelect?: boolean;
  /** Valor selecionado (ID da categoria ou array de IDs) */
  value?: string | string[];
  /** Callback quando o valor muda */
  onChange?: (value: string | string[]) => void;
  /** Placeholder quando nada selecionado */
  placeholder?: string;
  /** Desabilitar o componente */
  disabled?: boolean;
  /** Classes CSS adicionais */
  className?: string;
}

export function CategorySelect({
  type = 'all',
  multiSelect = false,
  value,
  onChange,
  placeholder = 'Selecione uma categoria',
  disabled = false,
  className,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);

  // Normaliza o valor para array
  const selectedIds = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  // Filtra categorias por tipo
  const expenseCategories = useMemo(() => {
    if (type === 'income') return [];
    return EXPENSE_CATEGORIES;
  }, [type]);

  const incomeCategories = useMemo(() => {
    if (type === 'expense') return [];
    return INCOME_CATEGORIES;
  }, [type]);

  // Todas as categorias para busca
  const allCategories = useMemo(() => {
    return [...expenseCategories, ...incomeCategories];
  }, [expenseCategories, incomeCategories]);

  // Texto de exibição
  const displayText = useMemo(() => {
    if (selectedIds.length === 0) return placeholder;
    if (selectedIds.length === 1) {
      const cat = allCategories.find((c) => c.id === selectedIds[0]);
      return cat?.name || placeholder;
    }
    return `${selectedIds.length} categorias selecionadas`;
  }, [selectedIds, allCategories, placeholder]);

  // Handler de seleção
  const handleSelect = (categoryId: string) => {
    if (multiSelect) {
      const newValue = selectedIds.includes(categoryId)
        ? selectedIds.filter((id) => id !== categoryId)
        : [...selectedIds, categoryId];
      onChange?.(newValue);
    } else {
      onChange?.(categoryId);
      setOpen(false);
    }
  };

  // Limpar seleção
  const handleClear = () => {
    onChange?.(multiSelect ? [] : '');
  };

  // Renderiza uma categoria
  const renderCategory = (category: MasterCategory) => {
    const Icon = getCategoryIcon(category.icon);
    const isSelected = selectedIds.includes(category.id);

    return (
      <button
        key={category.id}
        type="button"
        onClick={() => handleSelect(category.id)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left',
          isSelected && 'bg-purple-50'
        )}
      >
        {/* Checkbox para multiSelect */}
        {multiSelect && (
          <div
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center',
              isSelected
                ? 'bg-purple-600 border-purple-600'
                : 'border-gray-300'
            )}
          >
            {isSelected && <Check size={12} className="text-white" />}
          </div>
        )}

        {/* Ícone da categoria */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${category.color}20` }}
        >
          {Icon && <Icon size={16} style={{ color: category.color }} />}
        </div>

        {/* Nome */}
        <span className="flex-1 text-sm text-gray-900">{category.name}</span>

        {/* Check para seleção única */}
        {!multiSelect && isSelected && (
          <Check size={16} className="text-purple-600" />
        )}
      </button>
    );
  };

  // Renderiza uma seção de categorias
  const renderSection = (
    title: string,
    emoji: string,
    categories: MasterCategory[],
    color: string
  ) => {
    if (categories.length === 0) return null;

    return (
      <div className="mb-2">
        {/* Header da seção */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-semibold',
            color
          )}
        >
          <span>{emoji}</span>
          <span>{title}</span>
          <span className="text-xs font-normal text-gray-500">
            ({categories.length})
          </span>
        </div>

        {/* Lista de categorias */}
        <div className="space-y-0.5">{categories.map(renderCategory)}</div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="max-h-[350px] overflow-y-auto p-2">
          {/* Seção de Despesas */}
          {renderSection(
            'DESPESAS',
            '💸',
            expenseCategories,
            'text-red-700'
          )}

          {/* Divisor */}
          {expenseCategories.length > 0 && incomeCategories.length > 0 && (
            <div className="my-2 border-t border-gray-200" />
          )}

          {/* Seção de Receitas */}
          {renderSection(
            'RECEITAS',
            '💰',
            incomeCategories,
            'text-green-700'
          )}
        </div>

        {/* Footer com ações */}
        {multiSelect && selectedIds.length > 0 && (
          <div className="border-t p-2 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {selectedIds.length} selecionada(s)
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
