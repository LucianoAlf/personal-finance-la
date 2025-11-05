import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCardInvoice, CreditCard } from '@/types/database.types';
import { useInvoices } from '@/hooks/useInvoices';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  payment_date: z.string().min(1, 'Selecione a data'),
  account_id: z.string().uuid('Selecione uma conta'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface InvoicePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: CreditCardInvoice;
  card: CreditCard;
  onSuccess?: () => void;
}

export function InvoicePaymentDialog({
  open,
  onOpenChange,
  invoice,
  card,
  onSuccess,
}: InvoicePaymentDialogProps) {
  const { payInvoice } = useInvoices();
  const { accounts } = useAccounts();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: invoice.remaining_amount || invoice.total_amount,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  // Filtrar apenas contas ativas (não cartões de crédito)
  const availableAccounts = accounts.filter(
    (acc) => acc.is_active && acc.type !== 'credit_card'
  );

  const onSubmit = async (data: PaymentFormData) => {
    setLoading(true);

    try {
      const success = await payInvoice(
        invoice.id,
        data.amount,
        new Date(data.payment_date),
        data.account_id,
        data.notes
      );

      if (success) {
        toast({
          title: 'Fatura paga!',
          description: 'O pagamento foi registrado com sucesso.',
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error('Erro ao registrar pagamento');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao pagar a fatura.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Informações da Fatura */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fatura:</span>
              <span className="font-medium">
                {format(new Date(invoice.reference_month), 'MMMM yyyy', { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cartão:</span>
              <span className="font-medium">{card.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Valor Total:</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
            {invoice.paid_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Já Pago:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(invoice.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Restante:</span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(invoice.remaining_amount)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Valor do Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Pagamento *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Data do Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment_date">Data do Pagamento *</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
              className={errors.payment_date ? 'border-red-500' : ''}
            />
            {errors.payment_date && (
              <p className="text-sm text-red-500">{errors.payment_date.message}</p>
            )}
          </div>

          {/* Conta de Débito */}
          <div className="space-y-2">
            <Label htmlFor="account_id">Conta de Débito *</Label>
            <Select onValueChange={(value) => setValue('account_id', value)}>
              <SelectTrigger className={errors.account_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} - {formatCurrency(account.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-sm text-red-500">{errors.account_id.message}</p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o pagamento..."
              rows={3}
              {...register('notes')}
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
