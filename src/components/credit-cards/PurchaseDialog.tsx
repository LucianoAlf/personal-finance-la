import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PurchaseForm } from './PurchaseForm';
import { useCreditCardTransactions } from '@/hooks/useCreditCardTransactions';
import { useToast } from '@/hooks/use-toast';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useInvoices } from '@/hooks/useInvoices';

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

  const handleSubmit = async (data: any) => {
    const result = await createPurchase(data);

    if (result.success) {
      toast({
        title: 'Compra lançada com sucesso!',
        description: `${data.installments}x de R$ ${(data.amount / data.installments).toFixed(2)}`,
      });
      // Fallback agressivo: refetch imediato para refletir na UI
      fetchCards();
      fetchCardsSummary();
      fetchInvoices();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Compra no Cartão</DialogTitle>
        </DialogHeader>
        <PurchaseForm
          preSelectedCardId={cardId}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
