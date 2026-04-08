import { useMemo } from 'react';
import { formatCurrency, formatRelativeDate } from '@/utils/formatters';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import * as LucideIcons from 'lucide-react';

interface TransactionTagChip {
  id: string;
  name: string;
  color?: string | null;
}

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
  /** Tags canÃ´nicas (conta ou cartÃ£o), quando existirem. */
  tags?: TransactionTagChip[];
  onClick?: () => void;
}

const toneByType = {
  income: {
    border: 'border-l-success',
    iconWrap: 'border-success-border bg-success-subtle/90',
    icon: 'text-success',
    amount: 'text-success',
  },
  expense: {
    border: 'border-l-danger',
    iconWrap: 'border-danger-border bg-danger-subtle/90',
    icon: 'text-danger',
    amount: 'text-danger',
  },
  transfer: {
    border: 'border-l-info',
    iconWrap: 'border-info-border bg-info-subtle/90',
    icon: 'text-info',
    amount: 'text-info',
  },
} as const;

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
  tags,
  onClick,
}: TransactionItemProps) {
  const { getCategoryById } = useCategories();
  const category = getCategoryById(category_id);

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

    return new Date(`${date}T00:00:00`);
  }, [date]);

  const displayDate = useMemo(() => formatRelativeDate(transactionDate), [transactionDate]);

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center justify-between rounded-2xl border border-border/70 border-l-4 bg-surface/90 p-4 shadow-[0_14px_36px_rgba(3,8,20,0.18)] transition-all duration-200 hover:translate-x-1 hover:bg-surface-elevated/85 hover:shadow-[0_18px_40px_rgba(3,8,20,0.24)]',
        toneByType[type].border
      )}
      onClick={onClick}
    >
      <div className="flex min-w-0 flex-1 items-center space-x-3">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
            toneByType[type].iconWrap
          )}
        >
          {IconComponent ? (
            <IconComponent size={20} className={toneByType[type].icon} />
          ) : (
            <span className="text-lg">{category?.icon || 'ðŸ’°'}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="truncate text-sm text-muted-foreground">{category?.name || 'Sem categoria'}</p>
            {is_recurring ? (
              <Badge variant="info" className="whitespace-nowrap text-xs">
                Recorrente
              </Badge>
            ) : null}
            {!is_paid ? (
              <Badge variant="warning" className="whitespace-nowrap text-xs">
                Pendente
              </Badge>
            ) : null}
            {extraBadgeText ? (
              <Badge variant="info" className="whitespace-nowrap text-xs">
                {extraBadgeText}
              </Badge>
            ) : null}
            {tags?.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="gap-1 whitespace-nowrap border-border/70 bg-surface-elevated/70 text-xs font-normal text-foreground"
              >
                <span
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color || '#a855f7' }}
                  aria-hidden
                />
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="ml-4 flex-shrink-0 text-right">
        <p className={cn('text-lg font-bold', toneByType[type].amount)}>
          {type === 'income' ? '+' : type === 'transfer' ? '+' : '-'} {formatCurrency(amount)}
        </p>
        <p className="text-sm text-muted-foreground">{displayDate}</p>
        {amountFootnote ? (
          <p className="mt-0.5 ml-auto max-w-[11rem] text-right text-xs text-muted-foreground">
            {amountFootnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
