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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { Investment } from '@/types/database.types';

// Schema de validação
const investmentSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  ticker: z.string().optional(),
  type: z.enum(['stock', 'fund', 'crypto', 'treasury', 'real_estate', 'other']),
  category: z.enum([
    'renda_fixa',
    'acoes_nacionais',
    'fiis',
    'internacional',
    'cripto',
    'previdencia',
  ]).optional(),
  subcategory: z.string().optional(),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  purchase_price: z.coerce.number().positive('Preço deve ser positivo'),
  purchase_date: z.string().optional(),
  account_id: z.string().optional(),
  // Renda Fixa
  annual_rate: z.coerce.number().optional(),
  maturity_date: z.string().optional(),
  dividend_yield: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  onSave: (data: InvestmentFormData) => Promise<void>;
}

const investmentTypes = [
  { value: 'stock', label: 'Ação' },
  { value: 'fund', label: 'Fundo de Investimento' },
  { value: 'crypto', label: 'Criptomoeda' },
  { value: 'treasury', label: 'Tesouro Direto' },
  { value: 'real_estate', label: 'Fundo Imobiliário (FII)' },
  { value: 'other', label: 'Outro' },
];

const categories = [
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'acoes_nacionais', label: 'Ações Nacionais' },
  { value: 'fiis', label: 'Fundos Imobiliários' },
  { value: 'internacional', label: 'Internacional' },
  { value: 'cripto', label: 'Criptomoedas' },
  { value: 'previdencia', label: 'Previdência' },
];

export function InvestmentDialog({
  open,
  onOpenChange,
  investment,
  onSave,
}: InvestmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: '',
      ticker: '',
      type: 'stock',
      quantity: 0,
      purchase_price: 0,
      purchase_date: new Date().toISOString().split('T')[0],
    },
  });

  const selectedType = form.watch('type');
  const isFixedIncome = selectedType === 'treasury';

  // Load investment data when editing
  useEffect(() => {
    if (investment && open) {
      form.reset({
        name: investment.name,
        ticker: investment.ticker || '',
        type: investment.type as any,
        category: investment.category as any,
        subcategory: investment.subcategory || '',
        quantity: investment.quantity,
        purchase_price: investment.purchase_price,
        purchase_date: investment.purchase_date
          ? new Date(investment.purchase_date).toISOString().split('T')[0]
          : undefined,
        annual_rate: investment.annual_rate || undefined,
        maturity_date: investment.maturity_date
          ? new Date(investment.maturity_date).toISOString().split('T')[0]
          : undefined,
        dividend_yield: investment.dividend_yield || undefined,
        notes: investment.notes || '',
      });
    } else if (!open) {
      form.reset();
      setActiveTab('basic');
    }
  }, [investment, open, form]);

  const handleSubmit = async (data: InvestmentFormData) => {
    try {
      setLoading(true);
      await onSave(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving investment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total invested
  const quantity = form.watch('quantity') || 0;
  const price = form.watch('purchase_price') || 0;
  const totalInvested = quantity * price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {investment ? 'Editar Investimento' : 'Novo Investimento'}
          </DialogTitle>
          <DialogDescription>
            {investment
              ? 'Atualize as informações do seu investimento'
              : 'Adicione um novo investimento ao seu portfólio'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="values">Valores</TabsTrigger>
                {isFixedIncome && <TabsTrigger value="fixed">Renda Fixa</TabsTrigger>}
                <TabsTrigger value="notes">Observações</TabsTrigger>
              </TabsList>

              {/* Aba Básico */}
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Petrobras PN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticker"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticker / Código</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: PETR4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investmentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Aba Valores */}
              <TabsContent value="values" className="space-y-4">
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
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de Compra (unitário)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Compra</FormLabel>
                      <FormControl>
                        <DatePickerInput
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione a data da compra"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Total Investido:</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(totalInvested)}
                  </p>
                </div>
              </TabsContent>

              {/* Aba Renda Fixa (condicional) */}
              {isFixedIncome && (
                <TabsContent value="fixed" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="annual_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taxa Anual (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maturity_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Vencimento</FormLabel>
                        <FormControl>
                          <DatePickerInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione a data de vencimento"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dividend_yield"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dividend Yield (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              )}

              {/* Aba Observações */}
              <TabsContent value="notes" className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Anotações sobre este investimento..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

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
                {investment ? 'Salvar Alterações' : 'Adicionar Investimento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
