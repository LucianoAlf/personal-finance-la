import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useRecategorize } from '@/hooks/useRecategorize';
import type { Category } from '@/types/categories';

interface RecategorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
    ledgerEntity: 'transaction' | 'credit_card_transaction';
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

  const allowedCategoryType =
    transaction.ledgerEntity === 'credit_card_transaction' ? 'expense' : currentCategory.type;

  const availableCategories = categories.filter(
    (item) => item.id !== currentCategory.id && item.type === allowedCategoryType,
  );

  const handleRecategorize = async () => {
    if (!newCategoryId) return;

    let success = false;

    if (applyToSimilar) {
      success = await recategorizeBulk(
        transaction.ledgerEntity,
        transaction.description,
        newCategoryId,
      );
    } else {
      success = await recategorizeTransaction(
        transaction.ledgerEntity,
        transaction.id,
        newCategoryId,
      );
    }

    if (success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[28px] border-border/70 bg-surface-overlay p-0">
        <DialogHeader className="border-b border-border/60 px-6 pb-5 pt-6">
          <DialogTitle className="text-xl">Recategorizar lançamento</DialogTitle>
          <DialogDescription>
            Troque a categoria deste lançamento ou aplique a mesma regra aos lançamentos
            semelhantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="space-y-3 rounded-[22px] border border-border/70 bg-surface/65 p-4">
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Lançamento
              </Label>
              <p className="mt-1 text-sm font-medium text-foreground">{transaction.description}</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Categoria atual
              </Label>
              <p className="mt-1 text-sm font-medium text-foreground">{currentCategory.name}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-category">Nova categoria</Label>
            <Select value={newCategoryId} onValueChange={setNewCategoryId}>
              <SelectTrigger id="new-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-3 rounded-[20px] border border-border/70 bg-surface/55 p-4">
            <Checkbox
              id="apply-similar"
              checked={applyToSimilar}
              onCheckedChange={(checked) => setApplyToSimilar(checked as boolean)}
              className="mt-0.5"
            />
            <label
              htmlFor="apply-similar"
              className="cursor-pointer text-sm leading-6 text-muted-foreground"
            >
              Aplicar a todos os lançamentos semelhantes com a descrição{' '}
              <span className="font-medium text-foreground">"{transaction.description}"</span>.
            </label>
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
            <Button
              onClick={handleRecategorize}
              disabled={loading || !newCategoryId}
              className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_28px_rgba(139,92,246,0.24)] hover:bg-primary/90"
            >
              {loading ? 'Recategorizando...' : 'Recategorizar'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
