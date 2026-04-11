import { useEffect, useState, type CSSProperties, type ComponentType } from 'react';
import * as LucideIcons from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import type { Category, CategoryType } from '@/types/categories';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryType: CategoryType;
  editCategory?: Category;
}

const PRESET_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#f43f5e',
  '#6366f1',
];

const COMMON_ICONS = [
  'Utensils',
  'Car',
  'Heart',
  'Smile',
  'ShoppingCart',
  'Home',
  'GraduationCap',
  'Shirt',
  'Laptop',
  'Gamepad2',
  'Coffee',
  'Plane',
  'Gift',
  'Music',
  'Film',
];

const primaryButtonClass =
  'h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.24)] hover:bg-primary/90';

export function CreateCategoryDialog({
  open,
  onOpenChange,
  categoryType,
  editCategory,
}: CreateCategoryDialogProps) {
  const iconMap = LucideIcons as unknown as Record<
    string,
    ComponentType<{ className?: string; style?: CSSProperties }>
  >;

  const { addCategory, updateCategory } = useCategories();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('Tag');
  const [keywords, setKeywords] = useState('');

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name);
      setColor(editCategory.color);
      setIcon(editCategory.icon || 'Tag');
      setKeywords(editCategory.keywords?.join(', ') || '');
      return;
    }

    setName('');
    setColor(PRESET_COLORS[0]);
    setIcon('Tag');
    setKeywords('');
  }, [editCategory, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const keywordsArray = keywords
        .split(',')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length > 0);

      const typeForPayload: CategoryType = editCategory?.type ?? categoryType;

      const categoryData = {
        name,
        color,
        icon,
        keywords: keywordsArray,
        type: typeForPayload,
        parent_id: null,
      };

      if (editCategory) {
        await updateCategory(editCategory.id, categoryData);
      } else {
        await addCategory(categoryData);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const SelectedIcon = iconMap[icon] || LucideIcons.Tag;

  const previewKeywords = keywords
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-[28px] border-border/70 bg-surface-overlay p-0">
        <DialogHeader className="border-b border-border/60 px-6 pb-5 pt-6">
          <DialogTitle className="text-xl">
            {editCategory ? 'Editar categoria' : 'Nova categoria'}
          </DialogTitle>
          <DialogDescription>
            Defina nome, cor, ícone e palavras-chave para manter sua taxonomia sempre clara.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Games, Pets, Viagens..."
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Cor</Label>
            <div className="flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`h-11 w-11 rounded-2xl border-2 transition-transform hover:scale-[1.04] ${
                    color === presetColor
                      ? 'border-foreground shadow-[0_12px_24px_rgba(15,23,42,0.18)]'
                      : 'border-border/70'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}

              <Input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-11 w-16 cursor-pointer rounded-xl border-border/70 bg-surface px-2"
                title="Escolher cor personalizada"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Cor selecionada: <span className="font-mono font-medium text-foreground">{color}</span>
            </p>
          </div>

          <div className="space-y-3">
            <Label>Ícone</Label>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {COMMON_ICONS.map((iconName) => {
                const IconComponent = iconMap[iconName] || LucideIcons.Tag;

                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`flex h-12 items-center justify-center rounded-2xl border transition-all ${
                      icon === iconName
                        ? 'border-primary/35 bg-primary/10 text-primary shadow-sm'
                        : 'border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface'
                    }`}
                    title={iconName}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Palavras-chave</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
              placeholder="Ex.: steam, playstation, xbox, epic games"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Separe por vírgula as palavras que costumam aparecer nas descrições dessa categoria.
            </p>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-surface/70 p-5">
            <p className="text-sm font-medium text-muted-foreground">Preview</p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-[20px] border shadow-sm"
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: `${color}40`,
                }}
              >
                <SelectedIcon className="h-6 w-6" style={{ color }} />
              </div>

              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  {name.trim() || 'Nome da categoria'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {previewKeywords || 'Sem palavras-chave ainda'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 px-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className={primaryButtonClass} disabled={loading || !name}>
              {loading ? 'Salvando...' : editCategory ? 'Salvar alterações' : 'Criar categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
