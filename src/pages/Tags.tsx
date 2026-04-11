import { useMemo, useState } from 'react';
import {
  PaintBucket,
  Palette,
  PencilLine,
  Plus,
  Sparkles,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Header } from '@/components/layout/Header';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useTags } from '@/hooks/useTags';
import type { Tag } from '@/types/tags';

const TAG_COLORS = [
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#6b7280',
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
];

const tagsPrimaryButtonClass =
  'h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.24)] hover:bg-primary/90';

const tagsPanelClassName =
  'rounded-[28px] border border-border/70 bg-card/95 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]';

function normalizeTagName(name: string) {
  return name.trim().toLocaleLowerCase('pt-BR');
}

export function Tags() {
  const { tags, loading, createTag, updateTag, deleteTag } = useTags();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const uniqueColorCount = useMemo(() => new Set(tags.map((tag) => tag.color)).size, [tags]);

  const openCreateDialog = () => {
    setEditingTag(null);
    setTagName('');
    setSelectedColor(TAG_COLORS[0]);
    setDialogOpen(true);
  };

  const openEditDialog = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setSelectedColor(tag.color);
    setDialogOpen(true);
  };

  const openDeleteDialog = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  const handleSaveTag = async () => {
    const normalizedName = normalizeTagName(tagName);

    if (!normalizedName) {
      toast.error('Informe um nome para a tag.');
      return;
    }

    const duplicate = tags.find(
      (tag) =>
        normalizeTagName(tag.name) === normalizedName &&
        (!editingTag || tag.id !== editingTag.id),
    );

    if (duplicate) {
      toast.error('Já existe uma tag com esse nome.');
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        await updateTag(editingTag.id, {
          name: tagName.trim(),
          color: selectedColor,
        });
        toast.success('Tag atualizada com sucesso.');
      } else {
        await createTag({
          name: tagName.trim(),
          color: selectedColor,
        });
        toast.success('Tag criada com sucesso.');
      }

      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar tag:', error);
      toast.error('Não foi possível salvar a tag.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!selectedTag) return;

    setDeleting(true);
    try {
      await deleteTag(selectedTag.id);
      toast.success('Tag excluída com sucesso.');
      setDeleteDialogOpen(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      toast.error('Não foi possível excluir a tag.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_26%)]" />

      <Header
        title="Tags"
        subtitle="Organize suas transações com etiquetas personalizadas."
        icon={<TagIcon size={24} />}
        actions={
          <Button className={tagsPrimaryButtonClass} onClick={openCreateDialog}>
            <Plus size={16} className="mr-1" />
            Nova Tag
          </Button>
        }
      />

      <div className="relative space-y-6 p-6">
        <section className={`${tagsPanelClassName} overflow-hidden`}>
          <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Taxonomia viva
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Etiquetas rápidas, leitura clara e semântica consistente.
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use tags para destacar contextos transversais como lazer, mercado, saúde e
                  prioridades temporárias sem conflitar com a hierarquia de categorias.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-border/70 bg-surface/80 p-5">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                  <TagIcon className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">Tags ativas</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {loading ? '--' : tags.length}
                </p>
              </div>

              <div className="rounded-[24px] border border-border/70 bg-surface/80 p-5">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/15 bg-sky-500/10 text-sky-500 shadow-sm">
                  <Palette className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">Cores em uso</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {loading ? '--' : uniqueColorCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={`${tagsPanelClassName} overflow-hidden`}>
          <div className="border-b border-border/60 px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Biblioteca de tags</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Visualize, ajuste cor e mantenha sua taxonomia sempre legível.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-[22px]" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <div className="p-6">
              <div className="rounded-[24px] border border-dashed border-border/70 bg-surface/60 px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary shadow-sm">
                  <PaintBucket className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Nenhuma tag criada ainda</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  Crie sua primeira tag para destacar contextos e padrões nas transações sem
                  mexer na estrutura principal de categorias.
                </p>
                <Button className={`${tagsPrimaryButtonClass} mt-6`} onClick={openCreateDialog}>
                  <Plus size={16} className="mr-1" />
                  Criar primeira tag
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="hidden border-b border-border/60 px-4 pb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_220px_168px] md:gap-4">
                <span>Nome</span>
                <span>Cor</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-border/60">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="grid gap-4 px-4 py-5 transition-colors hover:bg-surface/45 md:grid-cols-[minmax(0,1fr)_220px_168px] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.04)]"
                        style={{ backgroundColor: tag.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {tag.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Criada para rotular contextos transversais.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-2xl border border-border/70 shadow-sm"
                        style={{ backgroundColor: `${tag.color}22`, borderColor: `${tag.color}45` }}
                      />
                      <span
                        className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
                        style={{
                          borderColor: `${tag.color}55`,
                          backgroundColor: `${tag.color}18`,
                          color: tag.color,
                        }}
                      >
                        {tag.color}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => openEditDialog(tag)}
                      >
                        <PencilLine className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-danger/30 text-danger hover:bg-danger-subtle hover:text-danger"
                        onClick={() => openDeleteDialog(tag)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border-border/70 bg-surface-overlay p-0">
          <DialogHeader className="border-b border-border/60 px-6 pb-5 pt-6">
            <DialogTitle className="text-xl">
              {editingTag ? 'Editar tag' : 'Nova tag'}
            </DialogTitle>
            <DialogDescription>
              Ajuste nome, cor e preview da etiqueta para manter sua taxonomia clara e consistente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="Ex.: Alimentação, Lazer, Mercado..."
              />
            </div>

            <div className="space-y-3">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-3">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`h-11 w-11 rounded-2xl border-2 transition-transform hover:scale-[1.04] ${
                      selectedColor === color
                        ? 'border-foreground shadow-[0_12px_24px_rgba(15,23,42,0.18)]'
                        : 'border-border/70'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Selecionar cor ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-surface/70 p-5">
              <p className="text-sm font-medium text-muted-foreground">Preview</p>
              <div className="mt-4 flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 shadow-sm"
                  style={{
                    backgroundColor: `${selectedColor}20`,
                    borderColor: `${selectedColor}40`,
                  }}
                >
                  <TagIcon className="h-6 w-6" style={{ color: selectedColor }} />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">
                    {tagName.trim() || 'Nome da tag'}
                  </p>
                  <span
                    className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold"
                    style={{
                      borderColor: `${selectedColor}55`,
                      backgroundColor: `${selectedColor}18`,
                      color: selectedColor,
                    }}
                  >
                    {selectedColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className={tagsPrimaryButtonClass} onClick={handleSaveTag} disabled={saving}>
              {saving ? 'Salvando...' : editingTag ? 'Salvar alterações' : 'Criar tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md rounded-[28px] border-border/70 bg-surface-overlay p-0">
          <DialogHeader className="border-b border-border/60 px-6 pb-5 pt-6">
            <DialogTitle className="text-xl">Excluir tag</DialogTitle>
            <DialogDescription>
              Essa ação remove a etiqueta da sua biblioteca. Use com cuidado para não perder
              consistência histórica.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-6">
            <div className="rounded-[24px] border border-danger/20 bg-danger-subtle/35 p-4">
              <p className="text-sm text-muted-foreground">Tag selecionada</p>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedTag?.color || TAG_COLORS[0] }}
                />
                <p className="text-base font-semibold text-foreground">
                  {selectedTag?.name || 'Tag'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTag}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting ? 'Excluindo...' : 'Excluir tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
