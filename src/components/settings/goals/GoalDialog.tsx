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
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Target, X, Trash2, Calendar, AlertCircle, Plane, Home, Car, GraduationCap, DollarSign, Palmtree, Heart, Smartphone, Gamepad2, Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import type { SavingsGoal, CreateGoalInput, UpdateGoalInput, GoalCategory, GoalPriority } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';

const goalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  category: z.enum(['travel', 'house', 'car', 'emergency', 'education', 'retirement', 'general']),
  target_amount: z.number().min(1, 'Valor deve ser maior que R$ 0'),
  current_amount: z.number().min(0).default(0),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  target_date: z.string().min(1, 'Data alvo é obrigatória'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  icon: z.string().optional(),
  notify_milestones: z.boolean().default(true),
  notify_contribution: z.boolean().default(false),
  contribution_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  contribution_day: z.number().min(1).max(28).optional(),
  notify_delay: z.boolean().default(false),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: SavingsGoal | null;
  onSave: (input: CreateGoalInput | UpdateGoalInput) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

const GOAL_ICONS = [
  { icon: Target, label: 'Meta' },
  { icon: Plane, label: 'Viagem' },
  { icon: Home, label: 'Casa' },
  { icon: Car, label: 'Carro' },
  { icon: GraduationCap, label: 'Educação' },
  { icon: DollarSign, label: 'Dinheiro' },
  { icon: Palmtree, label: 'Férias' },
  { icon: Heart, label: 'Casamento' },
  { icon: Smartphone, label: 'Eletrônico' },
  { icon: Gamepad2, label: 'Lazer' },
];

export function GoalDialog({ open, onOpenChange, goal, onSave, onDelete }: GoalDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      category: 'general',
      target_amount: 1000,
      current_amount: 0,
      start_date: new Date().toISOString().split('T')[0],
      target_date: '',
      priority: 'medium',
      icon: 'Target',
      notify_milestones: true,
      notify_contribution: false,
      notify_delay: false,
    },
  });

  const watchCategory = watch('category');
  const watchIcon = watch('icon');
  const watchTargetAmount = watch('target_amount');
  const watchCurrentAmount = watch('current_amount');
  const watchStartDate = watch('start_date');
  const watchTargetDate = watch('target_date');
  const watchNotifyContribution = watch('notify_contribution');

  // Calcular contribuição mensal sugerida
  const suggestedMonthly = (() => {
    if (!watchTargetDate || !watchStartDate) return 0;
    const remaining = watchTargetAmount - watchCurrentAmount;
    const start = new Date(watchStartDate);
    const target = new Date(watchTargetDate);
    const monthsRemaining = Math.max(1, (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return remaining / monthsRemaining;
  })();

  // Preencher form ao editar
  useEffect(() => {
    if (goal) {
      // Garantir valores default para campos obrigatórios
      const today = new Date().toISOString().split('T')[0];
      reset({
        name: goal.name,
        category: goal.category,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        // Se start_date for null/undefined, usar data atual
        start_date: goal.start_date || today,
        // Se target_date for null/undefined, usar deadline ou data futura
        target_date: goal.target_date || (goal as any).deadline || '',
        priority: goal.priority,
        icon: goal.icon || 'Target',
        notify_milestones: goal.notify_milestones,
        notify_contribution: goal.notify_contribution,
        contribution_frequency: goal.contribution_frequency || undefined,
        contribution_day: goal.contribution_day || undefined,
        notify_delay: goal.notify_delay,
      });
    } else {
      reset({
        name: '',
        category: 'general',
        target_amount: 1000,
        current_amount: 0,
        start_date: new Date().toISOString().split('T')[0],
        target_date: '',
        priority: 'medium',
        icon: '🎯',
        notify_milestones: true,
        notify_contribution: false,
        notify_delay: false,
      });
    }
  }, [goal, reset]);

  const onSubmit = async (data: GoalFormData) => {
    setIsSaving(true);
    try {
      const success = await onSave(data);
      if (success) {
        onOpenChange(false);
        reset();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handler de formulário inválido: mostra feedback e navega para a aba com erro
  const onInvalid = (formErrors: FieldErrors<GoalFormData>) => {
    const keys = Object.keys(formErrors);
    if (keys.length === 0) return;

    const basicErrors = ['name', 'category', 'target_amount', 'current_amount', 'icon'];
    const scheduleErrors = ['start_date', 'target_date', 'priority'];
    const notificationErrors = ['notify_milestones', 'notify_contribution', 'contribution_frequency', 'contribution_day', 'notify_delay'];

    const hasBasicError = keys.some((k) => basicErrors.includes(k));
    const hasScheduleError = keys.some((k) => scheduleErrors.includes(k));
    const hasNotificationError = keys.some((k) => notificationErrors.includes(k));

    if (hasBasicError) setActiveTab('basic');
    else if (hasScheduleError) setActiveTab('schedule');
    else if (hasNotificationError) setActiveTab('notifications');

    toast.error('Preencha todos os campos obrigatórios');
  };

  const handleDelete = async () => {
    if (!goal || !onDelete) return;
    if (!confirm('Tem certeza que deseja deletar esta meta?')) return;

    setIsDeleting(true);
    try {
      const success = await onDelete(goal.id);
      if (success) {
        onOpenChange(false);
        reset();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {goal ? 'Editar Meta' : 'Nova Meta de Economia'}
          </DialogTitle>
          <DialogDescription>
            {goal ? 'Atualize as informações da sua meta' : 'Configure sua nova meta de economia'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="relative">
                Básico
                {(errors.name || errors.category || errors.target_amount) && (
                  <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="schedule" className="relative">
                Prazo & Prioridade
                {(errors.start_date || errors.target_date) && (
                  <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
            </TabsList>

            {/* ABA 1: BÁSICO */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Meta *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Viagem para Europa"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select
                  value={watchCategory}
                  onValueChange={(value) => setValue('category', value as GoalCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABELS.goalCategory).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Valor Alvo (R$) *</Label>
                  <Input
                    id="target_amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1.000,00"
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

              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_ICONS.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setValue('icon', item.label)}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          watchIcon === item.label
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={item.label}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: PRAZO & PRIORIDADE */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data Início</Label>
                  <DatePickerInput
                    value={watch('start_date')}
                    onChange={(value) => setValue('start_date', value)}
                    placeholder="Selecione a data de início"
                  />
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

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={watch('priority')}
                  onValueChange={(value) => setValue('priority', value as GoalPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABELS.goalPriority).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {suggestedMonthly > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Contribuição Mensal Sugerida
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    R$ {suggestedMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Para atingir sua meta no prazo
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ABA 3: NOTIFICAÇÕES */}
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
                  <Label>Lembrete de Contribuição</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba lembretes periódicos
                  </p>
                </div>
                <Switch
                  checked={watchNotifyContribution}
                  onCheckedChange={(checked) => setValue('notify_contribution', checked)}
                />
              </div>

              {watchNotifyContribution && (
                <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={watch('contribution_frequency') || 'monthly'}
                      onValueChange={(value) => setValue('contribution_frequency', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LABELS.contributionFrequency).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Dia Preferido (1-28)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      placeholder="5"
                      {...register('contribution_day', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Atraso</Label>
                  <p className="text-sm text-muted-foreground">
                    Se não atingir meta mensal
                  </p>
                </div>
                <Switch
                  checked={watch('notify_delay')}
                  onCheckedChange={(checked) => setValue('notify_delay', checked)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 gap-2">
            {goal && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="mr-auto"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deletando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </>
                )}
              </Button>
            )}
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
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
