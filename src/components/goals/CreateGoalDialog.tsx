import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// RadioGroup removido: usamos botões controlados para evitar dessincronização
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, PiggyBank, Shield } from 'lucide-react';
import { format, addMonths, addYears, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import { useCategories } from '@/hooks/useCategories';
import * as LucideIcons from 'lucide-react';
import type { PeriodType, FinancialGoal } from '@/types/database.types';

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'savings' | 'spending_limit';
  onCreated?: (goal: FinancialGoal) => void;
  // Quais tipos podem ser criados neste diálogo. Se apenas um for permitido, o seletor de tipo será ocultado.
  allowedTypes?: Array<'savings' | 'spending_limit'>;
}

// Schema unificado que valida ambos os tipos dinamicamente
const goalFormSchema = z.object({
  type: z.enum(['savings', 'spending_limit']),
  name: z.string().optional(),
  icon: z.string().optional(),
  target_amount: z.number().min(1, 'Valor deve ser maior que zero'),
  current_amount: z.number().min(0).optional(),
  deadline: z.date().optional(),
  category_id: z.string().optional(),
  period_type: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
}).superRefine((data, ctx) => {
  // Validações específicas para meta de economia
  if (data.type === 'savings') {
    if (!data.name || data.name.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Nome deve ter no mínimo 3 caracteres',
      });
    }
    if (!data.deadline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deadline'],
        message: 'Data limite é obrigatória',
      });
    } else if (data.deadline <= new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deadline'],
        message: 'Data deve ser futura',
      });
    }
  }
  
  // Validações específicas para meta de gasto
  if (data.type === 'spending_limit') {
    if (!data.category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category_id'],
        message: 'Selecione uma categoria',
      });
    }
    if (!data.period_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['period_type'],
        message: 'Selecione um período',
      });
    }
  }
});

type GoalFormData = z.infer<typeof goalFormSchema>;

export function CreateGoalDialog({ open, onOpenChange, defaultType = 'savings', onCreated, allowedTypes = ['savings', 'spending_limit'] }: CreateGoalDialogProps) {
  const [loading, setLoading] = useState(false);
  const { createSavingsGoal, createSpendingGoal } = useGoals();
  const { categories } = useCategories();

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      // Garante que o tipo inicial respeite os tipos permitidos
      type: (allowedTypes.includes(defaultType) ? defaultType : allowedTypes[0]) as 'savings' | 'spending_limit',
      period_type: 'monthly',
      current_amount: 0,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = form;

  const goalType = watch('type');
  const selectedCategoryId = watch('category_id');
  const selectedPeriodType = watch('period_type');
  const deadline = watch('deadline');

  // Categorias de despesa (para metas de gasto)
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Reset form quando o modal abrir
  useEffect(() => {
    if (open) {
      reset({
        type: (allowedTypes.includes(defaultType) ? defaultType : allowedTypes[0]) as 'savings' | 'spending_limit',
        period_type: 'monthly',
        current_amount: 0,
      });
    }
  }, [open, defaultType, allowedTypes, reset]);

  const onSubmit = async (data: GoalFormData) => {
    setLoading(true);
    try {
      if (data.type === 'savings') {
        const created = await createSavingsGoal({
          name: data.name,
          icon: data.icon || '💰',
          target_amount: data.target_amount,
          current_amount: data.current_amount || 0,
          deadline: data.deadline,
        });
        if (created) {
          onCreated?.(created as FinancialGoal);
        }
      } else {
        const periodStart = startOfMonth(new Date());
        let periodEnd: Date;
        
        if (data.period_type === 'monthly') {
          periodEnd = endOfMonth(new Date());
        } else if (data.period_type === 'quarterly') {
          periodEnd = endOfMonth(addMonths(new Date(), 2));
        } else {
          periodEnd = endOfMonth(addYears(new Date(), 1));
        }
        const created = await createSpendingGoal({
          name: `Limite ${categories.find(c => c.id === data.category_id)?.name}`,
          category_id: data.category_id,
          target_amount: data.target_amount,
          period_type: data.period_type,
          period_start: periodStart,
          period_end: periodEnd,
        });
        if (created) {
          onCreated?.(created as FinancialGoal);
        }
      }

      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Meta Financeira</DialogTitle>
          <DialogDescription>
            {allowedTypes.length === 1
              ? allowedTypes[0] === 'spending_limit'
                ? 'Defina um limite de gastos por categoria.'
                : 'Crie uma meta de economia para um objetivo.'
              : 'Crie uma meta de economia ou defina um limite de gastos por categoria.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Seletor de tipo */}
          {allowedTypes.length > 1 && (
            <div className="space-y-2">
              <Label>Tipo de Meta</Label>
              <div className="grid grid-cols-2 gap-4">
                {allowedTypes.includes('savings') && (
                  <button
                    type="button"
                    onClick={() => setValue('type', 'savings')}
                    aria-pressed={goalType === 'savings'}
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-colors ${
                      goalType === 'savings' ? 'border-primary' : 'border-muted hover:bg-accent'
                    }`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                      <PiggyBank className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">Meta de Economia</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      Economizar para um objetivo
                    </span>
                  </button>
                )}
                {allowedTypes.includes('spending_limit') && (
                  <button
                    type="button"
                    onClick={() => setValue('type', 'spending_limit')}
                    aria-pressed={goalType === 'spending_limit'}
                    className={`flex flex-col items-center justify-between rounded-md border-2 p-4 transition-colors ${
                      goalType === 'spending_limit' ? 'border-primary' : 'border-muted hover:bg-accent'
                    }`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
                      <Shield className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">Meta de Gasto</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      Definir limite por categoria
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Campos para Meta de Economia */}
          {goalType === 'savings' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Meta</Label>
                <Input
                  id="name"
                  placeholder="Ex: Viagem para Europa"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Valor Alvo (R$)</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    step="0.01"
                    placeholder="30000.00"
                    {...register('target_amount', { valueAsNumber: true })}
                  />
                  {errors.target_amount && (
                    <p className="text-sm text-red-600">{errors.target_amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_amount">Valor Inicial (R$)</Label>
                  <Input
                    id="current_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('current_amount', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data Limite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
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
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.deadline && (
                  <p className="text-sm text-red-600">{errors.deadline.message}</p>
                )}
              </div>
            </>
          )}

          {/* Campos para Meta de Gasto */}
          {goalType === 'spending_limit' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria de Despesa</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(value) => setValue('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                      <span>💸</span> CATEGORIAS DE DESPESA ({expenseCategories.length})
                    </div>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            {(() => {
                              const Icon = (LucideIcons as any)[category.icon];
                              return Icon ? <Icon className="h-3.5 w-3.5" style={{ color: category.color }} /> : null;
                            })()}
                          </div>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-sm text-red-600">{errors.category_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_amount">Valor Limite (R$)</Label>
                <Input
                  id="target_amount"
                  type="number"
                  step="0.01"
                  placeholder="800.00"
                  {...register('target_amount', { valueAsNumber: true })}
                />
                {errors.target_amount && (
                  <p className="text-sm text-red-600">{errors.target_amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Período</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setValue('period_type', 'monthly')}
                    aria-pressed={selectedPeriodType === 'monthly'}
                    className={`flex items-center justify-center rounded-md border-2 p-3 ${
                      selectedPeriodType === 'monthly' ? 'border-primary' : 'border-muted hover:bg-accent'
                    }`}
                  >
                    <span className="font-semibold">Mensal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('period_type', 'quarterly')}
                    aria-pressed={selectedPeriodType === 'quarterly'}
                    className={`flex items-center justify-center rounded-md border-2 p-3 ${
                      selectedPeriodType === 'quarterly' ? 'border-primary' : 'border-muted hover:bg-accent'
                    }`}
                  >
                    <span className="font-semibold">Trimestral</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('period_type', 'yearly')}
                    aria-pressed={selectedPeriodType === 'yearly'}
                    className={`flex items-center justify-center rounded-md border-2 p-3 ${
                      selectedPeriodType === 'yearly' ? 'border-primary' : 'border-muted hover:bg-accent'
                    }`}
                  >
                    <span className="font-semibold">Anual</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Meta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
