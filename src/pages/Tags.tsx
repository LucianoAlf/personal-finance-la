import { useState } from 'react';
import { toast } from 'sonner';
import { Tag as TagIcon, Plus, Pencil, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTags } from '@/hooks/useTags';
import type { Tag } from '@/types/tags';

const TAG_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
];

export const Tags = () => {
  const { tags, loading, createTag, updateTag, deleteTag } = useTags();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setSelectedColor(tag.color);
    } else {
      setEditingTag(null);
      setTagName('');
      setSelectedColor(TAG_COLORS[0]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTag(null);
    setTagName('');
    setSelectedColor(TAG_COLORS[0]);
  };

  const handleSave = async () => {
    if (!tagName.trim()) {
      toast.error('Digite um nome para a tag');
      return;
    }

    try {
      if (editingTag) {
        await updateTag(editingTag.id, {
          name: tagName.trim(),
          color: selectedColor,
        });
        toast.success('Tag atualizada com sucesso!');
      } else {
        await createTag({
          name: tagName.trim(),
          color: selectedColor,
        });
        toast.success('Tag criada com sucesso!');
      }
      handleCloseDialog();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe uma tag com este nome');
      } else {
        toast.error('Erro ao salvar tag');
      }
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Deseja realmente excluir a tag "${tag.name}"?`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      toast.success('Tag excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir tag');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Tags"
        subtitle="Organize suas transações com etiquetas personalizadas"
        icon={<TagIcon size={24} />}
        actions={
          <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
            <Plus size={20} />
            Nova Tag
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <p>Carregando tags...</p>
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TagIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhuma tag criada ainda</p>
                <p className="text-sm">Crie sua primeira tag para organizar suas transações</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Cor</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tag) => (
                      <tr key={tag.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="font-medium text-gray-900">{tag.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.color}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(tag)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(tag)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG CRIAR/EDITAR TAG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                placeholder="Ex: lazer, ifood, despesas fixas"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-purple-500 hover:bg-purple-600">
              {editingTag ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
