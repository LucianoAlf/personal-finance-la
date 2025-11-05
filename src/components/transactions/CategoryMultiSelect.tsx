import { useState } from 'react';
import { Check } from 'lucide-react';
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

  // Agrupar categorias por pai
  const parentCategories = categories.filter(c => !c.parent_id);
  const childCategories = categories.filter(c => c.parent_id);

  const toggleCategory = (categoryId: string, hasChildren: boolean) => {
    const isSelected = selectedIds.includes(categoryId);
    
    if (hasChildren) {
      // Se é categoria pai, seleciona/deseleciona todas as filhas
      const children = childCategories.filter(c => c.parent_id === categoryId);
      const childIds = children.map(c => c.id);
      
      if (isSelected) {
        // Remove pai e todas as filhas
        onSelectionChange(
          selectedIds.filter(id => id !== categoryId && !childIds.includes(id))
        );
      } else {
        // Adiciona pai e todas as filhas
        onSelectionChange([...selectedIds, categoryId, ...childIds]);
      }
    } else {
      // Categoria filha ou sem filhas
      if (isSelected) {
        onSelectionChange(selectedIds.filter(id => id !== categoryId));
      } else {
        onSelectionChange([...selectedIds, categoryId]);
      }
    }
  };

  const renderCategoryIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={20} style={{ color }} />;
  };

  const selectedCount = selectedIds.length;
  const displayText = selectedCount === 0 
    ? 'Todas as categorias' 
    : selectedCount === 1 
    ? categories.find(c => c.id === selectedIds[0])?.name || '1 selecionada'
    : `${selectedCount} selecionadas`;

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
          <span className="text-gray-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-2">
          {parentCategories.map((parent) => {
            const children = childCategories.filter(c => c.parent_id === parent.id);
            const hasChildren = children.length > 0;
            const isParentSelected = selectedIds.includes(parent.id);
            
            return (
              <div key={parent.id}>
                {/* Categoria Pai */}
                <button
                  onClick={() => toggleCategory(parent.id, hasChildren)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors",
                    isParentSelected && "bg-purple-50"
                  )}
                >
                  {/* Ícone */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${parent.color}20` }}
                  >
                    {renderCategoryIcon(parent.icon, parent.color)}
                  </div>
                  
                  {/* Nome */}
                  <span className="flex-1 text-left font-medium text-gray-900">
                    {parent.name}
                  </span>
                  
                  {/* Check */}
                  {isParentSelected && (
                    <Check size={16} className="text-purple-600" />
                  )}
                </button>

                {/* Categorias Filhas (indentadas) */}
                {hasChildren && children.map((child) => {
                  const isChildSelected = selectedIds.includes(child.id);
                  
                  return (
                    <button
                      key={child.id}
                      onClick={() => toggleCategory(child.id, false)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ml-6",
                        isChildSelected && "bg-purple-50"
                      )}
                    >
                      {/* Indicador de subcategoria */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      </div>
                      
                      {/* Ícone */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${child.color}20` }}
                      >
                        {renderCategoryIcon(child.icon, child.color)}
                      </div>
                      
                      {/* Nome */}
                      <span className="flex-1 text-left text-sm text-gray-700">
                        {child.name}
                      </span>
                      
                      {/* Check */}
                      {isChildSelected && (
                        <Check size={14} className="text-purple-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
