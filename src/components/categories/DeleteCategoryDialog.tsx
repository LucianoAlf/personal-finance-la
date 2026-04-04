import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/categories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  transactionCount: number;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  transactionCount,
}: DeleteCategoryDialogProps) {
  const { categories, deleteCategory } = useCategories();
  const [loading, setLoading] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  const otherCategories = categories.filter(c => c.id !== category.id);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // Se houver transações, mover para outra categoria
      if (transactionCount > 0 && targetCategoryId) {
        await supabase
          .from('credit_card_transactions')
          .update({ category_id: targetCategoryId })
          .eq('category_id', category.id);
      }

      // Deletar categoria
      await deleteCategory(category.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Deletar Categoria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-700">
            Tem certeza que deseja deletar a categoria <strong>"{category.name}"</strong>?
          </p>

          <p className="text-sm text-gray-600">
            Esta ação não pode ser desfeita.
          </p>

          {transactionCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-900 mb-3">
                Esta categoria possui {transactionCount}{' '}
                {transactionCount === 1 ? 'transação' : 'transações'}.
              </p>

              <Label htmlFor="target-category" className="text-yellow-900">
                Mover transações para:
              </Label>
              <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                <SelectTrigger id="target-category" className="mt-1">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {otherCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading || (transactionCount > 0 && !targetCategoryId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Deletando...' : 'Deletar Categoria'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
