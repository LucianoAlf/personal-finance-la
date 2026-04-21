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
import { Button } from '@/components/ui/button';
import { Loader2, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import type { CreateAlertInput } from '@/hooks/useInvestmentAlerts';
import { resolveInvestmentDisplayPrice } from '@/utils/investments/pricing';

const alertSchema = z.object({
  investment_id: z.string().optional(),
  ticker: z.string().min(1, 'Ticker é obrigatório'),
  alert_type: z.enum(['price_above', 'price_below', 'percent_change']),
  target_value: z.coerce.number().positive('Valor deve ser positivo'),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateAlertInput) => Promise<void>;
}

const alertTypes = [
  {
    value: 'price_above',
    label: 'Preço acima de',
    description: 'Alertar quando o preço subir acima do valor',
    icon: TrendingUp,
    tone: 'emerald',
  },
  {
    value: 'price_below',
    label: 'Preço abaixo de',
    description: 'Alertar quando o preço cair abaixo do valor',
    icon: TrendingDown,
    tone: 'rose',
  },
  {
    value: 'percent_change',
    label: 'Variação percentual',
    description: 'Alertar quando a variação atingir o percentual definido',
    icon: Percent,
    tone: 'blue',
  },
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function AlertDialog({ open, onOpenChange, onSave }: AlertDialogProps) {
  const [loading, setLoading] = useState(false);
  const { investments } = useInvestments();

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      ticker: '',
      alert_type: 'price_above',
      target_value: 0,
    },
  });

  const selectedType = form.watch('alert_type');
  const selectedTicker = form.watch('ticker');
  const targetValue = form.watch('target_value');

  const selectedInvestment = investments.find(
    (inv) => (inv.ticker || inv.name) === selectedTicker
  );

  useEffect(() => {
    if (open) {
      form.reset({
        ticker: '',
        alert_type: 'price_above',
        target_value: 0,
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (selectedInvestment) {
      form.setValue('investment_id', selectedInvestment.id);
    }
  }, [selectedTicker, selectedInvestment, form]);

  const handleSubmit = async (data: AlertFormData) => {
    try {
      setLoading(true);
      await onSave(data as CreateAlertInput);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving alert:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = alertTypes.find((t) => t.value === selectedType);
  const Icon = selectedTypeInfo?.icon || TrendingUp;
  const currentPrice = selectedInvestment ? resolveInvestmentDisplayPrice(selectedInvestment) : 0;
  const proximity =
    currentPrice > 0 && targetValue > 0
      ? ((targetValue - currentPrice) / currentPrice) * 100
      : 0;

  const dialogTitle = 'Criar Alerta de Preço';

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
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investimento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o investimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {investments.map((inv) => (
                          <SelectItem key={inv.id} value={inv.ticker || inv.name}>
                            {inv.ticker || inv.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedInvestment && (
                      <FormDescription className="text-xs text-muted-foreground">
                        Preço atual: {formatCurrency(currentPrice)}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alert_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Alerta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {alertTypes.map((type) => {
                          const TypeIcon = type.icon;
                          const toneClass =
                            type.tone === 'emerald'
                              ? 'text-emerald-500'
                              : type.tone === 'rose'
                                ? 'text-rose-500'
                                : 'text-sky-500';

                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <TypeIcon className={`h-4 w-4 ${toneClass}`} />
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
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Valor Alvo {selectedType === 'percent_change' ? '(%)' : '(R$)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={selectedType === 'percent_change' ? '5.00' : '25.00'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedTicker && targetValue > 0 && (
                <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{selectedTicker}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTypeInfo?.label}:{' '}
                        {selectedType === 'percent_change'
                          ? `${targetValue}%`
                          : formatCurrency(targetValue)}
                      </p>
                    </div>
                  </div>

                  {selectedType !== 'percent_change' && currentPrice > 0 && (
                    <div className="mt-4 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                      {proximity > 0
                        ? `Faltam ${proximity.toFixed(2)}% para atingir`
                        : `Já atingiu! (${Math.abs(proximity).toFixed(2)}% acima)`}
                    </div>
                  )}
                </div>
              )}
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
                Criar Alerta
              </Button>
            </div>
          </form>
        </Form>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
