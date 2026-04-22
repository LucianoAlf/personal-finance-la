import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { GoalProgress } from './GoalProgress';
import { useGoals } from '@/hooks/useGoals';
import type { FinancialGoalWithCategory } from '@/types/database.types';
import { cn } from '@/lib/cn';

interface AddValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: FinancialGoalWithCategory | null;
}

const schema = z.object({
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
});

type FormData = z.infer<typeof schema>;


export function AddValueDialog({ open, onOpenChange, goal }: AddValueDialogProps) {
  const [loading, setLoading] = useState(false);
  const { addToSavingsGoal } = useGoals();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const amount = watch('amount') || 0;
  const newAmount = goal ? goal.current_amount + amount : 0;
  const newPercentage = goal && goal.target_amount > 0
    ? Math.round((newAmount / goal.target_amount) * 100)
    : 0;

  const onSubmit = async (data: FormData) => {
    if (!goal) return;

    setLoading(true);
    try {
      await addToSavingsGoal(goal.id, data.amount);
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Error adding value:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!goal) return null;

  const dialogTitle = `Adicionar Valor - ${goal.name}`;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
      <ResponsiveDialogBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
          {/* Progresso atual */}
          <div className="space-y-2 rounded-[1.35rem] border border-border/60 bg-surface-elevated/45 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/72">Progresso atual:</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(goal.current_amount)} ({goal.percentage}%)
              </span>
            </div>
            <GoalProgress
              current={goal.current_amount}
              target={goal.target_amount}
              status="safe"
              showLabel={false}
            />
          </div>

          {/* Input de valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor a adicionar (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="500.00"
              {...register('amount', { valueAsNumber: true })}
              autoFocus
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          {/* Preview do novo progresso */}
          {amount > 0 && (
            <div className="space-y-2 rounded-[1.35rem] border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary">Novo progresso:</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(newAmount)} ({newPercentage}%)
                </span>
              </div>
              <GoalProgress
                current={newAmount}
                target={goal.target_amount}
                status={newPercentage >= 100 ? 'exceeded' : newPercentage >= 75 ? 'warning' : 'safe'}
                showLabel={false}
              />
              {newPercentage >= 100 && (
                <p className="text-center text-sm font-semibold text-success">
                  🎉 Você vai alcançar sua meta!
                </p>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              disabled={loading}
              className="rounded-xl border-border/70 bg-surface/85 hover:bg-surface-elevated"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || amount <= 0}
              className={cn(
                'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90',
                (loading || amount <= 0) && 'opacity-100'
              )}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar {amount > 0 && formatCurrency(amount)}
            </Button>
          </div>
        </form>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
