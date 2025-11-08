import { useEffect } from 'react';
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
import { TagSelector } from './TagSelector';
import { Plus, X, MessageCircle, Mail, Bell, Calendar, Send, ClipboardList } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const billSchema = z.object({
  description: z.string().min(3, 'Mínimo 3 caracteres'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  bill_type: z.string().min(1, 'Tipo obrigatório'),
  provider_name: z.string().optional(),
  category_id: z.string().optional(),
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
  onSubmit: (data: CreateBillInput) => Promise<void>;
  bill?: PayableBill;
}

export function BillDialog({ open, onOpenChange, onSubmit, bill }: BillDialogProps) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const isEditing = !!bill;

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      description: '',
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      bill_type: 'other',
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

  useEffect(() => {
    if (bill) {
      form.reset({
        description: bill.description,
        amount: bill.amount,
        due_date: bill.due_date,
        bill_type: bill.bill_type,
        provider_name: bill.provider_name || '',
        category_id: bill.category_id || '',
        tags: bill.tags || [],
        payment_account_id: bill.payment_account_id || '',
        payment_method: bill.payment_method || '',
        barcode: bill.barcode || '',
        qr_code_pix: bill.qr_code_pix || '',
        reference_number: bill.reference_number || '',
        priority: bill.priority,
        notes: bill.notes || '',
        is_recurring: bill.is_recurring,
        recurrence_frequency: bill.recurrence_config?.frequency || '',
        recurrence_day: bill.recurrence_config?.day,
        recurrence_end_date: bill.recurrence_config?.end_date || '',
        is_installment: bill.is_installment,
        installment_total: bill.installment_total,
        enable_reminders: bill.reminders && bill.reminders.length > 0 ? true : false,
        reminders: bill.reminders && bill.reminders.length > 0 
          ? bill.reminders.map(r => ({ days_before: r.days_before, time: r.time }))
          : [{ days_before: 1, time: '09:00' }],
        reminder_channels: bill.reminder_channels && bill.reminder_channels.length > 0
          ? bill.reminder_channels as ('whatsapp' | 'email' | 'push')[]
          : ['whatsapp'],
      });
    } else {
      form.reset({
        description: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        bill_type: 'other',
        priority: 'medium',
        is_recurring: false,
        is_installment: false,
        enable_reminders: false,
        reminders: [{ days_before: 1, time: '09:00' }],
        reminder_channels: ['whatsapp'],
      });
    }
  }, [bill, form]);

  const handleSubmit = async (data: BillFormData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const input: CreateBillInput = {
        description: data.description,
        amount: data.amount,
        due_date: data.due_date,
        bill_type: data.bill_type as BillType,
        provider_name: data.provider_name,
        category_id: data.category_id,
        payment_account_id: data.payment_account_id,
        payment_method: data.payment_method as PaymentMethod,
        barcode: data.barcode,
        qr_code_pix: data.qr_code_pix,
        reference_number: data.reference_number,
        priority: data.priority as Priority,
        notes: data.notes,
        is_recurring: data.is_recurring,
        recurrence_config: data.is_recurring
          ? {
              frequency: data.recurrence_frequency as any,
              day: data.recurrence_day || 1,
              end_date: data.recurrence_end_date,
            }
          : undefined,
        is_installment: data.is_installment,
        installment_total: data.installment_total,
        tags: data.tags,
      };

      // Salvar a conta
      await onSubmit(input);

      // Se lembretes estão habilitados e temos bill.id (edição ou após criar)
      // Precisamos pegar o bill_id retornado pelo onSubmit
      // Por enquanto, vamos assumir que onSubmit vai retornar o ID ou que bill já tem
      if (data.enable_reminders && data.reminders && data.reminders.length > 0) {
        const billId = bill?.id; // Se estamos editando
        
        if (billId) {
          // Chamar SQL function schedule_bill_reminders
          const { data: reminderCount, error: reminderError } = await supabase.rpc(
            'schedule_bill_reminders',
            {
              p_bill_id: billId,
              p_user_id: user.id,
              p_days_before: data.reminders.map(r => r.days_before),
              p_times: data.reminders.map(r => r.time + ':00'), // Converter HH:MM para HH:MM:SS
              p_channels: data.reminder_channels || ['whatsapp']
            }
          );

          if (reminderError) {
            console.error('Erro ao agendar lembretes:', reminderError);
            toast.error('Conta salva, mas erro ao agendar lembretes: ' + reminderError.message);
          } else {
            const totalReminders = reminderCount || 0;
            toast.success(
              `Conta salva com sucesso! ${totalReminders} lembrete${totalReminders !== 1 ? 's' : ''} agendado${totalReminders !== 1 ? 's' : ''}.`,
              {
                description: `Via ${data.reminder_channels?.join(', ') || 'WhatsApp'}`
              }
            );
          }
        } else {
          // Nova conta - precisamos do ID retornado
          // Nota: Isso requer que onSubmit retorne o ID criado
          toast.success('Conta criada! Para agendar lembretes, edite a conta novamente.');
        }
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar conta:', error);
      toast.error('Erro ao salvar conta: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Conta' : 'Nova Conta a Pagar'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-1">
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
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
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                          <DatePicker value={field.value} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bill_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo*</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(BILL_TYPE_LABELS).map(([key, label]) => (
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

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => {
                            const Icon = (LucideIcons as any)[cat.icon] || LucideIcons.Tag;
                            return (
                              <SelectItem key={cat.id} value={cat.id}>
                                <span className="inline-flex items-center gap-2">
                                  <Icon className="h-4 w-4" style={{ color: cat.color }} />
                                  {cat.name}
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
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.icon} {acc.name}
                              </SelectItem>
                            ))}
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
                            {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recurrence_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dia do Mês</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                placeholder="1-31"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
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
                            <Input type="date" {...field} />
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
                            Cada parcela terá o valor informado acima
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
                                      <Input
                                        type="time"
                                        value={reminder.time}
                                        onChange={(e) => updateReminder(index, 'time', e.target.value)}
                                        className="w-28"
                                      />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {isEditing ? 'Salvar' : 'Criar Conta'}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
