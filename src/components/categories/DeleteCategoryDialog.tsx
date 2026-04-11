import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/categories';

export interface CategoryDeleteDependencies {
  ledgerTransactionCount: number;
  payableBillsCount: number;
  financialGoalsCount: number;
  legacyBudgetsCount: number;
}

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  dependencies: CategoryDeleteDependencies;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  dependencies,
}: DeleteCategoryDialogProps) {
  const { categories, deleteCategory } = useCategories();
  const [loading, setLoading] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');

  const replacementCategories = useMemo(
    () => categories.filter((item) => item.id !== category.id && item.type === category.type),
    [categories, category.id, category.type],
  );

  const totalDependents = useMemo(() => {
    const data = dependencies;
    return (
      data.ledgerTransactionCount +
      data.payableBillsCount +
      data.financialGoalsCount +
      data.legacyBudgetsCount
    );
  }, [dependencies]);

  const needsReassignment = totalDependents > 0;
  const canReassign = !needsReassignment || replacementCategories.length > 0;
  const deleteBlockedReason =
    needsReassignment && !canReassign
      ? `Esta categoria está em uso (${totalDependents} ${
          totalDependents === 1 ? 'registro' : 'registros'
        }) e não há outra categoria do mesmo tipo para realocar os vínculos. Crie outra categoria antes de excluir.`
      : null;

  const handleDelete = async () => {
    if (needsReassignment && !targetCategoryId) return;
    if (deleteBlockedReason) return;

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sessão inválida. Faça login novamente.');
        return;
      }

      if (needsReassignment && targetCategoryId) {
        const fromId = category.id;
        const toId = targetCategoryId;

        const [txRes, cardRes, billsRes, goalsRes] = await Promise.all([
          supabase
            .from('transactions')
            .update({ category_id: toId })
            .eq('user_id', user.id)
            .eq('category_id', fromId),
          supabase
            .from('credit_card_transactions')
            .update({ category_id: toId })
            .eq('user_id', user.id)
            .eq('category_id', fromId),
          supabase
            .from('payable_bills')
            .update({ category_id: toId })
            .eq('user_id', user.id)
            .eq('category_id', fromId),
          supabase
            .from('financial_goals')
            .update({ category_id: toId })
            .eq('user_id', user.id)
            .eq('category_id', fromId),
        ]);

        const coreError = txRes.error || cardRes.error || billsRes.error || goalsRes.error;
        if (coreError) throw coreError;

        const budgetsRes = await supabase
          .from('budgets')
          .update({ category_id: toId })
          .eq('user_id', user.id)
          .eq('category_id', fromId);

        if (budgetsRes.error) {
          const message = budgetsRes.error.message || '';
          const benign = /relation|does not exist|permission denied|not find/i.test(message);
          if (!benign) throw budgetsRes.error;
          console.warn('Reatribuição em budgets legados ignorada:', budgetsRes.error);
        }
      }

      await deleteCategory(category.id);
      toast.success('Categoria excluída com sucesso.');
      onOpenChange(false);
      setTargetCategoryId('');
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível excluir a categoria.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[28px] border-border/70 bg-surface-overlay p-0">
        <DialogHeader className="border-b border-border/60 px-6 pb-5 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl text-danger">
            <AlertTriangle className="h-5 w-5" />
            Excluir categoria
          </DialogTitle>
          <DialogDescription>
            Revise os vínculos antes de remover <strong>{category.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-[22px] border border-border/70 bg-surface/65 p-4">
            <p className="text-sm text-muted-foreground">
              Você está prestes a excluir a categoria{' '}
              <strong className="text-foreground">{category.name}</strong>.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Essa ação não pode ser desfeita.</p>
          </div>

          {needsReassignment ? (
            <div className="space-y-4 rounded-[22px] border border-warning/30 bg-warning-subtle/70 p-4">
              <p className="text-sm font-medium text-foreground">
                Esta categoria ainda está vinculada a registros. Escolha outra categoria do mesmo
                tipo para realocar tudo antes da exclusão.
              </p>

              <ul className="space-y-1 text-sm text-muted-foreground">
                {dependencies.ledgerTransactionCount > 0 && (
                  <li>
                    {dependencies.ledgerTransactionCount}{' '}
                    {dependencies.ledgerTransactionCount === 1
                      ? 'lançamento no extrato (conta ou cartão)'
                      : 'lançamentos no extrato (conta ou cartão)'}
                  </li>
                )}
                {dependencies.payableBillsCount > 0 && (
                  <li>
                    {dependencies.payableBillsCount}{' '}
                    {dependencies.payableBillsCount === 1 ? 'conta a pagar' : 'contas a pagar'}
                  </li>
                )}
                {dependencies.financialGoalsCount > 0 && (
                  <li>
                    {dependencies.financialGoalsCount}{' '}
                    {dependencies.financialGoalsCount === 1
                      ? 'meta financeira'
                      : 'metas financeiras'}
                  </li>
                )}
                {dependencies.legacyBudgetsCount > 0 && (
                  <li>
                    {dependencies.legacyBudgetsCount}{' '}
                    {dependencies.legacyBudgetsCount === 1
                      ? 'orçamento mensal legado'
                      : 'orçamentos mensais legados'}
                  </li>
                )}
              </ul>

              {deleteBlockedReason ? (
                <p className="text-sm font-medium text-danger">{deleteBlockedReason}</p>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="target-category">Mover todos os vínculos para</Label>
                  <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                    <SelectTrigger id="target-category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {replacementCategories.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : null}

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
              onClick={handleDelete}
              disabled={loading || !canReassign || (needsReassignment && !targetCategoryId)}
              className="h-11 rounded-xl bg-danger px-4 text-sm font-semibold text-white hover:bg-danger/90"
            >
              {loading ? 'Excluindo...' : 'Excluir categoria'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
