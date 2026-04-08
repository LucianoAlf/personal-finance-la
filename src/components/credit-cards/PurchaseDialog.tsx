import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PurchaseForm } from './PurchaseForm';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useToast } from '@/hooks/use-toast';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/lib/supabase';
import { replaceCanonicalTagAssignments } from '@/utils/tags/tag-assignment';

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId?: string;
  onSuccess?: (result?: { invoiceId?: string }) => void;
}

export function PurchaseDialog({ open, onOpenChange, cardId, onSuccess }: PurchaseDialogProps) {
  const { createPurchase } = useCreditCardTransactions();
  const { toast } = useToast();
  const { fetchCards, fetchCardsSummary } = useCreditCards();
  const { fetchInvoices } = useInvoices();
  const [pendingCreatedPurchase, setPendingCreatedPurchase] = useState<{
    invoiceId?: string;
    transactionIds: string[];
  } | null>(null);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPendingCreatedPurchase(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (data: any, selectedTags: string[]) => {
    const result =
      pendingCreatedPurchase === null
        ? await createPurchase(data)
        : {
            success: true as const,
            invoiceId: pendingCreatedPurchase.invoiceId,
            transactionIds: pendingCreatedPurchase.transactionIds,
          };

    if (result.success) {
      const transactionIds = result.transactionIds || [];

      if (!pendingCreatedPurchase) {
        setPendingCreatedPurchase({
          invoiceId: result.invoiceId,
          transactionIds,
        });
      }

      let tagsFailed = false;
      if (selectedTags.length > 0 && transactionIds.length > 0) {
        try {
          await Promise.all(
            transactionIds.map((txId) =>
              replaceCanonicalTagAssignments(supabase, {
                entityType: 'credit_card_transaction',
                entityId: txId,
                tagIds: selectedTags,
              }),
            ),
          );
        } catch (err) {
          console.error('Erro ao salvar tags:', err);
          tagsFailed = true;
        }
      }

      if (tagsFailed) {
        toast({
          title: 'Compra criada, mas as tags falharam',
          description:
            'Revise e tente salvar novamente. A compra ja criada sera reutilizada no retry.',
          variant: 'destructive',
        });
        return;
      }

      setPendingCreatedPurchase(null);
      toast({
        title: 'Compra lançada com sucesso!',
        description: `${data.installments}x de R$ ${(data.amount / data.installments).toFixed(2)}`,
      });
      fetchCards();
      fetchCardsSummary();
      fetchInvoices();
      handleDialogOpenChange(false);
      onSuccess?.(result);
    } else {
      toast({
        title: 'Erro ao lançar compra',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Compra no Cartão</DialogTitle>
        </DialogHeader>
        <PurchaseForm
          preSelectedCardId={cardId}
          onSubmit={handleSubmit}
          onCancel={() => handleDialogOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
