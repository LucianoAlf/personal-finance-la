import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { GoalProgress } from './GoalProgress';
import { useGoals } from '@/hooks/useGoals';
import type { FinancialGoalWithCategory } from '@/types/database.types';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Adicionar Valor - {goal.name}</DialogTitle>
          <DialogDescription>
            Adicione um valor à sua meta de economia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Progresso atual */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progresso atual:</span>
              <span className="font-semibold text-gray-900">
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
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 font-medium">Novo progresso:</span>
                <span className="font-bold text-blue-900">
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
                <p className="text-sm text-green-600 font-semibold text-center">
                  🎉 Você vai alcançar sua meta!
                </p>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || amount <= 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar {amount > 0 && formatCurrency(amount)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
