import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard as CreditCardIcon, Calendar, DollarSign, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { InstallmentSelector } from './InstallmentSelector';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCardTags } from '@/hooks/useCreditCardTags';
import { useEstablishments } from '@/hooks/useEstablishments';
import { CreditCard } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';
import * as LucideIcons from 'lucide-react';

const purchaseSchema = z.object({
  credit_card_id: z.string().uuid('Selecione um cartão'),
  description: z.string().min(3, 'Mínimo 3 caracteres').max(100, 'Máximo 100 caracteres'),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  purchase_date: z.string().refine(
    (date) => {
      // Comparar apenas as datas (sem hora) para evitar problemas de timezone
      const selectedDate = new Date(date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Início do dia de hoje
      return selectedDate <= today;
    },
    { message: 'A data da compra não pode ser futura' }
  ),
  category_id: z.string().uuid('Selecione uma categoria'),
  installments: z.number().min(1).max(12),
  merchant: z.string().optional(),
  notes: z.string().optional(),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

interface PurchaseFormProps {
  preSelectedCardId?: string;
  onSubmit: (data: PurchaseFormData, selectedTags: string[]) => Promise<void>;
  onCancel: () => void;
}

export function PurchaseForm({ preSelectedCardId, onSubmit, onCancel }: PurchaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'single' | 'installment'>('single');
  const { cardsSummary } = useCreditCards();
  const { categories, getCategoriesByType } = useCategories();
  const { tags, createTag, updateCreditCardTransactionTags } = useCreditCardTags();
  const { establishments, fetchEstablishments } = useEstablishments();
  
  // Estados para tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  
  // Filtrar apenas categorias de despesa e ordenar alfabeticamente
  const expenseCategories = getCategoriesByType('expense');

  // Renderizar ícone Lucide dinamicamente
  const renderCategoryIcon = (iconName: string, color: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent size={16} style={{ color }} />;
  };

  // Data de hoje no fuso local (YYYY-MM-DD)
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      credit_card_id: preSelectedCardId || '',
      description: '',
      amount: undefined, // Sem valor inicial
      purchase_date: todayLocal,
      category_id: '',
      installments: 1,
      merchant: '',
      notes: '',
    },
  });

  const selectedCardId = form.watch('credit_card_id');
  const amount = form.watch('amount');
  const installments = form.watch('installments');

  const selectedCard = cardsSummary.find((c) => c.id === selectedCardId);

  // Validação de limite
  const hasInsufficientLimit = selectedCard && amount > selectedCard.available_limit;

  const isInstallmentPurchase = paymentMode === 'installment';

  const effectiveInstallments = isInstallmentPurchase ? installments : 1;

  const handlePaymentModeChange = (value: 'single' | 'installment') => {
    setPaymentMode(value);
    form.setValue('installments', value === 'installment' ? Math.max(form.getValues('installments') || 2, 2) : 1, {
      shouldValidate: true,
    });
  };

  const handleSubmit = async (data: PurchaseFormData) => {
    if (hasInsufficientLimit) {
      form.setError('amount', {
        message: 'Limite insuficiente no cartão selecionado',
      });
      return;
    }

    // Validação de parcela mínima
    const minInstallmentValue = 5.0;
    if (paymentMode === 'installment' && data.amount / data.installments < minInstallmentValue) {
      form.setError('installments', {
        message: `Valor da parcela não pode ser menor que ${formatCurrency(minInstallmentValue)}`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data, selectedTags);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Cartão */}
        <FormField
          control={form.control}
          name="credit_card_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cartão *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cartão" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {cardsSummary.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} - Disponível: {formatCurrency(card.available_limit)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Supermercado XYZ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Valor e Data */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor *</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
                {hasInsufficientLimit && (
                  <p className="text-xs text-red-600">
                    ⚠️ Limite insuficiente (disponível: {formatCurrency(selectedCard?.available_limit || 0)})
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchase_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da Compra *</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Categoria */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expenseCategories.map((category) => (
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

        {/* Forma de pagamento */}
        {amount > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">Forma de pagamento</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePaymentModeChange('single')}
                className={`flex items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  paymentMode === 'single'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                A vista
              </button>
              <button
                type="button"
                onClick={() => handlePaymentModeChange('installment')}
                className={`flex items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  paymentMode === 'installment'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                Parcelado
              </button>
            </div>

            {paymentMode === 'installment' && (
              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <InstallmentSelector
                        totalAmount={amount}
                        maxInstallments={12}
                        selectedInstallments={Math.max(field.value, 2)}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* Estabelecimento */}
        <FormField
          control={form.control}
          name="merchant"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estabelecimento (opcional)</FormLabel>
              <FormControl>
                <Combobox
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onInputChange={(q) => {
                    if (q && q.length >= 2) fetchEstablishments(q);
                  }}
                  options={establishments.map((est) => ({ label: est, value: est }))}
                  placeholder="Ex: Supermercado ABC"
                />
              </FormControl>
              <FormMessage />
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
                <Textarea placeholder="Adicione observações sobre esta compra..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Tags (opcional)
          </label>
          <div className="space-y-2">
            {/* Tags selecionadas */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tagId}
                      style={{ backgroundColor: tag.color }}
                      className="cursor-pointer text-white"
                      onClick={() => setSelectedTags(prev => prev.filter(id => id !== tagId))}
                    >
                      {tag.name}
                      <X size={12} className="ml-1" />
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Botão adicionar tag */}
            {!showTagInput && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTagInput(true)}
              >
                <Plus size={16} className="mr-1" /> Nova tag
              </Button>
            )}

            {/* Input para nova tag */}
            {showTagInput && (
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nome da tag"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTagName.trim()) {
                        const newTag = await createTag({ name: newTagName });
                        if (newTag) {
                          setSelectedTags(prev => [...prev, newTag.id]);
                          setNewTagName('');
                          setShowTagInput(false);
                        }
                      }
                    }
                    if (e.key === 'Escape') {
                      setShowTagInput(false);
                      setNewTagName('');
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
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
            {tags.length > 0 && !showTagInput && (
              <div className="flex flex-wrap gap-2">
                {tags
                  .filter(tag => !selectedTags.includes(tag.id))
                  .map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      style={{ borderColor: tag.color, color: tag.color }}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTags(prev => [...prev, tag.id])}
                    >
                      {tag.name}
                    </Badge>
                  ))}
              </div>
            )}

            {tags.length === 0 && !showTagInput && (
              <p className="text-sm text-gray-500">
                Nenhuma tag criada ainda. Clique em "Nova tag" para criar.
              </p>
            )}
          </div>
        </div>

        {/* Resumo da Compra */}
        {amount > 0 && selectedCard && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Resumo da Compra
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <CreditCardIcon className="h-4 w-4" />
                    Cartão
                  </span>
                  <span className="font-medium text-gray-900">{selectedCard.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor Total</span>
                  <span className="font-semibold text-lg text-gray-900">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Parcelamento</span>
                  <span className="font-medium text-gray-900">
                    {effectiveInstallments === 1
                      ? 'A vista'
                      : `${effectiveInstallments}x de ${formatCurrency(amount / effectiveInstallments)}`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-gray-600">Limite Disponível Após</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(selectedCard.available_limit - amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={hasInsufficientLimit || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Lançar Compra'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
