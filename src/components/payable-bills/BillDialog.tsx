import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { PayableBill, CreateBillInput, BillType, Priority, PaymentMethod } from '@/types/payable-bills.types';
import { BILL_TYPE_LABELS, PRIORITY_LABELS, PAYMENT_METHOD_LABELS } from '@/types/payable-bills.types';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { ACCOUNT_ICONS } from '@/constants/accounts';
import { TagSelector } from './TagSelector';
import { 
  Plus, X, MessageCircle, Mail, Bell, Calendar, Send, ClipboardList,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/ui/category-select';
import { BILL_TYPE_TO_CATEGORY } from '@/utils/billCalculations';
import { getPayableBillTagIds } from '@/utils/payableBillTags';

const billSchema = z.object({
  description: z.string().min(3, 'Mínimo 3 caracteres'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  bill_type: z.string().min(1, 'Tipo obrigatório'),
  provider_name: z.string().optional(),
  category_id: z.string().min(1, 'Categoria obrigatória'),
  tags: z.array(z.string()).optional(),
  payment_account_id: z.string().optional(),
  payment_method: z.string().optional(),
  barcode: z.string().optional(),
  qr_code_pix: z.string().optional(),
  reference_number: z.string().optional(),
  priority: z.string().default('medium'),
  notes: z.string().optional(),
  // Recorrência
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.string().optional(),
  recurrence_day: z.number().optional(),
  recurrence_end_date: z.string().optional(),
  // Parcelamento
  is_installment: z.boolean().default(false),
  installment_total: z.number().optional(),
  // Lembretes
  enable_reminders: z.boolean().default(false),
  reminders: z.array(z.object({
    days_before: z.number().min(0).max(30),
    time: z.string().regex(/^\d{2}:\d{2}$/)
  })).default([{ days_before: 1, time: '09:00' }]),
  reminder_channels: z.array(z.enum(['whatsapp', 'email', 'push'])).default(['whatsapp'])
});

type BillFormData = z.infer<typeof billSchema>;

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBillInput) => Promise<PayableBill | PayableBill[] | void | null>;
  bill?: PayableBill;
}

const CATEGORY_NAME_TO_BILL_TYPE: Record<string, BillType> = {
  'Contas de Consumo': 'service',
  'Assinaturas': 'subscription',
  'Moradia': 'housing',
  'Educação': 'education',
  'Saúde': 'healthcare',
  'Seguros': 'insurance',
  'Empréstimo': 'loan',
  'Financiamento': 'installment',
  'Cartão de Crédito': 'credit_card',
  'Impostos': 'tax',
  'Alimentação': 'food',
  'Outros': 'other',
  'Compras': 'other',
  'Mercado': 'food',
  'Restaurante': 'food',
  'Delivery': 'food',
  'Farmácia': 'healthcare',
  'Transporte': 'service',
  'Combustível': 'service',
  'Reparos e Manutenções': 'service',
  'Viagem': 'other',
  'Lazer': 'other',
  'Beleza': 'other',
  'Pet': 'other',
  'Filhos': 'other',
  'Presentes': 'other',
  'Estacionamento': 'service',
  'Transferência entre Contas': 'other',
  'Vestuário': 'other',
};

function mapCategoryNameToBillType(categoryName?: string): BillType {
  if (!categoryName) return 'other';
  return CATEGORY_NAME_TO_BILL_TYPE[categoryName] ?? 'other';
}

function buildReminderPayload(
  reminders: { days_before: number; time: string }[],
  channels: ('whatsapp' | 'email' | 'push')[]
) {
  return reminders.flatMap((reminder) =>
    channels.map((channel) => ({
      days_before: reminder.days_before,
      time: `${reminder.time}:00`,
      channel,
    }))
  );
}

const REMINDER_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, '0')
);

const REMINDER_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  (index * 5).toString().padStart(2, '0')
);

const PAYABLE_BILL_PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).filter(
  ([key]) => key !== 'credit_card'
);

export function BillDialog({ open, onOpenChange, onSubmit, bill }: BillDialogProps) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const isEditing = !!bill;
  const [activeTab, setActiveTab] = useState('basic');
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  );

  const normalizeTime = (time?: string) => {
    if (!time) return '09:00';
    return time.slice(0, 5);
  };

  const normalizeReminderChannels = (channels?: string[]): ('whatsapp' | 'email' | 'push')[] => {
    const allowed = ['whatsapp', 'email', 'push'] as const;
    const normalized = (channels || [])
      .map((c) => (c === 'app' ? 'whatsapp' : c))
      .filter((c): c is 'whatsapp' | 'email' | 'push' => allowed.includes(c as any));

    return normalized.length > 0 ? [...new Set(normalized)] : ['whatsapp'];
  };

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      description: '',
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      bill_type: 'other',
      category_id: '',
      payment_account_id: '',
      payment_method: '',
      priority: 'medium',
      is_recurring: false,
      is_installment: false,
      enable_reminders: false,
      reminders: [{ days_before: 1, time: '09:00' }],
      reminder_channels: ['whatsapp'],
    },
  });

  const isRecurring = form.watch('is_recurring');
  const isInstallment = form.watch('is_installment');
  const selectedCategoryId = form.watch('category_id');
  const selectedDueDate = form.watch('due_date');

  useEffect(() => {
    const selectedCategory = expenseCategories.find((category) => category.id === selectedCategoryId);
    if (!selectedCategory) return;

    const nextBillType = mapCategoryNameToBillType(selectedCategory.name);
    if (form.getValues('bill_type') !== nextBillType) {
      form.setValue('bill_type', nextBillType, { shouldDirty: true });
    }
  }, [expenseCategories, form, selectedCategoryId]);

  useEffect(() => {
    if (!isRecurring || !selectedDueDate) return;

    const dueDay = Number.parseInt(selectedDueDate.slice(8, 10), 10);
    if (!Number.isNaN(dueDay) && form.getValues('recurrence_day') !== dueDay) {
      form.setValue('recurrence_day', dueDay, { shouldDirty: true });
    }
  }, [form, isRecurring, selectedDueDate]);

  useEffect(() => {
    if (bill) {
      const fallbackCategory = expenseCategories.find(
        (category) => category.name === BILL_TYPE_TO_CATEGORY[bill.bill_type]
      );
      form.reset({
        description: bill.description,
        amount: bill.amount,
        due_date: bill.due_date,
        bill_type: bill.bill_type,
        provider_name: bill.provider_name || '',
        category_id: bill.category_id || fallbackCategory?.id || '',
        tags: getPayableBillTagIds(bill.tags),
        payment_account_id: bill.payment_account_id || '',
        payment_method: bill.payment_method || '',
        barcode: bill.barcode || '',
        qr_code_pix: bill.qr_code_pix || '',
        reference_number: bill.reference_number || '',
        priority: bill.priority,
        notes: bill.notes || '',
        is_recurring: bill.is_recurring,
        recurrence_frequency: bill.recurrence_config?.frequency || '',
        recurrence_day: bill.recurrence_config?.day || Number.parseInt(bill.due_date.slice(8, 10), 10),
        recurrence_end_date: bill.recurrence_config?.end_date || '',
        is_installment: bill.is_installment,
        installment_total: bill.installment_total ?? undefined,
        enable_reminders: bill.reminders && bill.reminders.length > 0 ? true : false,
        reminders: bill.reminders && bill.reminders.length > 0 
          ? bill.reminders.map(r => ({ days_before: r.days_before, time: normalizeTime(r.time) }))
          : [{ days_before: 1, time: '09:00' }],
        reminder_channels: normalizeReminderChannels(bill.reminder_channels),
      });
    } else {
      form.reset({
        description: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        bill_type: 'other',
        category_id: '',
        payment_account_id: '',
        payment_method: '',
        priority: 'medium',
        is_recurring: false,
        recurrence_frequency: 'monthly',
        is_installment: false,
        enable_reminders: false,
        reminders: [{ days_before: 1, time: '09:00' }],
        reminder_channels: ['whatsapp'],
      });
    }
  }, [bill, expenseCategories, form, open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('basic');
  }, [open]);

  const handleInvalidSubmit = (errors: unknown) => {
    console.error('Erros de validação ao salvar conta:', errors);
    toast.error('Existem campos inválidos. Confira as abas e os campos obrigatórios.');
  };

  const handleSubmit = async (data: BillFormData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const selectedCategory = expenseCategories.find((category) => category.id === data.category_id);
      const derivedBillType = mapCategoryNameToBillType(selectedCategory?.name);

      const input: CreateBillInput = {
        description: data.description,
        amount: data.amount,
        due_date: data.due_date,
        bill_type: derivedBillType,
        provider_name: data.provider_name || undefined,
        category_id: data.category_id,
        payment_account_id: data.payment_account_id || undefined,
        payment_method: (data.payment_method || undefined) as PaymentMethod | undefined,
        barcode: data.barcode || undefined,
        qr_code_pix: data.qr_code_pix || undefined,
        reference_number: data.reference_number || undefined,
        priority: data.priority as Priority,
        notes: data.notes || undefined,
        is_recurring: data.is_recurring && !!data.recurrence_frequency,
        recurrence_config: data.is_recurring && data.recurrence_frequency
          ? {
              frequency: data.recurrence_frequency as any,
              day: data.recurrence_day || Number.parseInt(data.due_date.slice(8, 10), 10) || 1,
              end_date: data.recurrence_end_date || undefined,
            }
          : undefined,
        is_installment: data.is_installment,
        installment_total: data.installment_total,
        reminder_enabled: data.enable_reminders,
        reminder_days_before: data.reminders?.[0]?.days_before ?? 1,
        reminder_channels: data.reminder_channels,
        tags: data.tags,
      };

      // Salvar a conta
      const result = await onSubmit(input);

      const savedBill: PayableBill | null = Array.isArray(result)
        ? result[0] ?? null
        : result && typeof result === 'object' && 'id' in result
        ? result
        : null;
      const billId = savedBill?.id || bill?.id;

      let reminderToastShown = false;
      if (data.enable_reminders && data.reminders && data.reminders.length > 0) {
        if (billId) {
          const reminderPayload = buildReminderPayload(
            (data.reminders || []).filter(
              (reminder): reminder is { days_before: number; time: string } =>
                typeof reminder?.days_before === 'number' && typeof reminder?.time === 'string'
            ),
            data.reminder_channels || ['whatsapp']
          );

          const { error: reminderError } = await supabase.rpc(
            'schedule_bill_reminders',
            {
              p_bill_id: billId,
              p_user_id: user.id,
              p_reminders: reminderPayload,
            }
          );

          if (reminderError) {
            console.error('Erro ao agendar lembretes:', reminderError);
            toast.error('Conta salva, mas erro ao agendar lembretes: ' + reminderError.message);
          } else {
            const totalReminders = reminderPayload.length;
            toast.success(
              `Conta salva com sucesso! ${totalReminders} lembrete${totalReminders !== 1 ? 's' : ''} agendado${totalReminders !== 1 ? 's' : ''}.`,
              {
                description: `Via ${data.reminder_channels?.join(', ') || 'WhatsApp'}`
              }
            );
            reminderToastShown = true;
          }
        }
      }

      if (!reminderToastShown) {
        toast.success(isEditing ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!');
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      toast.error('Erro ao salvar conta: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-[1.7rem] border-border/70 bg-background/98 shadow-[0_30px_78px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Conta' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="flex min-h-0 flex-1 flex-col gap-6">
            <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-4 rounded-[1.2rem] border border-border/70 bg-card/95 p-1 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.24)]">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="payment">Pagamento</TabsTrigger>
                <TabsTrigger value="options">Opções</TabsTrigger>
                <TabsTrigger value="reminders">Lembretes</TabsTrigger>
              </TabsList>

              {/* ABA 1: BÁSICO */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição*</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Conta de Luz - Janeiro/2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor*</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vencimento*</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            disableFuture={false}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria*</FormLabel>
                        <FormControl>
                          <CategorySelect
                            type="expense"
                            value={field.value}
                            onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
                            placeholder="Selecione uma categoria"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="provider_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Cemig, Copasa, TIM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </TabsContent>

              {/* ABA 2: PAGAMENTO */}
              <TabsContent value="payment" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payment_account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((acc) => {
                              const IconComponent = ACCOUNT_ICONS[acc.icon as keyof typeof ACCOUNT_ICONS] || ACCOUNT_ICONS.checking;
                              return (
                                <SelectItem key={acc.id} value={acc.id}>
                                  <span className="inline-flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" style={{ color: acc.color }} />
                                    {acc.name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYABLE_BILL_PAYMENT_METHOD_OPTIONS.map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Compras no cartão devem ser registradas no módulo `Cartões - Nova Compra`.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Barras (Boleto)</FormLabel>
                      <FormControl>
                        <Input placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="qr_code_pix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIX Copia e Cola</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Cole aqui o código PIX..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Referência</FormLabel>
                      <FormControl>
                        <Input placeholder="Contrato, matrícula, protocolo..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ABA 3: OPÇÕES */}
              <TabsContent value="options" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Conta Recorrente</FormLabel>
                        <FormDescription>
                          Gerar automaticamente nos próximos meses
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isRecurring && (
                  <div className="space-y-4 pl-4 border-l-2">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recurrence_frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Frequência</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Mensal</SelectItem>
                                <SelectItem value="bimonthly">Bimestral</SelectItem>
                                <SelectItem value="quarterly">Trimestral</SelectItem>
                                <SelectItem value="semiannual">Semestral</SelectItem>
                                <SelectItem value="yearly">Anual</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              O dia da recorrência segue o vencimento escolhido na aba Básico.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurrence_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dia do Vencimento</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                placeholder="1-31"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                disabled
                              />
                            </FormControl>
                            <FormDescription>
                              Ajuste a data de vencimento para mudar este dia.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="recurrence_end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Final (Opcional)</FormLabel>
                          <FormControl>
                            <DatePickerInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Selecione a data final"
                            />
                          </FormControl>
                          <FormDescription>
                            Deixe em branco para recorrência infinita
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="is_installment"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Parcelamento</FormLabel>
                        <FormDescription>
                          Dividir em várias parcelas mensais
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isInstallment && (
                  <div className="pl-4 border-l-2">
                    <FormField
                      control={form.control}
                      name="installment_total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="2"
                              max="60"
                              placeholder="Ex: 12"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Use para financiamentos, carnês e outras obrigações parceladas. O valor acima representa o valor de cada parcela.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Anotações adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagSelector
                          selectedTags={field.value || []}
                          onChange={field.onChange}
                          persistenceHint="As tags são salvas em bill_tags (vínculo canônico com esta conta a pagar)."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* ABA 4: LEMBRETES */}
              <TabsContent value="reminders" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="enable_reminders"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Ativar Lembretes
                        </FormLabel>
                        <FormDescription>
                          Receber notificações via WhatsApp antes do vencimento
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('enable_reminders') && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    
                    {/* Seção: Quando Avisar */}
                    <div>
                      <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Quando avisar?
                      </Label>
                      
                      <FormField
                        control={form.control}
                        name="reminders"
                        render={({ field }) => {
                          const reminders = field.value || [{ days_before: 1, time: '09:00' }];
                          
                          const addReminder = () => {
                            field.onChange([...reminders, { days_before: 0, time: '09:00' }]);
                          };
                          
                          const removeReminder = (index: number) => {
                            if (reminders.length > 1) {
                              field.onChange(reminders.filter((_, i) => i !== index));
                            }
                          };
                          
                          const updateReminder = (index: number, key: string, value: any) => {
                            const updated = [...reminders];
                            updated[index] = { ...updated[index], [key]: value };
                            field.onChange(updated);
                          };
                          
                          return (
                            <FormItem>
                              <div className="space-y-2">
                                {reminders.map((reminder, index) => (
                                  <div key={index} className="flex gap-2 items-center">
                                    <Select
                                      value={reminder.days_before.toString()}
                                      onValueChange={(v) => updateReminder(index, 'days_before', parseInt(v))}
                                    >
                                      <SelectTrigger className="w-36">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0">No dia</SelectItem>
                                        <SelectItem value="1">1 dia antes</SelectItem>
                                        <SelectItem value="3">3 dias antes</SelectItem>
                                        <SelectItem value="5">5 dias antes</SelectItem>
                                        <SelectItem value="7">7 dias antes</SelectItem>
                                        <SelectItem value="15">15 dias antes</SelectItem>
                                        <SelectItem value="30">30 dias antes</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">às</span>
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={reminder.time.split(':')[0] || '09'}
                                          onValueChange={(hour) => {
                                            const minute = reminder.time.split(':')[1] || '00';
                                            updateReminder(index, 'time', `${hour}:${minute}`);
                                          }}
                                        >
                                          <SelectTrigger className="w-20">
                                            <SelectValue placeholder="Hora" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {REMINDER_HOUR_OPTIONS.map((hour) => (
                                              <SelectItem key={hour} value={hour}>
                                                {hour}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <span className="text-sm text-muted-foreground">:</span>

                                        <Select
                                          value={reminder.time.split(':')[1] || '00'}
                                          onValueChange={(minute) => {
                                            const hour = reminder.time.split(':')[0] || '09';
                                            updateReminder(index, 'time', `${hour}:${minute}`);
                                          }}
                                        >
                                          <SelectTrigger className="w-20">
                                            <SelectValue placeholder="Min" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {REMINDER_MINUTE_OPTIONS.map((minute) => (
                                              <SelectItem key={minute} value={minute}>
                                                {minute}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeReminder(index)}
                                      disabled={reminders.length === 1}
                                      className="h-9 w-9 p-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addReminder}
                                  className="w-full"
                                  disabled={reminders.length >= 5}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Adicionar Lembrete {reminders.length >= 5 && '(máximo 5)'}
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Seção: Como Enviar */}
                    <div>
                      <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Como enviar?
                      </Label>
                      
                      <FormField
                        control={form.control}
                        name="reminder_channels"
                        render={({ field }) => {
                          const channels = field.value || ['whatsapp'];
                          
                          const toggleChannel = (channel: 'whatsapp' | 'email' | 'push') => {
                            const updated = channels.includes(channel)
                              ? channels.filter(c => c !== channel)
                              : [...channels, channel];
                            field.onChange(updated);
                          };
                          
                          return (
                            <FormItem>
                              <div className="space-y-2">
                                <div
                                  className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                                  onClick={() => toggleChannel('whatsapp')}
                                >
                                  <input
                                    type="checkbox"
                                    checked={channels.includes('whatsapp')}
                                    onChange={() => toggleChannel('whatsapp')}
                                    className="h-4 w-4"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                      <MessageCircle className="h-4 w-4 text-green-600" />
                                      WhatsApp (Ana Clara)
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Mensagem personalizada via WhatsApp Business
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 cursor-not-allowed opacity-60"
                                >
                                  <input
                                    type="checkbox"
                                    disabled
                                    className="h-4 w-4"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                      <Mail className="h-4 w-4" />
                                      E-mail
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Em breve! Disponível na Fase 3
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 cursor-not-allowed opacity-60"
                                >
                                  <input
                                    type="checkbox"
                                    disabled
                                    className="h-4 w-4"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 font-medium text-sm">
                                      <Bell className="h-4 w-4" />
                                      Push Notification
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Em breve! Disponível na Fase 3
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Preview dos lembretes */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-semibold mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Resumo dos lembretes:
                      </p>
                      <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-200">
                        {form.watch('reminders')?.map((r, i) => (
                          <li key={i}>
                            • {r.days_before === 0 ? 'No dia' : `${r.days_before} dia${r.days_before !== 1 ? 's' : ''} antes`} às {r.time} via {form.watch('reminder_channels')?.join(', ') || 'WhatsApp'}
                          </li>
                        ))}
                        <li className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
                          <strong>Total:</strong> {(form.watch('reminders')?.length || 1) * (form.watch('reminder_channels')?.length || 1)} lembrete(s)
                        </li>
                      </ul>
                    </div>

                  </div>
                )}
              </TabsContent>
            </Tabs>
            </div>
            <DialogFooter className="border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-border/70 bg-surface/85 hover:bg-surface-elevated"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar' : 'Criar Conta')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
