import { useEffect, useMemo, useState } from 'react';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useCreditCardTags } from '@/hooks/useCreditCardTags';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { InstallmentTransactionCard } from '@/components/credit-cards/InstallmentTransactionCard';
import { CreditCardTransaction } from '@/types/database.types';

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

  // Filtrar transações da fatura
  const invoiceTransactions = useMemo(
    () => transactions.filter((t) => t.invoice_id === invoiceId),
    [transactions, invoiceId]
  );

  // Separar transações simples de parcelamentos (agrupados por installment_group_id)
  const { simpleTransactions, installmentGroups } = useMemo(() => {
    const simple: CreditCardTransaction[] = [];
    const groupsMap = new Map<string, CreditCardTransaction>();

    invoiceTransactions.forEach((t) => {
      if (t.is_installment && t.installment_group_id) {
        // Para parcelamentos, pegar apenas o registro pai ou o primeiro do grupo
        if (!groupsMap.has(t.installment_group_id)) {
          groupsMap.set(t.installment_group_id, t);
        }
      } else {
        simple.push(t);
      }
    });

    return {
      simpleTransactions: simple,
      installmentGroups: Array.from(groupsMap.values()),
    };
  }, [invoiceTransactions]);

  // Buscar tags das transações desta fatura (em lote)
  useEffect(() => {
    const load = async () => {
      const ids = invoiceTransactions.map((t) => t.id);
      if (ids.length === 0) return;
      const map = await getTagsForTransactions(ids);
      setTagsByTransaction(map);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceTransactions.length]);

  // Aplicar filtro por tags
  const filteredTransactions = useMemo(() => {
    if (selectedTagIds.length === 0) return invoiceTransactions;
    return invoiceTransactions.filter((t) => {
      const txTags = tagsByTransaction[t.id] || [];
      if (txTags.length === 0) return false;
      const txTagIds = txTags.map((tg: any) => tg.id);
      return selectedTagIds.some((id) => txTagIds.includes(id));
    });
  }, [invoiceTransactions, selectedTagIds, tagsByTransaction]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma transação nesta fatura
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filtro por Tags */}
      <div className="mb-2">
        <p className="text-sm text-gray-600 mb-2">Filtrar por Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTagIds.includes(tag.id);
            return (
              <Badge
                key={tag.id}
                variant={active ? 'default' : 'outline'}
                style={{
                  backgroundColor: active ? tag.color : 'transparent',
                  borderColor: tag.color,
                  color: active ? '#fff' : tag.color,
                }}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedTagIds((prev) =>
                    prev.includes(tag.id)
                      ? prev.filter((id) => id !== tag.id)
                      : [...prev, tag.id]
                  )
                }
              >
                {tag.name}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Parcelamentos agrupados */}
      {installmentGroups.map((transaction) => (
        <InstallmentTransactionCard
          key={transaction.installment_group_id || transaction.id}
          transaction={transaction}
        />
      ))}

      {/* Transações simples */}
      {simpleTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{transaction.description}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500">
                {format(new Date(transaction.purchase_date), "dd 'de' MMM", { locale: ptBR })}
              </p>
              {/* Tags da transação */}
              <div className="flex flex-wrap gap-1">
                {(tagsByTransaction[transaction.id] || []).map((tag: any) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color }}
                    className="text-white"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(transaction.amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
