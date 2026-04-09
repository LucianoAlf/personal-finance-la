import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCardInvoice, CreditCard } from '@/types/database.types';
import { useInvoices } from '@/hooks/useInvoices';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/utils/formatters';
import { useToast } from '@/hooks/use-toast';

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

const primaryButtonClass =
  'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';

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

  const minimumPayment = invoice.remaining_amount * 0.02;
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

  const availableAccounts = accounts.filter((account) => account.type !== 'credit_card');
  const selectedAccount = availableAccounts.find((account) => account.id === selectedAccountId);
  const hasEnoughBalance = selectedAccount ? selectedAccount.current_balance >= watchAmount : false;
  const balanceAfterPayment = selectedAccount ? selectedAccount.current_balance - watchAmount : 0;

  useEffect(() => {
    if (paymentType === 'total') {
      setValue('amount', totalPayment);
    } else if (paymentType === 'minimum') {
      setValue('amount', minimumPayment);
    }

    setValue('payment_type', paymentType);
  }, [minimumPayment, paymentType, setValue, totalPayment]);

  const onSubmit = async (data: PaymentFormData) => {
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

      if (!result.success) {
        throw new Error(result.error || 'Erro ao registrar pagamento');
      }

      toast({
        title: 'Fatura paga!',
        description: `Pagamento de ${formatCurrency(data.amount)} registrado com sucesso.`,
      });

      onSuccess?.();
      onOpenChange(false);
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

  const paymentTypeCardClass = (type: 'total' | 'minimum' | 'partial') =>
    `rounded-[22px] border p-4 text-left transition-all ${
      paymentType === type
        ? type === 'minimum'
          ? 'border-warning/25 bg-warning/10 shadow-sm'
          : type === 'partial'
            ? 'border-primary/25 bg-primary/10 shadow-sm'
            : 'border-info/25 bg-info/10 shadow-sm'
        : 'border-border/70 bg-surface/75 hover:bg-surface-elevated'
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Pagar Fatura
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
          <div className="rounded-[24px] border border-border/70 bg-surface-elevated/50 p-5 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Fatura</span>
                <span className="font-medium text-foreground">
                  {format(new Date(invoice.reference_month), 'MMMM yyyy', { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Cartão</span>
                <span className="font-medium text-foreground">{card.name}</span>
              </div>
              <div className="flex justify-between gap-4 pt-1">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="text-[1.55rem] font-semibold tracking-tight text-foreground">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
              {invoice.paid_amount > 0 ? (
                <>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Já Pago</span>
                    <span className="font-medium text-success">{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Restante</span>
                    <span className="text-lg font-semibold text-warning">
                      {formatCurrency(invoice.remaining_amount)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-foreground">Tipo de Pagamento *</Label>
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => setPaymentType('total')} className={paymentTypeCardClass('total')}>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Total</p>
                  <p className="mt-1 text-lg font-semibold text-info">{formatCurrency(totalPayment)}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('minimum')}
                className={paymentTypeCardClass('minimum')}
              >
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Mínimo (2%)</p>
                  <p className="mt-1 text-lg font-semibold text-warning">{formatCurrency(minimumPayment)}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('partial')}
                className={paymentTypeCardClass('partial')}
              >
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Parcial</p>
                  <p className="mt-1 text-sm text-muted-foreground">Valor customizado</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-foreground">
              Valor do Pagamento *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              disabled={paymentType !== 'partial'}
              className={`h-11 rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm dark:bg-surface-elevated/70 ${
                errors.amount ? 'border-danger focus-visible:border-danger' : ''
              }`}
            />
            {errors.amount ? <p className="text-sm text-danger">{errors.amount.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date" className="text-foreground">
              Data do Pagamento *
            </Label>
            <DatePickerInput
              value={watch('payment_date')}
              onChange={(value) => setValue('payment_date', value)}
              placeholder="Selecione a data do pagamento"
              disableFuture
              className={errors.payment_date ? 'border-danger focus-visible:border-danger' : ''}
            />
            {errors.payment_date ? <p className="text-sm text-danger">{errors.payment_date.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_id" className="text-foreground">
              Conta de Débito *
            </Label>
            <Select
              onValueChange={(value) => {
                setValue('account_id', value);
                setSelectedAccountId(value);
              }}
            >
              <SelectTrigger
                className={`h-11 rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm dark:bg-surface-elevated/70 ${
                  errors.account_id ? 'border-danger focus-visible:border-danger' : ''
                }`}
              >
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex w-full items-center justify-between gap-4">
                      <span>{account.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(account.current_balance)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id ? <p className="text-sm text-danger">{errors.account_id.message}</p> : null}
          </div>

          {selectedAccount && watchAmount > 0 ? (
            <div
              className={`rounded-[24px] border p-5 shadow-sm ${
                hasEnoughBalance ? 'border-success/20 bg-success/10' : 'border-danger/20 bg-danger/10'
              }`}
            >
              <div className="flex items-start gap-3">
                {hasEnoughBalance ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-danger" />
                )}

                <div className="flex-1 space-y-3">
                  <p className={`font-semibold ${hasEnoughBalance ? 'text-success' : 'text-danger'}`}>
                    {hasEnoughBalance ? 'Saldo suficiente' : 'Saldo insuficiente'}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Saldo atual</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(selectedAccount.current_balance)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Valor do pagamento</span>
                      <span className="font-medium text-danger">- {formatCurrency(watchAmount)}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-border/50 pt-2">
                      <span className="font-semibold text-foreground">Saldo após pagamento</span>
                      <span className={`font-semibold ${balanceAfterPayment >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(balanceAfterPayment)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o pagamento..."
              rows={3}
              {...register('notes')}
              className="min-h-[110px] rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm dark:bg-surface-elevated/70"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !hasEnoughBalance || !selectedAccount}
              className={primaryButtonClass}
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
