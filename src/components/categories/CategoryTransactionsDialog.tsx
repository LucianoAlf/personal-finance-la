import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  created_at: string;
}

export function CategoryTransactionsDialog({
  open,
  onOpenChange,
  category,
}: CategoryTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [recategorizeOpen, setRecategorizeOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, category.id]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select('id, description, amount, created_at')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorize = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setRecategorizeOpen(true);
  };

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

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
            {/* Resumo */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  {transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Lista de Transações */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhuma transação nesta categoria
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(transaction => (
                  <div
                    key={transaction.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-500">
                            📅 {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 mb-1">
                          {transaction.description}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecategorize(transaction)}
                      >
                        Recategorizar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botão Fechar */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Recategorizar */}
      {selectedTransaction && (
        <RecategorizeDialog
          open={recategorizeOpen}
          onOpenChange={setRecategorizeOpen}
          transaction={selectedTransaction}
          currentCategory={category}
          onSuccess={fetchTransactions}
        />
      )}
    </>
  );
}
