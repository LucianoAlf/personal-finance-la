import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreditCardInvoice, CreditCard } from '@/types/database.types';
import { useInvoices } from '@/hooks/useInvoices';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const paymentSchema = z.object({
  payment_type: z.enum(['total', 'minimum', 'partial']),
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
  const [paymentType, setPaymentType] = useState<'total' | 'minimum' | 'partial'>('total');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Calcular valores
  const minimumPayment = invoice.remaining_amount * 0.02; // 2% do total
  const totalPayment = invoice.remaining_amount;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_type: 'total',
      amount: totalPayment,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const watchAmount = watch('amount');

  // Filtrar apenas contas ativas
  const availableAccounts = accounts.filter(
    (acc) => acc.type !== 'credit_card'
  );

  // Buscar conta selecionada
  const selectedAccount = availableAccounts.find(acc => acc.id === selectedAccountId);
  const hasEnoughBalance = selectedAccount ? selectedAccount.current_balance >= watchAmount : false;
  const balanceAfterPayment = selectedAccount ? selectedAccount.current_balance - watchAmount : 0;

  // Atualizar valor quando tipo de pagamento muda
  useEffect(() => {
    if (paymentType === 'total') {
      setValue('amount', totalPayment);
    } else if (paymentType === 'minimum') {
      setValue('amount', minimumPayment);
    }
    setValue('payment_type', paymentType);
  }, [paymentType, totalPayment, minimumPayment, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    // Validações adicionais
    if (!selectedAccount) {
      toast({
        title: 'Erro',
        description: 'Selecione uma conta para débito.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasEnoughBalance) {
      toast({
        title: 'Saldo insuficiente',
        description: `A conta ${selectedAccount.name} não possui saldo suficiente.`,
        variant: 'destructive',
      });
      return;
    }

    if (data.amount > invoice.remaining_amount) {
      toast({
        title: 'Valor inválido',
        description: 'O valor do pagamento não pode ser maior que o saldo restante.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await payInvoice({
        invoice_id: invoice.id,
        account_id: data.account_id,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_type: data.payment_type,
        notes: data.notes,
      });

      if (result.success) {
        toast({
          title: 'Fatura paga!',
          description: `Pagamento de ${formatCurrency(data.amount)} registrado com sucesso.`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Erro ao registrar pagamento');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagar Fatura</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Tipo de Pagamento */}
          <div className="space-y-3">
            <Label>Tipo de Pagamento *</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('total')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'total'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold text-sm">Total</p>
                  <p className="text-lg font-bold text-blue-600 mt-1">
                    {formatCurrency(totalPayment)}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('minimum')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'minimum'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold text-sm">Mínimo (2%)</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">
                    {formatCurrency(minimumPayment)}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('partial')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentType === 'partial'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold text-sm">Parcial</p>
                  <p className="text-sm text-gray-600 mt-1">Valor customizado</p>
                </div>
              </button>
            </div>
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
              disabled={paymentType !== 'partial'}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Data do Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment_date">Data do Pagamento *</Label>
            <DatePickerInput
              value={watch('payment_date')}
              onChange={(value) => setValue('payment_date', value)}
              placeholder="Selecione a data do pagamento"
              disableFuture={true}
              className={errors.payment_date ? 'border-red-500' : ''}
            />
            {errors.payment_date && (
              <p className="text-sm text-red-500">{errors.payment_date.message}</p>
            )}
          </div>

          {/* Conta de Débito */}
          <div className="space-y-2">
            <Label htmlFor="account_id">Conta de Débito *</Label>
            <Select 
              onValueChange={(value) => {
                setValue('account_id', value);
                setSelectedAccountId(value);
              }}
            >
              <SelectTrigger className={errors.account_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{account.name}</span>
                      <span className="ml-2 text-gray-600">
                        {formatCurrency(account.current_balance)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-sm text-red-500">{errors.account_id.message}</p>
            )}
          </div>

          {/* Resumo do Pagamento */}
          {selectedAccount && watchAmount > 0 && (
            <div className={`p-4 rounded-lg border-2 ${
              hasEnoughBalance ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-start gap-2">
                {hasEnoughBalance ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <p className={`font-semibold ${
                    hasEnoughBalance ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {hasEnoughBalance ? 'Saldo suficiente' : 'Saldo insuficiente'}
                  </p>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saldo atual:</span>
                      <span className="font-medium">
                        {formatCurrency(selectedAccount.current_balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valor do pagamento:</span>
                      <span className="font-medium text-red-600">
                        - {formatCurrency(watchAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t">
                      <span className="font-semibold">Saldo após pagamento:</span>
                      <span className={`font-bold ${
                        balanceAfterPayment >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(balanceAfterPayment)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !hasEnoughBalance || !selectedAccount}
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
