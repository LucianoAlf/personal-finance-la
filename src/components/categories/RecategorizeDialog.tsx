import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/useCategories';
import { useRecategorize } from '@/hooks/useRecategorize';
import type { Category } from '@/types/categories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecategorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
  };
  currentCategory: Category;
  onSuccess: () => void;
}

export function RecategorizeDialog({
  open,
  onOpenChange,
  transaction,
  currentCategory,
  onSuccess,
}: RecategorizeDialogProps) {
  const { categories } = useCategories();
  const { recategorizeTransaction, recategorizeBulk, loading } = useRecategorize();
  const [newCategoryId, setNewCategoryId] = useState('');
  const [applyToSimilar, setApplyToSimilar] = useState(false);

  const handleRecategorize = async () => {
    if (!newCategoryId) return;

    let success = false;

    if (applyToSimilar) {
      success = await recategorizeBulk(transaction.description, newCategoryId);
    } else {
      success = await recategorizeTransaction(transaction.id, newCategoryId);
    }

    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recategorizar Transação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-600">Transação:</Label>
            <p className="font-medium text-gray-900">{transaction.description}</p>
          </div>

          <div>
            <Label className="text-gray-600">Categoria atual:</Label>
            <p className="font-medium text-gray-900">{currentCategory.name}</p>
          </div>

          <div>
            <Label htmlFor="new-category">Nova categoria:</Label>
            <Select value={newCategoryId} onValueChange={setNewCategoryId}>
              <SelectTrigger id="new-category" className="mt-1">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter(cat => cat.id !== currentCategory.id)
                  .map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
            <Checkbox
              id="apply-similar"
              checked={applyToSimilar}
              onCheckedChange={(checked) => setApplyToSimilar(checked as boolean)}
            />
            <label
              htmlFor="apply-similar"
              className="text-sm text-gray-700 cursor-pointer"
            >
              Aplicar a todas as transações similares (descrição: "{transaction.description}")
            </label>
          </div>

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
              onClick={handleRecategorize}
              disabled={loading || !newCategoryId}
            >
              {loading ? 'Recategorizando...' : 'Recategorizar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
