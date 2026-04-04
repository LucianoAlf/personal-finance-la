import { useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
        deadline: goal.deadline ? new Date(goal.deadline) : undefined,
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
        deadline: data.deadline ? (data.deadline as Date).toISOString().split('T')[0] : null,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
          <DialogDescription>
            Atualize os campos da sua meta {isSavings ? 'de economia' : 'de gasto'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !deadline && 'text-muted-foreground')}>
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
                    <Label htmlFor="monthly" className="flex items-center justify-center rounded-md border-2 border-muted p-2 peer-data-[state=checked]:border-primary cursor-pointer">Mensal</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="quarterly" id="quarterly" className="peer sr-only" />
                    <Label htmlFor="quarterly" className="flex items-center justify-center rounded-md border-2 border-muted p-2 peer-data-[state=checked]:border-primary cursor-pointer">Trimestral</Label>
                  </div>
                  <div>
                    <RadioGroupItem value="yearly" id="yearly" className="peer sr-only" />
                    <Label htmlFor="yearly" className="flex items-center justify-center rounded-md border-2 border-muted p-2 peer-data-[state=checked]:border-primary cursor-pointer">Anual</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
