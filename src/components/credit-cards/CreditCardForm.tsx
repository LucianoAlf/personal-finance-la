import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CardBrand } from '@/types/database.types';
import { CARD_BRANDS, DEFAULT_CARD_COLORS } from '@/constants/creditCards';
import { BANK_LIST } from '@/constants/banks';
import { formatCardNumber } from '@/utils/creditCardUtils';

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
  closing_day: z.number().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31'),
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
  const fieldClass =
    'h-11 rounded-xl border-border/70 bg-surface/80 text-foreground shadow-sm dark:bg-surface-elevated/70';
  const errorFieldClass = 'border-danger focus-visible:border-danger';
  const helperClass = 'text-xs text-muted-foreground';
  const primaryButtonClass =
    'rounded-xl border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_35px_rgba(139,92,246,0.24)] hover:bg-primary/90';

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
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-foreground">Nome do Cartão *</Label>
        <Input
          id="name"
          placeholder="Ex: Nubank Platinum"
          {...register('name')}
          className={`${fieldClass} ${errors.name ? errorFieldClass : ''}`}
        />
        {errors.name ? <p className="text-sm text-danger">{errors.name.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand" className="text-sm font-medium text-foreground">Bandeira *</Label>
          <Select onValueChange={(value) => setValue('brand', value as CardBrand)} defaultValue={card?.brand}>
            <SelectTrigger className={`${fieldClass} ${errors.brand ? errorFieldClass : ''}`}>
              <SelectValue placeholder="Selecione a bandeira" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CARD_BRANDS).map(([key, brand]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: brand.color }} />
                    {brand.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.brand ? <p className="text-sm text-danger">{errors.brand.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuing_bank" className="text-sm font-medium text-foreground">Banco Emissor</Label>
          <Select onValueChange={(value) => setValue('issuing_bank', value)} defaultValue={card?.issuing_bank || ''}>
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {BANK_LIST.map((bank) => (
                <SelectItem key={bank.code} value={bank.code}>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: bank.color }} />
                    {bank.shortName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="last_four_digits" className="text-sm font-medium text-foreground">Últimos 4 Dígitos *</Label>
        <Input
          id="last_four_digits"
          placeholder="0000"
          maxLength={4}
          {...register('last_four_digits')}
          className={`${fieldClass} ${errors.last_four_digits ? errorFieldClass : ''}`}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, '');
            setValue('last_four_digits', value);
          }}
        />
        {errors.last_four_digits ? <p className="text-sm text-danger">{errors.last_four_digits.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="credit_limit" className="text-sm font-medium text-foreground">Limite de Crédito *</Label>
        <Input
          id="credit_limit"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('credit_limit', { valueAsNumber: true })}
          className={`${fieldClass} ${errors.credit_limit ? errorFieldClass : ''}`}
        />
        {errors.credit_limit ? <p className="text-sm text-danger">{errors.credit_limit.message}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="closing_day" className="text-sm font-medium text-foreground">Dia de Fechamento *</Label>
          <Input
            id="closing_day"
            type="number"
            min="1"
            max="31"
            {...register('closing_day', { valueAsNumber: true })}
            className={`${fieldClass} ${errors.closing_day ? errorFieldClass : ''}`}
          />
          <p className={helperClass}>Dia em que a fatura fecha</p>
          {errors.closing_day ? <p className="text-sm text-danger">{errors.closing_day.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="due_day" className="text-sm font-medium text-foreground">Dia de Vencimento *</Label>
          <Input
            id="due_day"
            type="number"
            min="1"
            max="31"
            {...register('due_day', { valueAsNumber: true })}
            className={`${fieldClass} ${errors.due_day ? errorFieldClass : ''}`}
          />
          <p className={helperClass}>Dia em que a fatura vence</p>
          {errors.due_day ? <p className="text-sm text-danger">{errors.due_day.message}</p> : null}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Cor do Cartão</Label>
        <div className="flex items-center gap-3">
          <input type="color" {...register('color')} className="h-12 w-12 cursor-pointer rounded-xl border border-border/70 bg-surface-elevated" />
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CARD_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  selectedColor === color ? 'scale-110 border-foreground' : 'border-border/70'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Preview</Label>
        <div className="rounded-[28px] border border-border/60 bg-surface-elevated/45 p-4">
          <div
            className="flex h-48 flex-col justify-between rounded-[24px] p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
            style={{
              background: `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}dd 100%)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium uppercase tracking-[0.12em]">
                {selectedBrand ? CARD_BRANDS[selectedBrand as CardBrand].name : 'Bandeira'}
              </span>
            </div>
            <div>
              <p className="mb-1 text-sm text-white/80">{cardName}</p>
              <p className="text-xl font-mono tracking-[0.2em]">{formatCardNumber(lastFourDigits)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium text-foreground">Observações (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Notas sobre o cartão..."
          rows={3}
          {...register('notes')}
          className="min-h-[110px] rounded-xl border-border/70 bg-surface/80 shadow-sm dark:bg-surface-elevated/70"
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-border/60 pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="rounded-xl border-border/70 bg-surface/70 text-muted-foreground hover:bg-surface-elevated hover:text-foreground">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? 'Salvando...' : card ? 'Atualizar' : 'Criar Cartão'}
        </Button>
      </div>
    </form>
  );
}
