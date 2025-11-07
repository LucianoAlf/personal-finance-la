import { useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCategories } from '@/hooks/useCategories';
import * as LucideIcons from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const schema = z.object({
  category_id: z.string().min(1, 'Selecione uma categoria'),
  planned_amount: z.number().min(0.01, 'Informe um valor maior que zero'),
  notes: z.string().optional(),
});

export type AddBudgetForm = z.infer<typeof schema>;

interface AddBudgetCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (categoryId: string, amount: number, notes?: string) => Promise<void>;
  existingCategories: string[];
  month: string; // YYYY-MM
}

function formatMonthYear(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function AddBudgetCategoryDialog({ open, onOpenChange, onAdd, existingCategories, month }: AddBudgetCategoryDialogProps) {
  const { categories, loading } = useCategories();

  const availableCategories = useMemo(() => {
    return categories
      .filter((c: any) => c.type === 'expense')
      .filter((c: any) => !existingCategories.includes(c.id));
  }, [categories, existingCategories]);

  const form = useForm<AddBudgetForm>({
    resolver: zodResolver(schema),
    defaultValues: { category_id: '', planned_amount: 0, notes: '' },
  });

  const onSubmit = async (data: AddBudgetForm) => {
    await onAdd(data.category_id, data.planned_amount, data.notes);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Categoria ao Orçamento</DialogTitle>
          <DialogDescription>
            Defina um limite de gastos para {formatMonthYear(month)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Select de Categoria */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loading || availableCategories.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? 'Carregando...' : 'Selecione uma categoria'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCategories.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Todas categorias já foram adicionadas
                        </SelectItem>
                      ) : (
                        availableCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${cat.color}20` }}
                              >
                                {(() => {
                                  const Icon = (LucideIcons as any)[cat.icon];
                                  return Icon ? <Icon className="h-3.5 w-3.5" style={{ color: cat.color }} /> : null;
                                })()}
                              </div>
                              <span>{cat.name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor Planejado */}
            <FormField
              control={form.control}
              name="planned_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Planejado (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas (opcional) */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações para esta categoria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={availableCategories.length === 0}>
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
