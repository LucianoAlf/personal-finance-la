import { useState, useEffect } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Bell,
  Loader2,
  AlertTriangle,
  Home,
  GraduationCap,
  Palmtree,
} from 'lucide-react';
import type { 
  InvestmentGoal, 
  CreateInvestmentGoalInput, 
  UpdateInvestmentGoalInput,
  InvestmentGoalCategory,
  InvestmentGoalPriority,
} from '@/types/investment-goals.types';
import { INVESTMENT_GOAL_LABELS, INVESTMENT_GOAL_COLORS } from '@/types/investment-goals.types';

const goalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  description: z.string().optional(),
  category: z.enum(['retirement', 'financial_freedom', 'education', 'real_estate', 'general']),
  target_amount: z.number().min(1, 'Valor deve ser maior que R$ 0'),
  current_amount: z.number().min(0).default(0),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  target_date: z.string().min(1, 'Data alvo é obrigatória'),
  expected_return_rate: z.number().min(0, 'Taxa deve ser positiva').max(100, 'Taxa máxima é 100%'),
  monthly_contribution: z.number().min(0).default(0),
  contribution_day: z.number().min(1).max(28).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notify_milestones: z.boolean().default(true),
  notify_contribution: z.boolean().default(false),
  notify_rebalancing: z.boolean().default(false),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface InvestmentGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: InvestmentGoal | null;
  onSave: (input: CreateInvestmentGoalInput | UpdateInvestmentGoalInput) => Promise<boolean>;
}

const CATEGORY_ICONS = {
  retirement: Palmtree,
  financial_freedom: TrendingUp,
  education: GraduationCap,
  real_estate: Home,
  general: Target,
};

export function InvestmentGoalDialog({ open, onOpenChange, goal, onSave }: InvestmentGoalDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    shouldFocusError: true,
    defaultValues: {
      name: '',
      description: '',
      category: 'general',
      target_amount: 10000,
      current_amount: 0,
      start_date: new Date().toISOString().split('T')[0],
      target_date: '',
      expected_return_rate: 8,
      monthly_contribution: 500,
      contribution_day: 5,
      priority: 'medium',
      notify_milestones: true,
      notify_contribution: false,
      notify_rebalancing: false,
    },
  });

  const watchCategory = watch('category');
  const watchTargetAmount = watch('target_amount');
  const watchCurrentAmount = watch('current_amount');
  const watchMonthlyContribution = watch('monthly_contribution');
  const watchReturnRate = watch('expected_return_rate');
  const watchStartDate = watch('start_date');
  const watchTargetDate = watch('target_date');
  const watchNotifyContribution = watch('notify_contribution');

  // Calcular projeção simples
  const projection = (() => {
    if (!watchTargetDate || !watchStartDate) return null;
    
    const start = new Date(watchStartDate);
    const target = new Date(watchTargetDate);
    const months = Math.max(1, (target.getFullYear() - start.getFullYear()) * 12 + (target.getMonth() - start.getMonth()));
    
    const monthlyRate = watchReturnRate / 12 / 100;
    let balance = watchCurrentAmount;
    
    for (let i = 0; i < months; i++) {
      balance = balance * (1 + monthlyRate) + watchMonthlyContribution;
    }
    
    return {
      months,
      finalAmount: balance,
      totalContributions: watchMonthlyContribution * months,
      totalInterest: balance - watchCurrentAmount - (watchMonthlyContribution * months),
      willReachGoal: balance >= watchTargetAmount,
    };
  })();

  // Preencher form ao editar
  useEffect(() => {
    if (goal) {
      const today = new Date().toISOString().split('T')[0];
      reset({
        name: goal.name,
        description: goal.description || '',
        category: goal.category,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        start_date: goal.start_date || today,
        target_date: goal.target_date,
        expected_return_rate: goal.expected_return_rate,
        monthly_contribution: goal.monthly_contribution,
        contribution_day: goal.contribution_day || undefined,
        priority: goal.priority,
        notify_milestones: goal.notify_milestones,
        notify_contribution: goal.notify_contribution,
        notify_rebalancing: goal.notify_rebalancing,
      });
    } else {
      reset({
        name: '',
        description: '',
        category: 'general',
        target_amount: 10000,
        current_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
        expected_return_rate: 8,
        monthly_contribution: 500,
        contribution_day: 5,
        priority: 'medium',
        notify_milestones: true,
        notify_contribution: false,
        notify_rebalancing: false,
      });
    }
  }, [goal, reset, open]);

  const onSubmit = async (data: GoalFormData) => {
    setIsSaving(true);
    try {
      const input = {
        ...data,
        color: INVESTMENT_GOAL_COLORS[data.category],
        icon: Object.keys(CATEGORY_ICONS)[Object.values(CATEGORY_ICONS).indexOf(CATEGORY_ICONS[data.category])],
      };
      
      const success = await onSave(input);
      if (success) {
        onOpenChange(false);
        reset();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<GoalFormData>) => {
    const keys = Object.keys(formErrors);
    if (keys.length === 0) return;

    const basicErrors = ['name', 'description', 'category'];
    const valuesErrors = ['target_amount', 'current_amount', 'start_date', 'target_date'];
    const returnErrors = ['expected_return_rate', 'monthly_contribution', 'contribution_day'];

    if (keys.some((k) => basicErrors.includes(k))) setActiveTab('basic');
    else if (keys.some((k) => valuesErrors.includes(k))) setActiveTab('values');
    else if (keys.some((k) => returnErrors.includes(k))) setActiveTab('returns');

    toast.error('Preencha todos os campos obrigatórios');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            {goal ? 'Editar Meta de Investimento' : 'Nova Meta de Investimento'}
          </DialogTitle>
          <DialogDescription>
            {goal ? 'Atualize sua meta de longo prazo' : 'Configure sua meta com juros compostos e projeções'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="relative">
                Básico
                {(errors.name || errors.category) && (
                  <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="values" className="relative">
                Valores & Prazo
                {(errors.target_amount || errors.target_date) && (
                  <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="returns">Rentabilidade</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
            </TabsList>

            {/* ABA 1: BÁSICO */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Meta *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Aposentadoria Tranquila"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Ex: Meta para me aposentar aos 55 anos"
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={watchCategory}
                  onValueChange={(value) => setValue('category', value as InvestmentGoalCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVESTMENT_GOAL_LABELS.category).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value) => setValue('priority', value as InvestmentGoalPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INVESTMENT_GOAL_LABELS.priority).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ABA 2: VALORES & PRAZO */}
            <TabsContent value="values" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Valor Alvo (R$) *</Label>
                  <Input
                    id="target_amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1.000.000,00"
                    {...register('target_amount', {
                      setValueAs: (v) => {
                        if (typeof v === 'number') return v;
                        if (typeof v !== 'string') return v;
                        const normalized = v.replace(/\./g, '').replace(',', '.');
                        const n = parseFloat(normalized);
                        return isNaN(n) ? undefined : n;
                      },
                    })}
                  />
                  {errors.target_amount && (
                    <p className="text-sm text-red-600">{errors.target_amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_amount">Valor Atual (R$)</Label>
                  <Input
                    id="current_amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 0,00"
                    {...register('current_amount', {
                      setValueAs: (v) => {
                        if (v === '' || v === null || typeof v === 'undefined') return 0;
                        if (typeof v === 'number') return v;
                        if (typeof v !== 'string') return v;
                        const normalized = v.replace(/\./g, '').replace(',', '.');
                        const n = parseFloat(normalized);
                        return isNaN(n) ? 0 : n;
                      },
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início *</Label>
                  <DatePickerInput
                    value={watch('start_date')}
                    onChange={(value) => setValue('start_date', value)}
                    placeholder="Selecione a data de início"
                  />
                  {errors.start_date && (
                    <p className="text-sm text-red-600">{errors.start_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_date">Data Alvo *</Label>
                  <DatePickerInput
                    value={watch('target_date')}
                    onChange={(value) => setValue('target_date', value)}
                    placeholder="Selecione a data alvo"
                  />
                  {errors.target_date && (
                    <p className="text-sm text-red-600">{errors.target_date.message}</p>
                  )}
                </div>
              </div>

              {/* Projeção */}
              {projection && (
                <div className={`p-4 rounded-lg ${projection.willReachGoal ? 'bg-green-50 dark:bg-green-950' : 'bg-orange-50 dark:bg-orange-950'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`h-4 w-4 ${projection.willReachGoal ? 'text-green-600' : 'text-orange-600'}`} />
                    <p className="font-semibold">Projeção Estimada</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor Final:</p>
                      <p className="font-semibold">R$ {projection.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Juros:</p>
                      <p className="font-semibold text-green-600">+R$ {projection.totalInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    {projection.willReachGoal 
                      ? '✅ Você atingirá sua meta no prazo!' 
                      : '⚠️ Ajuste o aporte ou prazo para atingir a meta'}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ABA 3: RENTABILIDADE */}
            <TabsContent value="returns" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="expected_return_rate">Taxa de Retorno Anual (%) *</Label>
                <Input
                  id="expected_return_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Ex: 8.00"
                  {...register('expected_return_rate', { valueAsNumber: true })}
                />
                {errors.expected_return_rate && (
                  <p className="text-sm text-red-600">{errors.expected_return_rate.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Referência: CDI ~13,65% | IPCA ~4,5% | Poupança ~6,17%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_contribution">Aporte Mensal (R$)</Label>
                  <Input
                    id="monthly_contribution"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 500,00"
                    {...register('monthly_contribution', {
                      setValueAs: (v) => {
                        if (v === '' || v === null || typeof v === 'undefined') return 0;
                        if (typeof v === 'number') return v;
                        if (typeof v !== 'string') return v;
                        const normalized = v.replace(/\./g, '').replace(',', '.');
                        const n = parseFloat(normalized);
                        return isNaN(n) ? 0 : n;
                      },
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contribution_day">Dia do Aporte (1-28)</Label>
                  <Input
                    id="contribution_day"
                    type="number"
                    min="1"
                    max="28"
                    placeholder="Ex: 5"
                    {...register('contribution_day', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: NOTIFICAÇÕES */}
            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar em Marcos</Label>
                  <p className="text-sm text-muted-foreground">
                    25%, 50%, 75% e 100% alcançados
                  </p>
                </div>
                <Switch
                  checked={watch('notify_milestones')}
                  onCheckedChange={(checked) => setValue('notify_milestones', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembrete de Aporte</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes no dia do aporte
                  </p>
                </div>
                <Switch
                  checked={watchNotifyContribution}
                  onCheckedChange={(checked) => setValue('notify_contribution', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Rebalanceamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Se não estiver no caminho certo
                  </p>
                </div>
                <Switch
                  checked={watch('notify_rebalancing')}
                  onCheckedChange={(checked) => setValue('notify_rebalancing', checked)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Meta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
