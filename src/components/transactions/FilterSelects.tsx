import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useTags } from '@/hooks/useTags';

// TAGS
interface TagMultiSelectProps {
  selectedTags: string[];
  onSelectionChange: (tags: string[]) => void;
}

export function TagMultiSelect({
  selectedTags,
  onSelectionChange,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { tags } = useTags();

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onSelectionChange(selectedTags.filter(t => t !== tagId));
    } else {
      onSelectionChange([...selectedTags, tagId]);
    }
  };

  const selectedCount = selectedTags.length;
  const displayText = selectedCount === 0 
    ? 'Todas as tags' 
    : selectedCount === 1 
    ? tags.find(t => t.id === selectedTags[0])?.name || '1 selecionada'
    : `${selectedCount} selecionadas`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
        >
          <span className={cn(selectedCount === 0 && "text-gray-500")}>
            {displayText}
          </span>
          <span className="text-gray-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="max-h-[200px] overflow-y-auto p-2">
          {tags.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              Nenhuma tag criada ainda
            </div>
          ) : (
            tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left",
                    isSelected && "bg-purple-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm text-gray-700">{tag.name}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-purple-600" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// SITUAÇÕES
interface StatusMultiSelectProps {
  selectedStatuses: string[];
  onSelectionChange: (statuses: string[]) => void;
}

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Efetuadas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'recurring', label: 'Movimentações fixas' },
];

export function StatusMultiSelect({
  selectedStatuses,
  onSelectionChange,
}: StatusMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleStatus = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onSelectionChange(selectedStatuses.filter(s => s !== status));
    } else {
      onSelectionChange([...selectedStatuses, status]);
    }
  };

  const selectedCount = selectedStatuses.length;
  const displayText = selectedCount === 0 
    ? 'Todas as situações' 
    : selectedCount === 1 
    ? STATUS_OPTIONS.find(s => s.value === selectedStatuses[0])?.label || '1 selecionada'
    : `${selectedCount} selecionadas`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
        >
          <span className={cn(selectedCount === 0 && "text-gray-500")}>
            {displayText}
          </span>
          <span className="text-gray-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 space-y-1">
          {STATUS_OPTIONS.map((status) => {
            const isSelected = selectedStatuses.includes(status.value);
            
            return (
              <button
                key={status.value}
                onClick={() => toggleStatus(status.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left",
                  isSelected && "bg-purple-50"
                )}
              >
                <span className="text-sm text-gray-700">{status.label}</span>
                {isSelected && <Check size={14} className="text-purple-600" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// TIPOS
interface TypeMultiSelectProps {
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
}

const TYPE_OPTIONS = [
  { value: 'income', label: 'Receitas' },
  { value: 'expense', label: 'Despesas' },
  { value: 'transfer', label: 'Transferências' },
];

export function TypeMultiSelect({
  selectedTypes,
  onSelectionChange,
}: TypeMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onSelectionChange(selectedTypes.filter(t => t !== type));
    } else {
      onSelectionChange([...selectedTypes, type]);
    }
  };

  const selectedCount = selectedTypes.length;
  const displayText = selectedCount === 0 
    ? 'Todos os tipos' 
    : selectedCount === 1 
    ? TYPE_OPTIONS.find(t => t.value === selectedTypes[0])?.label || '1 selecionado'
    : `${selectedCount} selecionados`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
        >
          <span className={cn(selectedCount === 0 && "text-gray-500")}>
            {displayText}
          </span>
          <span className="text-gray-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 space-y-1">
          {TYPE_OPTIONS.map((type) => {
            const isSelected = selectedTypes.includes(type.value);
            
            return (
              <button
                key={type.value}
                onClick={() => toggleType(type.value)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-left",
                  isSelected && "bg-purple-50"
                )}
              >
                <span className="text-sm text-gray-700">{type.label}</span>
                {isSelected && <Check size={14} className="text-purple-600" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
