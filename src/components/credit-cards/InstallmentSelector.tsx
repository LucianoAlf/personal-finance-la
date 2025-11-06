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
  const installmentOptions = Array.from({ length: maxInstallments }, (_, i) => i + 1);
  const installmentValue = totalAmount / selectedInstallments;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Parcelamento
        </label>
        <div className="grid grid-cols-6 gap-2">
          {installmentOptions.map((num) => {
            const value = totalAmount / num;
            const isSelected = selectedInstallments === num;
            
            return (
              <button
                key={num}
                type="button"
                onClick={() => onSelect(num)}
                className={`
                  px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {num}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-blue-700">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-medium">
              {selectedInstallments}x de {formatCurrency(installmentValue)} sem juros
            </p>
            <p className="text-xs text-blue-600">
              Total: {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
