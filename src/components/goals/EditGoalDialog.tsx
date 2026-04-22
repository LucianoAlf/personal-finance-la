import { useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly, parseDateOnly } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import type { FinancialGoalWithCategory, PeriodType } from '@/types/database.types';

interface EditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: FinancialGoalWithCategory | null;
}

const savingsSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  target_amount: z.number().min(1, 'Valor deve ser maior que zero'),
  deadline: z.date().optional(),
});

const spendingSchema = z.object({
  target_amount: z.number().min(1, 'Valor deve ser maior que zero'),
  period_type: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
});

type SavingsForm = z.infer<typeof savingsSchema>;
type SpendingForm = z.infer<typeof spendingSchema>;

const dialogTitle = 'Editar Meta';

export function EditGoalDialog({ open, onOpenChange, goal }: EditGoalDialogProps) {
  const { updateGoal } = useGoals();

  const isSavings = goal?.goal_type === 'savings';
  const schema = isSavings ? savingsSchema : spendingSchema;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(schema as any),
  });

  const deadline = watch('deadline');
  const periodType = watch('period_type');

  useEffect(() => {
    if (!goal) return;
    if (isSavings) {
      reset({
        name: goal.name,
        target_amount: goal.target_amount,
        deadline: goal.deadline ? parseDateOnly(goal.deadline) : undefined,
      });
    } else {
      reset({
        target_amount: goal.target_amount,
        period_type: goal.period_type as PeriodType,
      });
    }
  }, [goal, isSavings, reset]);

  const onSubmit = async (data: any) => {
    if (!goal) return;
    if (isSavings) {
      await updateGoal(goal.id, {
        name: data.name,
        target_amount: data.target_amount,
        deadline: data.deadline ? formatDateOnly(data.deadline as Date) : null,
      } as any);
    } else {
      await updateGoal(goal.id, {
        target_amount: data.target_amount,
        period_type: data.period_type,
      } as any);
    }
    onOpenChange(false);
  };

  if (!goal) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <ResponsiveDialogHeader title={dialogTitle} onClose={() => onOpenChange(false)} />
      <ResponsiveDialogBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
          {isSavings ? (
            <>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Valor Alvo (R$)</Label>
                <Input type="number" step="0.01" {...register('target_amount', { valueAsNumber: true })} />
                {errors.target_amount && <p className="text-sm text-red-600">{errors.target_amount.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Data Limite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start rounded-xl border-border/70 bg-surface text-left font-normal hover:bg-surface-elevated',
                        !deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, 'PPP', { locale: ptBR }) : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={(date) => setValue('deadline', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Valor Limite (R$)</Label>
                <Input type="number" step="0.01" {...register('target_amount', { valueAsNumber: true })} />
                {errors.target_amount && <p className="text-sm text-red-600">{errors.target_amount.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <RadioGroup value={periodType} onValueChange={(v) => setValue('period_type', v)} className="grid grid-cols-3 gap-3">
                  <div>
                    <RadioGroupItem value="monthly" id="monthly" className="peer sr-only" />
                    <Label htmlFor="monthly" className="flex cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-surface-elevated/40 p-3 text-sm font-semibold transition-all peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary">Mensal</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="quarterly" id="quarterly" className="peer sr-only" />
                    <Label htmlFor="quarterly" className="flex cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-surface-elevated/40 p-3 text-sm font-semibold transition-all peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary">Trimestral</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="yearly" id="yearly" className="peer sr-only" />
                    <Label htmlFor="yearly" className="flex cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-surface-elevated/40 p-3 text-sm font-semibold transition-all peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary">Anual</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="rounded-xl border-border/70 bg-surface/85 hover:bg-surface-elevated">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90">{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
          </div>
        </form>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
