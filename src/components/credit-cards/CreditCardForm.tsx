import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, CardBrand } from '@/types/database.types';
import { CARD_BRANDS, DEFAULT_CARD_COLORS } from '@/constants/creditCards';
import { BANK_LIST, getBankByCode } from '@/constants/banks';
import { formatCurrency } from '@/utils/formatters';
import { formatCardNumber } from '@/utils/creditCardUtils';

// Schema de validação
const creditCardSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  brand: z.enum(['visa', 'mastercard', 'elo', 'amex', 'hipercard', 'diners'], {
    errorMap: () => ({ message: 'Selecione uma bandeira' }),
  }),
  issuing_bank: z.string().optional(),
  last_four_digits: z
    .string()
    .length(4, 'Informe os 4 últimos dígitos')
    .regex(/^\d+$/, 'Apenas números'),
  credit_limit: z.number().min(0, 'Limite deve ser positivo').max(1000000, 'Limite muito alto'),
  closing_day: z
    .number()
    .min(1, 'Dia deve ser entre 1 e 31')
    .max(31, 'Dia deve ser entre 1 e 31'),
  due_day: z.number().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida').optional(),
  notes: z.string().optional(),
});

type CreditCardFormData = z.infer<typeof creditCardSchema>;

interface CreditCardFormProps {
  card?: CreditCard;
  onSubmit: (data: CreditCardFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function CreditCardForm({ card, onSubmit, onCancel, loading }: CreditCardFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: card
      ? {
          name: card.name,
          brand: card.brand,
          issuing_bank: card.issuing_bank || '',
          last_four_digits: card.last_four_digits,
          credit_limit: card.credit_limit,
          closing_day: card.closing_day,
          due_day: card.due_day,
          color: card.color,
          notes: card.notes || '',
        }
      : {
          color: DEFAULT_CARD_COLORS[0],
          closing_day: 1,
          due_day: 10,
          issuing_bank: '',
        },
  });

  const selectedBrand = watch('brand');
  const selectedColor = watch('color') || DEFAULT_CARD_COLORS[0];
  const lastFourDigits = watch('last_four_digits') || '0000';
  const cardName = watch('name') || 'Meu Cartão';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nome do Cartão */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Cartão *</Label>
        <Input
          id="name"
          placeholder="Ex: Nubank Platinum"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      {/* Bandeira e Banco Emissor */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Bandeira *</Label>
          <Select
            onValueChange={(value) => setValue('brand', value as CardBrand)}
            defaultValue={card?.brand}
          >
            <SelectTrigger className={errors.brand ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecione a bandeira" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CARD_BRANDS).map(([key, brand]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: brand.color }}
                    />
                    {brand.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.brand && <p className="text-sm text-red-500">{errors.brand.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuing_bank">Banco Emissor</Label>
          <Select
            onValueChange={(value) => setValue('issuing_bank', value)}
            defaultValue={card?.issuing_bank || ''}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {BANK_LIST.map((bank) => (
                <SelectItem key={bank.code} value={bank.code}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: bank.color }}
                    />
                    {bank.shortName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Últimos 4 Dígitos */}
      <div className="space-y-2">
        <Label htmlFor="last_four_digits">Últimos 4 Dígitos *</Label>
        <Input
          id="last_four_digits"
          placeholder="0000"
          maxLength={4}
          {...register('last_four_digits')}
          className={errors.last_four_digits ? 'border-red-500' : ''}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            setValue('last_four_digits', value);
          }}
        />
        {errors.last_four_digits && (
          <p className="text-sm text-red-500">{errors.last_four_digits.message}</p>
        )}
      </div>

      {/* Limite de Crédito */}
      <div className="space-y-2">
        <Label htmlFor="credit_limit">Limite de Crédito *</Label>
        <Input
          id="credit_limit"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('credit_limit', { valueAsNumber: true })}
          className={errors.credit_limit ? 'border-red-500' : ''}
        />
        {errors.credit_limit && (
          <p className="text-sm text-red-500">{errors.credit_limit.message}</p>
        )}
      </div>

      {/* Dias de Fechamento e Vencimento */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="closing_day">Dia de Fechamento *</Label>
          <Input
            id="closing_day"
            type="number"
            min="1"
            max="31"
            {...register('closing_day', { valueAsNumber: true })}
            className={errors.closing_day ? 'border-red-500' : ''}
          />
          <p className="text-xs text-gray-500">Dia em que a fatura fecha</p>
          {errors.closing_day && (
            <p className="text-sm text-red-500">{errors.closing_day.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_day">Dia de Vencimento *</Label>
          <Input
            id="due_day"
            type="number"
            min="1"
            max="31"
            {...register('due_day', { valueAsNumber: true })}
            className={errors.due_day ? 'border-red-500' : ''}
          />
          <p className="text-xs text-gray-500">Dia em que a fatura vence</p>
          {errors.due_day && <p className="text-sm text-red-500">{errors.due_day.message}</p>}
        </div>
      </div>

      {/* Cor Personalizada */}
      <div className="space-y-2">
        <Label>Cor do Cartão</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            {...register('color')}
            className="w-12 h-12 rounded cursor-pointer"
          />
          <div className="flex gap-2 flex-wrap">
            {DEFAULT_CARD_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview do Cartão */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div
          className="h-48 rounded-2xl p-6 text-white flex flex-col justify-between shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}dd 100%)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium uppercase">
              {selectedBrand ? CARD_BRANDS[selectedBrand as CardBrand].name : 'Bandeira'}
            </span>
          </div>
          <div>
            <p className="text-sm opacity-80 mb-1">{cardName}</p>
            <p className="text-xl font-mono">{formatCardNumber(lastFourDigits)}</p>
          </div>
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Notas sobre o cartão..."
          rows={3}
          {...register('notes')}
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : card ? 'Atualizar' : 'Criar Cartão'}
        </Button>
      </div>
    </form>
  );
}
