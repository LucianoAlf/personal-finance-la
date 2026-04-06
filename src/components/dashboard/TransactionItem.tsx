import { useMemo } from 'react';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import * as LucideIcons from 'lucide-react';
import { TYPE_COLORS } from '@/constants/categories';

interface TransactionItemProps {
  type: 'income' | 'expense' | 'transfer';
  description: string;
  category_id: string;
  date: Date | string;
  amount: number;
  is_paid?: boolean;
  is_recurring?: boolean;
  extraBadgeText?: string;
  /** Linha extra abaixo do valor (ex.: total da compra parcelada). */
  amountFootnote?: string;
  onClick?: () => void;
}

export function TransactionItem({
  type,
  description,
  category_id,
  date,
  amount,
  is_paid = true,
  is_recurring,
  extraBadgeText,
  amountFootnote,
  onClick,
}: TransactionItemProps) {
  const { getCategoryById } = useCategories();
  const category = getCategoryById(category_id);
  const typeColors = TYPE_COLORS[type];
  
  const IconComponent =
    type === 'transfer'
      ? LucideIcons.ArrowLeftRight
      : category?.icon
        ? (LucideIcons as any)[category.icon] || LucideIcons.Wallet
        : LucideIcons.Wallet;

  const transactionDate = useMemo(() => {
    if (date instanceof Date) {
      return date;
    }

    // Garantir que datas (YYYY-MM-DD) sejam interpretadas no timezone local
    return new Date(`${date}T00:00:00`);
  }, [date]);

  const displayDate = useMemo(() => formatRelativeDate(transactionDate), [transactionDate]);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border-l-4 hover:translate-x-1 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800 hover:shadow-md',
        type === 'income'
          ? 'border-green-500'
          : type === 'transfer'
            ? 'border-blue-500'
            : 'border-red-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            typeColors.bg,
            type === 'income'
              ? 'dark:bg-green-900/30'
              : type === 'transfer'
                ? 'dark:bg-blue-900/30'
                : 'dark:bg-red-900/30'
          )}
        >
          {IconComponent ? (
            <IconComponent
              size={20}
              className={cn(
                typeColors.icon,
                type === 'income'
                  ? 'dark:text-green-400'
                  : type === 'transfer'
                    ? 'dark:text-blue-400'
                    : 'dark:text-red-400'
              )}
            />
          ) : (
            <span className="text-lg">{category?.icon || '💰'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{description}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{category?.name || 'Sem categoria'}</p>
            {is_recurring && (
              <Badge variant="info" className="text-xs whitespace-nowrap">
                Recorrente
              </Badge>
            )}
            {!is_paid && (
              <Badge variant="warning" className="text-xs whitespace-nowrap">
                Pendente
              </Badge>
            )}
            {extraBadgeText && (
              <Badge variant="info" className="text-xs whitespace-nowrap">
                {extraBadgeText}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0 ml-4">
        <p
          className={cn(
            'font-bold text-lg',
            type === 'income'
              ? 'text-green-600 dark:text-green-400'
              : type === 'transfer'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-red-600 dark:text-red-400'
          )}
        >
          {type === 'income' ? '+' : type === 'transfer' ? '+' : '-'} {formatCurrency(amount)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{displayDate}</p>
        {amountFootnote ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[11rem] ml-auto text-right">
            {amountFootnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
