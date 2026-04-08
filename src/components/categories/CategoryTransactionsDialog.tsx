import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/categories';
import { Skeleton } from '@/components/ui/skeleton';
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
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
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
      const { data: { user } } = await supabase.auth.getUser();
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

      const bankMapped: LedgerRow[] = (bankRes.data ?? []).map((t: any) => {
        const sortRaw = t.transaction_date || t.created_at;
        return {
          id: t.id,
          description: t.description ?? '',
          amount: Number(t.amount) || 0,
          sortAt: parseSortDate(sortRaw),
          ledgerEntity: 'transaction' as const,
        };
      });

      const cardMapped: LedgerRow[] = (cardRes.data ?? []).map((t: any) => {
        const sortRaw = t.purchase_date || t.created_at;
        return {
          id: t.id,
          description: t.description ?? '',
          amount: Number(t.amount) || 0,
          sortAt: parseSortDate(sortRaw),
          ledgerEntity: 'credit_card_transaction' as const,
        };
      });

      const merged = [...bankMapped, ...cardMapped].sort((a, b) =>
        a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0,
      );

      setRows(merged);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
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

  const totalAmount = rows.reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {category.name} - Transações
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'} (conta + cartão)
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhum lançamento nesta categoria
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map(row => (
                  <div
                    key={`${row.ledgerEntity}-${row.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500">
                            {format(new Date(row.sortAt), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {SOURCE_LABEL[row.ledgerEntity]}
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900 mb-1 break-words">
                          {row.description}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(row.amount)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleRecategorize(row)}
                      >
                        Recategorizar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedRow && (
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
      )}
    </>
  );
}
