import { useMemo, useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTags } from '@/hooks/useTags';
import { toast } from 'sonner';

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const { tags, createTag, loading } = useTags();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const selectedTagObjects = useMemo(
    () => tags.filter((tag) => selectedTags.includes(tag.id)),
    [selectedTags, tags]
  );
  const availableTags = useMemo(
    () => tags.filter((tag) => !selectedTags.includes(tag.id)),
    [selectedTags, tags]
  );
  const filteredTags = useMemo(
    () =>
      availableTags.filter((tag) =>
        normalizedSearch ? tag.name.toLowerCase().includes(normalizedSearch) : true
      ),
    [availableTags, normalizedSearch]
  );
  const exactMatch = useMemo(
    () => tags.find((tag) => tag.name.trim().toLowerCase() === normalizedSearch),
    [normalizedSearch, tags]
  );

  const handleAddTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    const tagName = searchQuery.trim();
    if (!tagName) return;

    if (exactMatch) {
      handleAddTag(exactMatch.id);
      setSearchQuery('');
      return;
    }

    setIsCreating(true);
    try {
      const newTag = await createTag({ name: tagName });
      if (newTag) {
        handleAddTag(newTag.id);
        toast.success('Tag criada com sucesso!');
        setSearchQuery('');
      }
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Ja existe uma tag com este nome');
      } else {
        toast.error('Erro ao criar tag');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <div className="space-y-3">
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              className="gap-1 border-transparent text-white"
              style={{ backgroundColor: tag.color || '#6B7280' }}
            >
              <TagIcon size={12} />
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 text-white/80 hover:text-white"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Buscar ou criar tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleCreateTag}
          disabled={!searchQuery.trim() || isCreating}
        >
          <Plus size={16} className="mr-2" />
          {exactMatch ? 'Selecionar' : 'Criar'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando tags...</p>
      ) : filteredTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filteredTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="cursor-pointer transition-colors hover:bg-accent"
              style={{ borderColor: tag.color || '#6B7280', color: tag.color || '#6B7280' }}
              onClick={() => handleAddTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : searchQuery.trim() ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma tag encontrada. Clique em <strong>{exactMatch ? 'Selecionar' : 'Criar'}</strong> para continuar.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma tag disponivel para adicionar.
        </p>
      )}
    </div>
  );
}
