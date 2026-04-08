import { useMemo, useState } from 'react';
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
import { toast } from 'sonner';

export interface CategoryDeleteDependencies {
  /** Bank + credit card ledger rows (unified count). */
  ledgerTransactionCount: number;
  payableBillsCount: number;
  financialGoalsCount: number;
  /** Legacy `budgets` rows, if any. */
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
    () => categories.filter((c) => c.id !== category.id && c.type === category.type),
    [categories, category.id, category.type],
  );

  const totalDependents = useMemo(() => {
    const d = dependencies;
    return (
      d.ledgerTransactionCount +
      d.payableBillsCount +
      d.financialGoalsCount +
      d.legacyBudgetsCount
    );
  }, [dependencies]);

  const needsReassignment = totalDependents > 0;
  const canReassign = !needsReassignment || replacementCategories.length > 0;
  const deleteBlockedReason = needsReassignment && !canReassign
    ? `Esta categoria está em uso (${totalDependents} ${totalDependents === 1 ? 'registro' : 'registros'}) e não há outra categoria do mesmo tipo (${category.type === 'income' ? 'receita' : 'despesa'}) para realocar os vínculos. Crie outra categoria antes de excluir.`
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

        const coreError =
          txRes.error || cardRes.error || billsRes.error || goalsRes.error;
        if (coreError) throw coreError;

        const budgetsRes = await supabase
          .from('budgets')
          .update({ category_id: toId })
          .eq('user_id', user.id)
          .eq('category_id', fromId);

        if (budgetsRes.error) {
          const msg = budgetsRes.error.message || '';
          const benign =
            /relation|does not exist|permission denied|not find/i.test(msg);
          if (!benign) throw budgetsRes.error;
          console.warn('Reatribuição em budgets legados ignorada:', budgetsRes.error);
        }
      }

      await deleteCategory(category.id);
      toast.success('Categoria excluída com sucesso.');
      onOpenChange(false);
      setTargetCategoryId('');
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      toast.error(
        error instanceof Error ? error.message : 'Não foi possível excluir a categoria.',
      );
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
            Tem certeza que deseja deletar a categoria <strong>&quot;{category.name}&quot;</strong>?
          </p>

          <p className="text-sm text-gray-600">
            Esta ação não pode ser desfeita.
          </p>

          {needsReassignment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-yellow-900">
                Esta categoria ainda está vinculada a registros. Escolha outra categoria do mesmo tipo para
                realocar antes de excluir.
              </p>
              <ul className="text-sm text-yellow-900 list-disc pl-5 space-y-1">
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
                    {dependencies.financialGoalsCount === 1 ? 'meta financeira' : 'metas financeiras'}
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
                <p className="text-sm text-red-800 font-medium">{deleteBlockedReason}</p>
              ) : (
                <>
                  <Label htmlFor="target-category" className="text-yellow-900">
                    Mover todos os vínculos para:
                  </Label>
                  <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
                    <SelectTrigger id="target-category" className="mt-1">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {replacementCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
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
              disabled={
                loading ||
                !canReassign ||
                (needsReassignment && !targetCategoryId)
              }
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
