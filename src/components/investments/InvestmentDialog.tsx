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
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { Investment } from '@/types/database.types';
import { normalizeInvestmentCategory } from '@/utils/investments/contracts';

const investmentSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  ticker: z.string().optional(),
  type: z.enum(['stock', 'fund', 'crypto', 'treasury', 'real_estate', 'other']),
  category: z.enum([
    'fixed_income',
    'stock',
    'reit',
    'fund',
    'crypto',
    'international',
    'pension',
    'other',
  ]).optional(),
  subcategory: z.string().optional(),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  purchase_price: z.coerce.number().positive('Preço deve ser positivo'),
  purchase_date: z.string().optional(),
  account_id: z.string().optional(),
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
  { value: 'fixed_income', label: 'Renda Fixa' },
  { value: 'stock', label: 'Ações Nacionais' },
  { value: 'reit', label: 'Fundos Imobiliários' },
  { value: 'fund', label: 'Fundos' },
  { value: 'international', label: 'Internacional' },
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'pension', label: 'Previdência' },
  { value: 'other', label: 'Outros' },
];

const typeToDefaultCategory: Record<string, InvestmentFormData['category']> = {
  treasury: 'fixed_income',
  stock: 'stock',
  real_estate: 'reit',
  fund: 'fund',
  crypto: 'crypto',
  other: 'other',
};

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
  const tabCount = isFixedIncome ? 4 : 3;

  useEffect(() => {
    if (investment && open) {
      form.reset({
        name: investment.name,
        ticker: investment.ticker || '',
        type: investment.type as any,
        category: normalizeInvestmentCategory(investment.category, investment.type) as any,
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

  useEffect(() => {
    if (!isFixedIncome && activeTab === 'fixed') {
      setActiveTab('basic');
    }
  }, [activeTab, isFixedIncome]);

  useEffect(() => {
    const currentCategory = form.getValues('category');
    const nextCategory = typeToDefaultCategory[selectedType];

    if (!currentCategory && nextCategory) {
      form.setValue('category', nextCategory, { shouldDirty: true });
    }
  }, [form, selectedType]);

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

  const quantity = form.watch('quantity') || 0;
  const price = form.watch('purchase_price') || 0;
  const totalInvested = quantity * price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <div className="border-b border-border/60 bg-gradient-to-br from-background via-background to-muted/20 px-6 py-5">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
              {investment ? 'Editar Investimento' : 'Novo Investimento'}
            </DialogTitle>
            <DialogDescription className="max-w-2xl text-sm leading-relaxed text-foreground/72">
              {investment
                ? 'Atualize as informações do seu investimento.'
                : 'Adicione um novo investimento ao seu portfólio.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="max-h-[calc(90vh-7rem)] space-y-6 overflow-y-auto px-6 py-5"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList
                className={cn(
                  'grid w-full rounded-[1.2rem] border border-border/70 bg-surface-elevated p-1 text-muted-foreground shadow-sm',
                  tabCount === 4 ? 'grid-cols-4' : 'grid-cols-3'
                )}
              >
                <TabsTrigger
                  value="basic"
                  className="rounded-[0.9rem] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Básico
                </TabsTrigger>
                <TabsTrigger
                  value="values"
                  className="rounded-[0.9rem] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Valores
                </TabsTrigger>
                {isFixedIncome && (
                  <TabsTrigger
                    value="fixed"
                    className="rounded-[0.9rem] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                  >
                    Renda Fixa
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="notes"
                  className="rounded-[0.9rem] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Observações
                </TabsTrigger>
              </TabsList>

              <div className="space-y-5 pt-2">
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

                  <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 shadow-sm">
                    <p className="text-sm text-muted-foreground">Total Investido</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalInvested)}
                    </p>
                  </div>
                </TabsContent>

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
              </div>
            </Tabs>

            <DialogFooter className="mt-6 gap-3 border-t border-border/60 pt-4">
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
                {investment ? 'Salvar Alterações' : 'Adicionar Investimento'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
