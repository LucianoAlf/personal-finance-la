import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
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
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Loader2,
  Scissors,
} from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import type { CreateTransactionInput } from '@/types/database.types';
import { buildInvestmentTransactionDate } from '@/utils/investments/transaction-date';
import { cn } from '@/lib/utils';

const transactionSchema = z.object({
  investment_id: z.string().min(1, 'Selecione um investimento'),
  transaction_type: z.enum(['buy', 'sell', 'dividend', 'split']),
  quantity: z.coerce.number().optional(),
  price: z.coerce.number().optional(),
  total_value: z.coerce.number().positive('Valor total deve ser positivo'),
  fees: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),
  transaction_date: z.string().min(1, 'Data é obrigatória'),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId?: string;
  onSave: (data: CreateTransactionInput) => Promise<void>;
}

const transactionTypes = [
  {
    value: 'buy',
    label: 'Compra',
    description: 'Adiciona ativos ao seu portfólio',
    icon: ArrowUpRight,
    iconClassName: 'text-emerald-500',
  },
  {
    value: 'sell',
    label: 'Venda',
    description: 'Remove ativos do seu portfólio',
    icon: ArrowDownRight,
    iconClassName: 'text-rose-500',
  },
  {
    value: 'dividend',
    label: 'Dividendo',
    description: 'Recebimento de dividendos',
    icon: Banknote,
    iconClassName: 'text-sky-500',
  },
  {
    value: 'split',
    label: 'Desdobramento',
    description: 'Split ou grupamento de ações',
    icon: Scissors,
    iconClassName: 'text-violet-500',
  },
];

export function TransactionDialog({
  open,
  onOpenChange,
  investmentId,
  onSave,
}: TransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const { investments } = useInvestments();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      investment_id: investmentId || '',
      transaction_type: 'buy',
      quantity: 0,
      price: 0,
      total_value: 0,
      fees: 0,
      tax: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const selectedType = form.watch('transaction_type');
  const quantity = form.watch('quantity') || 0;
  const price = form.watch('price') || 0;
  const fees = form.watch('fees') || 0;
  const tax = form.watch('tax') || 0;

  useEffect(() => {
    if (selectedType === 'buy' || selectedType === 'sell') {
      const subtotal = quantity * price;
      const total =
        selectedType === 'buy' ? subtotal + fees + tax : subtotal - fees - tax;

      form.setValue('total_value', total);
    }
  }, [quantity, price, fees, tax, selectedType, form]);

  useEffect(() => {
    if (open) {
      form.reset({
        investment_id: investmentId || '',
        transaction_type: 'buy',
        quantity: 0,
        price: 0,
        total_value: 0,
        fees: 0,
        tax: 0,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [open, investmentId, form]);

  const handleSubmit = async (data: TransactionFormData) => {
    try {
      setLoading(true);
      const transactionData: CreateTransactionInput = {
        investment_id: data.investment_id,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        price: data.price,
        total_value: data.total_value,
        fees: data.fees,
        tax: data.tax,
        notes: data.notes,
        transaction_date: buildInvestmentTransactionDate(data.transaction_date),
      };
      await onSave(transactionData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = transactionTypes.find((t) => t.value === selectedType);
  const SelectedTypeIcon = selectedTypeInfo?.icon || ArrowUpRight;
  const requiresQuantityAndPrice = ['buy', 'sell', 'split'].includes(selectedType);

  const dialogTitle = 'Nova Transação';

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <ResponsiveDialogHeader
        title={dialogTitle}
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <div className="grid gap-5">
              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Transação</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {transactionTypes.map((type) => {
                          const TypeIcon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <TypeIcon className={cn('h-4 w-4', type.iconClassName)} />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {selectedTypeInfo && (
                      <FormDescription className="text-xs text-muted-foreground">
                        {selectedTypeInfo.description}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investimento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!investmentId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o investimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {investments.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.ticker || inv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {requiresQuantityAndPrice && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço Unitário</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {requiresQuantityAndPrice && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxas</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impostos</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="total_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly={requiresQuantityAndPrice}
                        className={requiresQuantityAndPrice ? 'bg-muted/50' : ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      {requiresQuantityAndPrice
                        ? 'Calculado automaticamente'
                        : 'Valor total da transação'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Transação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTypeInfo && selectedType === 'dividend' && (
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-2">
                      <SelectedTypeIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{selectedTypeInfo.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Recebimento registrado no histórico da carteira.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Anotações sobre esta transação..."
                        className="min-h-[96px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-6 flex gap-3 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="rounded-xl border-border/70 bg-surface/85 hover:bg-surface-elevated"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Transação
              </Button>
            </div>
          </form>
        </Form>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
