import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InstallmentTransactionCard } from '@/components/credit-cards/InstallmentTransactionCard';
import { useCreditCardTags } from '@/hooks/useCreditCardTags';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { CreditCardTransaction } from '@/types/database.types';
import { formatCurrency } from '@/utils/formatters';

interface InvoiceTransactionsListProps {
  invoiceId: string;
  groupByCategory?: boolean;
}

export function InvoiceTransactionsList({
  invoiceId,
  groupByCategory = false,
}: InvoiceTransactionsListProps) {
  const { transactions, loading } = useCreditCardTransactions();
  const { tags, getTagsForTransactions } = useCreditCardTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsByTransaction, setTagsByTransaction] = useState<Record<string, any[]>>({});

  const invoiceTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.invoice_id === invoiceId),
    [transactions, invoiceId],
  );

  const { simpleTransactions, installmentGroups } = useMemo(() => {
    const simple: CreditCardTransaction[] = [];
    const groupsMap = new Map<string, CreditCardTransaction>();

    invoiceTransactions.forEach((transaction) => {
      if (transaction.is_installment && transaction.installment_group_id) {
        if (!groupsMap.has(transaction.installment_group_id)) {
          groupsMap.set(transaction.installment_group_id, transaction);
        }
      } else {
        simple.push(transaction);
      }
    });

    return {
      simpleTransactions: simple,
      installmentGroups: Array.from(groupsMap.values()),
    };
  }, [invoiceTransactions]);

  useEffect(() => {
    const loadTags = async () => {
      const ids = invoiceTransactions.map((transaction) => transaction.id);
      if (ids.length === 0) return;
      const map = await getTagsForTransactions(ids);
      setTagsByTransaction(map);
    };

    loadTags();
  }, [getTagsForTransactions, invoiceTransactions]);

  const filteredSimpleTransactions = useMemo(() => {
    if (selectedTagIds.length === 0) return simpleTransactions;
    return simpleTransactions.filter((transaction) => {
      const transactionTags = tagsByTransaction[transaction.id] || [];
      if (transactionTags.length === 0) return false;
      const transactionTagIds = transactionTags.map((tag: any) => tag.id);
      return selectedTagIds.some((tagId) => transactionTagIds.includes(tagId));
    });
  }, [selectedTagIds, simpleTransactions, tagsByTransaction]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-[22px]" />
        ))}
      </div>
    );
  }

  if (installmentGroups.length === 0 && filteredSimpleTransactions.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/70 bg-surface-elevated/35 px-5 py-10 text-center text-sm text-muted-foreground">
        Nenhuma transacao registrada nesta fatura.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-border/70 bg-surface-elevated/45 p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Filtrar por tags</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use as tags para isolar as compras mais importantes deste ciclo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTagIds.includes(tag.id);
            return (
              <Badge
                key={tag.id}
                className="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: active ? tag.color : 'transparent',
                  borderColor: tag.color,
                  color: active ? '#ffffff' : tag.color,
                }}
                onClick={() =>
                  setSelectedTagIds((previous) =>
                    previous.includes(tag.id)
                      ? previous.filter((item) => item !== tag.id)
                      : [...previous, tag.id],
                  )
                }
              >
                {tag.name}
              </Badge>
            );
          })}
        </div>
      </div>

      {installmentGroups.map((transaction) => (
        <InstallmentTransactionCard
          key={transaction.installment_group_id || transaction.id}
          transaction={transaction}
        />
      ))}

      {filteredSimpleTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="rounded-[24px] border border-border/70 bg-card/95 p-4 shadow-[0_12px_30px_rgba(2,6,23,0.12)] transition-colors hover:bg-card"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold tracking-tight text-foreground">{transaction.description}</p>
                {groupByCategory && transaction.category_name ? (
                  <span className="rounded-full border border-border/60 bg-surface/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {transaction.category_name}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{format(new Date(transaction.purchase_date), "dd 'de' MMM", { locale: ptBR })}</span>
                {(tagsByTransaction[transaction.id] || []).map((tag: any) => (
                  <Badge
                    key={tag.id}
                    className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm"
                    style={{ backgroundColor: `${tag.color}1A`, borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {formatCurrency(transaction.amount)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Compra registrada</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
