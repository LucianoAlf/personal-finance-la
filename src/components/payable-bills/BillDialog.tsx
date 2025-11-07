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
import * as LucideIcons from 'lucide-react';

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
  reminder_enabled: z.boolean().default(true),
  reminder_days_before: z.number().default(3),
});

type BillFormData = z.infer<typeof billSchema>;

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBillInput) => Promise<void>;
  bill?: PayableBill;
}

export function BillDialog({ open, onOpenChange, onSubmit, bill }: BillDialogProps) {
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
      reminder_enabled: true,
      reminder_days_before: 3,
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
        reminder_enabled: bill.reminder_enabled,
        reminder_days_before: bill.reminder_days_before,
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
        reminder_enabled: true,
        reminder_days_before: 3,
      });
    }
  }, [bill, form]);

  const handleSubmit = async (data: BillFormData) => {
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
      reminder_enabled: data.reminder_enabled,
      reminder_days_before: data.reminder_days_before,
    };

    await onSubmit(input);
    onOpenChange(false);
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
                  name="reminder_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativar Lembretes</FormLabel>
                        <FormDescription>
                          Receber notificações antes do vencimento
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('reminder_enabled') && (
                  <FormField
                    control={form.control}
                    name="reminder_days_before"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avisar com Antecedência</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">No dia do vencimento</SelectItem>
                            <SelectItem value="1">1 dia antes</SelectItem>
                            <SelectItem value="3">3 dias antes</SelectItem>
                            <SelectItem value="5">5 dias antes</SelectItem>
                            <SelectItem value="7">7 dias antes</SelectItem>
                            <SelectItem value="15">15 dias antes</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
