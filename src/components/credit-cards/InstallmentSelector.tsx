import { formatCurrency } from '@/utils/formatters';

interface InstallmentSelectorProps {
  totalAmount: number;
  maxInstallments?: number;
  selectedInstallments: number;
  onSelect: (installments: number) => void;
}

export function InstallmentSelector({
  totalAmount,
  maxInstallments = 12,
  selectedInstallments,
  onSelect,
}: InstallmentSelectorProps) {
  const installmentOptions = Array.from({ length: maxInstallments }, (_, index) => index + 1);
  const installmentValue = totalAmount / selectedInstallments;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">Parcelamento</label>
        <div className="grid grid-cols-6 gap-2">
          {installmentOptions.map((num) => {
            const isSelected = selectedInstallments === num;

            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelect(num)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                    : 'border-border/70 bg-surface/75 text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                }`}
              >
                {num}x
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-[22px] border border-primary/15 bg-primary/8 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            $
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {selectedInstallments}x de {formatCurrency(installmentValue)} sem juros
            </p>
            <p className="text-xs text-muted-foreground">Total: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
