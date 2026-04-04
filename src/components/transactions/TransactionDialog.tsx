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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAccounts } from '@/hooks/useAccounts';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useTransactions } from '@/hooks/useTransactions';
import type { Transaction } from '@/types/transactions';
import { TRANSACTION_TYPES } from '@/constants/categories';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const transactionSchema = z
  .object({
    type: z.enum(['income', 'expense', 'transfer']),
    account_id: z.string().min(1, 'Selecione uma conta'),
    category_id: z.string().optional(),
    amount: z.string().min(1, 'Informe o valor').refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Valor deve ser maior que zero'
    ),
    description: z.string().min(1, 'Informe uma descrição'),
    transaction_date: z.string().min(1, 'Selecione uma data'),
    is_paid: z.boolean().default(true),
    notes: z.string().optional(),
    transfer_to_account_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'transfer') {
      if (!data.transfer_to_account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transfer_to_account_id'],
          message: 'Selecione a conta destino',
        });
      }

      if (data.transfer_to_account_id && data.transfer_to_account_id === data.account_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['transfer_to_account_id'],
          message: 'A conta destino deve ser diferente da conta origem',
        });
      }

      return;
    }

    if (!data.category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category_id'],
        message: 'Selecione uma categoria',
      });
    }
  });

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  defaultType?: 'income' | 'expense' | 'transfer';
}

export const TransactionDialog = ({
  open,
  onOpenChange,
  transaction,
  onSave,
  onDelete,
  defaultType,
}: TransactionDialogProps) => {
  const { accounts } = useAccounts();
  const { categories, getCategoriesByType } = useCategories();
  const { tags, createTag } = useTags();
  const { saveTransactionTags } = useTransactions();
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Renderizar ícone Lucide dinamicamente
  const renderCategoryIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={16} style={{ color }} />;
  };

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
      // Carregar tags da transação
      setSelectedTags(transaction.tags?.map(t => t.id) || []);
    } else {
      // MODO CRIAÇÃO: usar defaultType se fornecido, senão 'expense'
      const typeToUse = defaultType || 'expense';
      setSelectedType(typeToUse);
      setSelectedTags([]);
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
        category_id: data.type === 'transfer' ? undefined : data.category_id,
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
      
      // Salvar tags se estiver editando (já temos o ID)
      if (transaction?.id) {
        await saveTransactionTags(transaction.id, selectedTags);
      }
      // Para novas transações, as tags serão salvas após o refresh automático

      onOpenChange(false);
      form.reset();
      setSelectedTags([]);
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers para tags
  const handleToggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await createTag({ name: newTagName.trim() });
      if (newTag) {
        setSelectedTags(prev => [...prev, newTag.id]);
        toast.success('Tag criada com sucesso!');
      }
      setNewTagName('');
      setShowTagInput(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe uma tag com este nome');
      } else {
        toast.error('Erro ao criar tag');
      }
    }
  };

  const handleDelete = async () => {
    if (!transaction || !onDelete) return;

    try {
      setLoading(true);
      await onDelete(transaction.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                              <div className="flex items-center gap-2">
                                {renderCategoryIcon(category.icon, category.color)}
                                <span>{category.name}</span>
                              </div>
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
                      <DatePickerInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Selecione a data da transação"
                        disableFuture={true}
                      />
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

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Tags (opcional)</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTagInput(!showTagInput)}
                  className="h-8 text-purple-600 hover:text-purple-700"
                >
                  <Plus size={16} className="mr-1" />
                  Nova tag
                </Button>
              </div>

              {/* Input para criar nova tag */}
              {showTagInput && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da tag..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag())}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateTag}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Criar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowTagInput(false);
                      setNewTagName('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Lista de tags disponíveis */}
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <Badge
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white hover:bg-purple-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={isSelected ? { backgroundColor: tag.color } : {}}
                    >
                      {tag.name}
                      {isSelected && <X size={12} className="ml-1" />}
                    </Badge>
                  );
                })}
              </div>

              {tags.length === 0 && !showTagInput && (
                <p className="text-sm text-gray-500">
                  Nenhuma tag criada ainda. Clique em "Nova tag" para criar.
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between gap-3 pt-4">
              <div>
                {transaction && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={loading}
                  >
                    Excluir
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
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
            </div>
          </form>
        </Form>
      </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá a transação permanentemente. O saldo será ajustado automaticamente pelo sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
