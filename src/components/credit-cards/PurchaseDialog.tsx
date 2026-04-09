import { useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useInvoices } from '@/hooks/useInvoices';
import { supabase } from '@/lib/supabase';
import { replaceCanonicalTagAssignments } from '@/utils/tags/tag-assignment';

import { PurchaseForm } from './PurchaseForm';

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
    if (!nextOpen) setPendingCreatedPurchase(null);
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

    if (!result.success) {
      toast({
        title: 'Erro ao lançar compra',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }

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
      } catch (error) {
        console.error('Erro ao salvar tags:', error);
        tagsFailed = true;
      }
    }

    if (tagsFailed) {
      toast({
        title: 'Compra criada, mas as tags falharam',
        description: 'Revise e tente salvar novamente. A compra ja criada sera reutilizada no retry.',
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
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            Nova Compra no Cartão
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <PurchaseForm
            preSelectedCardId={cardId}
            onSubmit={handleSubmit}
            onCancel={() => handleDialogOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
