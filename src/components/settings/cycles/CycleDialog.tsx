import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar, Settings, Trash2 } from 'lucide-react';
import type { FinancialCycle, CreateCycleInput, UpdateCycleInput, CycleType } from '@/types/settings.types';
import { LABELS } from '@/types/settings.types';

const cycleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  type: z.enum(['salary', 'rent', 'bills', 'investment', 'other']),
  day: z.number().min(1, 'Dia deve ser entre 1 e 28').max(28, 'Dia deve ser entre 1 e 28'),
  active: z.boolean().default(true),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  notify_start: z.boolean().default(false),
  notify_days_before: z.number().min(1).max(7).optional(),
});

type CycleFormData = z.infer<typeof cycleSchema>;

interface CycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: FinancialCycle | null;
  onSave: (input: CreateCycleInput | UpdateCycleInput) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
}

const CYCLE_ICONS = ['💰', '🏠', '📄', '📈', '🔄', '💳', '🎯', '📊'];
const CYCLE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function CycleDialog({ open, onOpenChange, cycle, onSave, onDelete }: CycleDialogProps) {
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
  } = useForm<CycleFormData>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: '',
      type: 'salary',
      day: 5,
      active: true,
      description: '',
      color: CYCLE_COLORS[0],
      icon: '💰',
      notify_start: false,
      notify_days_before: 3,
    },
  });

  const watchType = watch('type');
  const watchIcon = watch('icon');
  const watchColor = watch('color');
  const watchNotifyStart = watch('notify_start');

  // Preencher form ao editar
  useEffect(() => {
    if (cycle) {
      reset({
        name: cycle.name,
        type: cycle.type,
        day: cycle.day,
        active: cycle.active,
        description: cycle.description || '',
        color: cycle.color || CYCLE_COLORS[0],
        icon: cycle.icon || '💰',
        notify_start: cycle.notify_start,
        notify_days_before: cycle.notify_days_before || 3,
      });
    } else {
      reset({
        name: '',
        type: 'salary',
        day: 5,
        active: true,
        description: '',
        color: CYCLE_COLORS[0],
        icon: '💰',
        notify_start: false,
        notify_days_before: 3,
      });
    }
  }, [cycle, reset]);

  const onSubmit = async (data: CycleFormData) => {
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

  const handleDelete = async () => {
    if (!cycle || !onDelete) return;
    if (!confirm('Tem certeza que deseja deletar este ciclo?')) return;

    setIsDeleting(true);
    try {
      const success = await onDelete(cycle.id);
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
            <Calendar className="h-5 w-5" />
            {cycle ? 'Editar Ciclo Financeiro' : 'Novo Ciclo Financeiro'}
          </DialogTitle>
          <DialogDescription>
            {cycle
              ? 'Atualize as informações do seu ciclo'
              : 'Configure um novo ciclo financeiro (salário, aluguel, etc.)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="advanced">Configurações Avançadas</TabsTrigger>
            </TabsList>

            {/* ABA 1: INFORMAÇÕES BÁSICAS */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Ciclo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Salário, Aluguel, Contas Mensais"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={watchType}
                  onValueChange={(value) => setValue('type', value as CycleType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LABELS.cycleType).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="day">Dia do Mês (1-28) *</Label>
                <Input
                  id="day"
                  type="number"
                  min="1"
                  max="28"
                  {...register('day', { valueAsNumber: true })}
                />
                {errors.day && (
                  <p className="text-sm text-red-600">{errors.day.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Dia que este ciclo se repete todo mês
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Adicione uma descrição..."
                  rows={3}
                  {...register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex gap-2 flex-wrap">
                  {CYCLE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setValue('icon', icon)}
                      className={`text-2xl p-2 rounded-lg border-2 transition-colors ${
                        watchIcon === icon
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {CYCLE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('color', color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        watchColor === color
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-gray-200 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CONFIGURAÇÕES AVANÇADAS */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ciclo Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Desative para pausar este ciclo temporariamente
                  </p>
                </div>
                <Switch
                  checked={watch('active')}
                  onCheckedChange={(checked) => setValue('active', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificar Início do Ciclo</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba um lembrete quando o ciclo iniciar
                  </p>
                </div>
                <Switch
                  checked={watchNotifyStart}
                  onCheckedChange={(checked) => setValue('notify_start', checked)}
                />
              </div>

              {watchNotifyStart && (
                <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                  <Label>Dias de Antecedência (1-7)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    {...register('notify_days_before', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Você será notificado X dias antes do ciclo iniciar
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Dica
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Ciclos financeiros ajudam você a organizar suas finanças por períodos. Por
                  exemplo, um ciclo de "Salário" no dia 5 indica quando você recebe e pode
                  planejar seus gastos até o próximo ciclo.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 gap-2">
            {cycle && onDelete && (
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
