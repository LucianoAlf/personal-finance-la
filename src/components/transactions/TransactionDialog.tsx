import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import type { Transaction } from '@/types/transactions';
import { TRANSACTION_TYPES } from '@/constants/categories';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  account_id: z.string().min(1, 'Selecione uma conta'),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  amount: z.string().min(1, 'Informe o valor').refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    'Valor deve ser maior que zero'
  ),
  description: z.string().min(1, 'Informe uma descrição'),
  transaction_date: z.string().min(1, 'Selecione uma data'),
  is_paid: z.boolean().default(true),
  notes: z.string().optional(),
  transfer_to_account_id: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  onSave: (data: any) => Promise<void>;
  defaultType?: 'income' | 'expense' | 'transfer';
}

export const TransactionDialog = ({
  open,
  onOpenChange,
  transaction,
  onSave,
  defaultType,
}: TransactionDialogProps) => {
  const { accounts } = useAccounts();
  const { categories, getCategoriesByType } = useCategories();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'transfer'>('expense');

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      account_id: '',
      category_id: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      is_paid: true,
      notes: '',
      transfer_to_account_id: '',
    },
  });

  // Atualizar form quando transaction ou defaultType mudar
  useEffect(() => {
    if (transaction) {
      // MODO EDIÇÃO: preencher com dados da transação
      setSelectedType(transaction.type);
      form.reset({
        type: transaction.type,
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        amount: String(transaction.amount),
        description: transaction.description || '',
        transaction_date: transaction.transaction_date,
        is_paid: transaction.is_paid,
        notes: transaction.notes || '',
        transfer_to_account_id: transaction.transfer_to_account_id || '',
      });
    } else {
      // MODO CRIAÇÃO: usar defaultType se fornecido, senão 'expense'
      const typeToUse = defaultType || 'expense';
      setSelectedType(typeToUse);
      form.reset({
        type: typeToUse,
        account_id: '',
        category_id: '',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        is_paid: true,
        notes: '',
        transfer_to_account_id: '',
      });
    }
  }, [transaction, defaultType, form]);

  // Atualizar categorias quando tipo mudar
  const handleTypeChange = (type: 'income' | 'expense' | 'transfer') => {
    setSelectedType(type);
    form.setValue('type', type);
    form.setValue('category_id', ''); // Limpar categoria ao mudar tipo
  };

  // Filtrar categorias pelo tipo selecionado
  const filteredCategories = selectedType === 'transfer' 
    ? [] 
    : getCategoriesByType(selectedType);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      setLoading(true);

      const payload = {
        type: data.type,
        account_id: data.account_id,
        category_id: data.category_id,
        amount: Number(data.amount),
        description: data.description,
        transaction_date: data.transaction_date,
        is_paid: data.is_paid,
        notes: data.notes || undefined,
        source: 'manual' as const,
        transfer_to_account_id: data.type === 'transfer' ? data.transfer_to_account_id : undefined,
        is_recurring: false,
      };

      await onSave(payload);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? 'Editar Transação' : 'Nova Transação'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={handleTypeChange}
                    value={selectedType}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TRANSACTION_TYPES).map(([key, label]) => (
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

            <div className="grid grid-cols-2 gap-4">
              {/* Conta Origem */}
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedType === 'transfer' ? 'Conta Origem' : 'Conta'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categoria ou Conta Destino */}
              {selectedType === 'transfer' ? (
                <FormField
                  control={form.control}
                  name="transfer_to_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta Destino</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts
                            .filter((a) => a.id !== form.watch('account_id'))
                            .map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Valor */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
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
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Salário, Supermercado..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pago/Recebido */}
            <FormField
              control={form.control}
              name="is_paid"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {selectedType === 'income' ? 'Recebido' : 'Pago'}
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Esta transação já foi efetivada?
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <Button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? 'Salvando...' : transaction ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
