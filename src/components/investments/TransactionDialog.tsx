import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import type { CreateTransactionInput } from '@/types/database.types';
import { buildInvestmentTransactionDate } from '@/utils/investments/transaction-date';

// Schema de validação
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
    icon: '+',
  },
  {
    value: 'sell',
    label: 'Venda',
    description: 'Remove ativos do seu portfólio',
    icon: '-',
  },
  {
    value: 'dividend',
    label: 'Dividendo',
    description: 'Recebimento de dividendos',
    icon: '💰',
  },
  {
    value: 'split',
    label: 'Desdobramento',
    description: 'Split/Grupamento de ações',
    icon: '⚡',
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

  // Auto-calculate total_value for buy/sell
  useEffect(() => {
    if (selectedType === 'buy' || selectedType === 'sell') {
      const subtotal = quantity * price;
      const total = selectedType === 'buy'
        ? subtotal + fees + tax
        : subtotal - fees - tax;
      
      form.setValue('total_value', total);
    }
  }, [quantity, price, fees, tax, selectedType, form]);

  // Reset form when opening
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

  const selectedTypeInfo = transactionTypes.find(t => t.value === selectedType);
  const requiresQuantityAndPrice = ['buy', 'sell', 'split'].includes(selectedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Transação</DialogTitle>
          <DialogDescription>
            Registre uma nova movimentação no seu portfólio
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Tipo de Transação */}
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
                      {transactionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTypeInfo && (
                    <FormDescription>{selectedTypeInfo.description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Investimento */}
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

            {/* Quantidade e Preço (condicional) */}
            {requiresQuantityAndPrice && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
                        <FormLabel>Preço Unit.</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
              </>
            )}

            {/* Valor Total */}
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
                      className={requiresQuantityAndPrice ? 'bg-muted' : ''}
                    />
                  </FormControl>
                  <FormDescription>
                    {requiresQuantityAndPrice
                      ? 'Calculado automaticamente'
                      : 'Valor total da transação'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data */}
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

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre esta transação..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
                Registrar Transação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
