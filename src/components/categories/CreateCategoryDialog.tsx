import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/categories';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory?: Category;
}

const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#6366f1',
];

const COMMON_ICONS = [
  'Utensils', 'Car', 'Heart', 'Smile', 'ShoppingCart',
  'Home', 'GraduationCap', 'Shirt', 'Laptop', 'Gamepad2',
  'Coffee', 'Plane', 'Gift', 'Music', 'Film',
];

export function CreateCategoryDialog({ open, onOpenChange, editCategory }: CreateCategoryDialogProps) {
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
    } else {
      setName('');
      setColor(PRESET_COLORS[0]);
      setIcon('Tag');
      setKeywords('');
    }
  }, [editCategory, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      const categoryData = {
        name,
        color,
        icon,
        keywords: keywordsArray,
        type: 'expense' as const,
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

  const SelectedIcon = (LucideIcons as any)[icon] || LucideIcons.Tag;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editCategory ? 'Editar Categoria' : 'Criar Nova Categoria'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Games, Pets, Viagens..."
              required
              className="mt-1"
            />
          </div>

          {/* Cor */}
          <div>
            <Label>Cor *</Label>
            <div className="flex items-center gap-3 mt-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    color === presetColor
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 cursor-pointer"
                title="Escolher cor personalizada"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Cor selecionada: <span className="font-mono">{color}</span>
            </p>
          </div>

          {/* Ícone */}
          <div>
            <Label>Ícone *</Label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {COMMON_ICONS.map((iconName) => {
                const IconComp = (LucideIcons as any)[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                      icon === iconName
                        ? 'border-gray-900 bg-gray-100'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title={iconName}
                  >
                    <IconComp className="h-5 w-5 text-gray-700" />
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <SelectedIcon className="h-6 w-6" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Preview</p>
                <p className="text-xs text-gray-500">{name || 'Nome da categoria'}</p>
              </div>
            </div>
          </div>

          {/* Palavras-chave */}
          <div>
            <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Ex: steam, playstation, xbox, epic games"
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              💡 Dica: Adicione palavras que aparecem nas descrições das transações desta categoria
            </p>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? 'Salvando...' : editCategory ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
