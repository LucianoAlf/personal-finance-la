import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/categories';
import { formatCurrency } from '@/utils/formatters';
import { RecategorizeDialog } from './RecategorizeDialog';

interface CategoryTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onRecategorizeSuccess?: () => void | Promise<void>;
}

type LedgerEntity = 'transaction' | 'credit_card_transaction';

interface LedgerRow {
  id: string;
  description: string;
  amount: number;
  sortAt: string;
  ledgerEntity: LedgerEntity;
}

const SOURCE_LABEL: Record<LedgerEntity, string> = {
  transaction: 'Conta',
  credit_card_transaction: 'Cartão',
};

function parseSortDate(iso: string | null | undefined): string {
  if (!iso) return new Date(0).toISOString();
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

export function CategoryTransactionsDialog({
  open,
  onOpenChange,
  category,
  onRecategorizeSuccess,
}: CategoryTransactionsDialogProps) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<LedgerRow | null>(null);
  const [recategorizeOpen, setRecategorizeOpen] = useState(false);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        return;
      }

      const [bankRes, cardRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, description, amount, transaction_date, created_at')
          .eq('user_id', user.id)
          .eq('category_id', category.id),
        supabase
          .from('credit_card_transactions')
          .select('id, description, amount, purchase_date, created_at')
          .eq('user_id', user.id)
          .eq('category_id', category.id),
      ]);

      if (bankRes.error) throw bankRes.error;
      if (cardRes.error) throw cardRes.error;

      const bankMapped: LedgerRow[] = (bankRes.data ?? []).map((item: any) => ({
        id: item.id,
        description: item.description ?? '',
        amount: Number(item.amount) || 0,
        sortAt: parseSortDate(item.transaction_date || item.created_at),
        ledgerEntity: 'transaction',
      }));

      const cardMapped: LedgerRow[] = (cardRes.data ?? []).map((item: any) => ({
        id: item.id,
        description: item.description ?? '',
        amount: Number(item.amount) || 0,
        sortAt: parseSortDate(item.purchase_date || item.created_at),
        ledgerEntity: 'credit_card_transaction',
      }));

      const merged = [...bankMapped, ...cardMapped].sort((a, b) =>
        a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0,
      );

      setRows(merged);
    } catch (error) {
      console.error('Erro ao buscar transações da categoria:', error);
    } finally {
      setLoading(false);
    }
  }, [category.id]);

  useEffect(() => {
    if (open) {
      void fetchRows();
    }
  }, [open, fetchRows]);

  const handleRecategorize = (row: LedgerRow) => {
    setSelectedRow(row);
    setRecategorizeOpen(true);
  };

  const handleRecategorizeSuccess = async () => {
    await fetchRows();
    await onRecategorizeSuccess?.();
  };

  const totalAmount = rows.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-[28px] border-border/70 bg-surface-overlay p-0">
          <DialogHeader className="border-b border-border/60 px-6 pb-5 pt-6">
            <DialogTitle className="text-xl">{category.name} • lançamentos</DialogTitle>
            <DialogDescription>
              Revise os lançamentos vinculados a esta categoria e recategorize quando necessário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-6">
            <div className="rounded-[22px] border border-border/70 bg-surface/65 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'} no extrato
                </span>
                <span className="text-lg font-semibold text-foreground">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-[22px]" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border/70 bg-surface/55 px-6 py-14 text-center text-sm text-muted-foreground">
                Nenhum lançamento encontrado para esta categoria.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <div
                    key={`${row.ledgerEntity}-${row.id}`}
                    className="rounded-[22px] border border-border/70 bg-card/95 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:shadow-[0_22px_46px_rgba(2,6,23,0.24)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(row.sortAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs">
                            {SOURCE_LABEL[row.ledgerEntity]}
                          </Badge>
                        </div>
                        <p className="break-words text-base font-medium text-foreground">
                          {row.description}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {formatCurrency(row.amount)}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 rounded-xl"
                        onClick={() => handleRecategorize(row)}
                      >
                        Recategorizar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedRow ? (
        <RecategorizeDialog
          open={recategorizeOpen}
          onOpenChange={setRecategorizeOpen}
          transaction={{
            id: selectedRow.id,
            description: selectedRow.description,
            ledgerEntity: selectedRow.ledgerEntity,
          }}
          currentCategory={category}
          onSuccess={handleRecategorizeSuccess}
        />
      ) : null}
    </>
  );
}
