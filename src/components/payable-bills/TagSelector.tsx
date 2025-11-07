import { useState } from 'react';
import { X, Plus, Tag as TagIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBillTags } from '@/hooks/useBillTags';
import type { Tag } from '@/types/tags';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const { tags, createTag } = useBillTags();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTagObjects = tags.filter(tag => selectedTags.includes(tag.id));

  const handleAddTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;
    
    setIsCreating(true);
    const newTag = await createTag(searchQuery.trim());
    if (newTag) {
      handleAddTag(newTag.id);
      setSearchQuery('');
    }
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <div className="space-y-2">
      {/* Tags Selecionadas */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTagObjects.map(tag => (
            <Badge key={tag.id} variant="outline" className="gap-1">
              <TagIcon size={12} />
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 hover:text-destructive"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover para adicionar */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Plus size={16} className="mr-2" />
            Adicionar Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar ou criar tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          <ScrollArea className="h-[200px]">
            <div className="p-2 space-y-1">
              {filteredTags.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => isSelected ? handleRemoveTag(tag.id) : handleAddTag(tag.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent transition-colors text-left"
                  >
                    <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                      {isSelected && <Check size={12} className="text-primary-foreground" />}
                    </div>
                    <TagIcon size={14} />
                    <span className="text-sm">{tag.name}</span>
                  </button>
                );
              })}
              
              {searchQuery && filteredTags.length === 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleCreateTag}
                  disabled={isCreating}
                >
                  <Plus size={14} className="mr-2" />
                  Criar "{searchQuery}"
                </Button>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
