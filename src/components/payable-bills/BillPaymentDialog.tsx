import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { PayableBill, MarkBillAsPaidInput, PaymentMethod } from '@/types/payable-bills.types';
import { PAYMENT_METHOD_LABELS } from '@/types/payable-bills.types';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, getRemainingAmount } from '@/utils/billCalculations';
import { CheckCircle2 } from 'lucide-react';

const paymentSchema = z.object({
  paid_amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  payment_method: z.string().min(1, 'Forma de pagamento obrigatória'),
  account_from_id: z.string().optional(),
  confirmation_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface BillPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MarkBillAsPaidInput) => Promise<void>;
  bill: PayableBill | null;
}

export function BillPaymentDialog({
  open,
  onOpenChange,
  onSubmit,
  bill,
}: BillPaymentDialogProps) {
  const { accounts } = useAccounts();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paid_amount: bill ? getRemainingAmount(bill) : 0,
      payment_method: 'pix',
    },
  });

  if (!bill) return null;

  const remaining = getRemainingAmount(bill);
  const isPaid = bill.status === 'paid';

  const handleSubmit = async (data: PaymentFormData) => {
    const input: MarkBillAsPaidInput = {
      bill_id: bill.id,
      paid_amount: data.paid_amount,
      payment_method: data.payment_method as PaymentMethod,
      account_from_id: data.account_from_id,
      confirmation_number: data.confirmation_number,
      notes: data.notes,
    };

    await onSubmit(input);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            {bill.description}
            {bill.provider_name && ` - ${bill.provider_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da Conta */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold">{formatCurrency(bill.amount)}</span>
            </div>
            {bill.paid_amount && bill.paid_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Já Pago:</span>
                <span className="text-green-600 font-semibold">
                  {formatCurrency(bill.paid_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground font-semibold">Restante:</span>
              <span className="font-bold text-lg">
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {!isPaid && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="paid_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Pagamento total ou parcial
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento*</FormLabel>
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

                <FormField
                  control={form.control}
                  name="account_from_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pago da Conta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
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
                  name="confirmation_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Confirmação</FormLabel>
                      <FormControl>
                        <Input placeholder="Protocolo, autenticação..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Anotações sobre o pagamento..." {...field} />
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
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Confirmar Pagamento</Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
