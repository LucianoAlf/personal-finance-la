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
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { useInvestments } from '@/hooks/useInvestments';
import type { CreateAlertInput } from '@/hooks/useInvestmentAlerts';
import { resolveInvestmentDisplayPrice } from '@/utils/investments/pricing';

// Schema de validação
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
    label: 'Preço Acima de',
    description: 'Alertar quando preço subir acima do valor',
    icon: TrendingUp,
    color: 'text-green-600',
  },
  {
    value: 'price_below',
    label: 'Preço Abaixo de',
    description: 'Alertar quando preço cair abaixo do valor',
    icon: TrendingDown,
    color: 'text-red-600',
  },
  {
    value: 'percent_change',
    label: 'Variação Percentual',
    description: 'Alertar quando variação atingir %',
    icon: Percent,
    color: 'text-blue-600',
  },
];

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

  // Find selected investment to get current price
  const selectedInvestment = investments.find(
    (inv) => (inv.ticker || inv.name) === selectedTicker
  );

  // Reset form when opening
  useEffect(() => {
    if (open) {
      form.reset({
        ticker: '',
        alert_type: 'price_above',
        target_value: 0,
      });
    }
  }, [open, form]);

  // Auto-select investment_id when ticker is selected
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

  // Calculate proximity if we have current price
  const currentPrice = selectedInvestment
    ? resolveInvestmentDisplayPrice(selectedInvestment)
    : 0;
  const proximity =
    currentPrice > 0 && targetValue > 0
      ? ((targetValue - currentPrice) / currentPrice) * 100
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Alerta de Preço</DialogTitle>
          <DialogDescription>
            Configure um alerta para ser notificado quando o preço atingir seu objetivo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Investimento */}
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
                        <SelectItem
                          key={inv.id}
                          value={inv.ticker || inv.name}
                        >
                          {inv.ticker || inv.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedInvestment && (
                    <FormDescription>
                      Preço atual: {formatCurrency(currentPrice)}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Alerta */}
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
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <TypeIcon className={`h-4 w-4 ${type.color}`} />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedTypeInfo && (
                    <FormDescription>{selectedTypeInfo.description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor Alvo */}
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

            {/* Preview do alerta */}
            {selectedTicker && targetValue > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`rounded-lg p-2 ${selectedTypeInfo?.color} bg-background`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedTicker}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTypeInfo?.label}:{' '}
                      {selectedType === 'percent_change'
                        ? `${targetValue}%`
                        : formatCurrency(targetValue)}
                    </p>
                  </div>
                </div>

                {selectedType !== 'percent_change' && currentPrice > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {proximity > 0
                      ? `Faltam ${proximity.toFixed(2)}% para atingir`
                      : `Já atingiu! (${Math.abs(proximity).toFixed(2)}% acima)`}
                  </div>
                )}
              </div>
            )}

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
                Criar Alerta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
