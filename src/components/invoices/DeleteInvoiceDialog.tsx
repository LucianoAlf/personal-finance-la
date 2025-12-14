import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DeleteInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceMonth?: string;
  cardName?: string;
  onSuccess?: () => void;
}

export function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceMonth,
  cardName,
  onSuccess,
}: DeleteInvoiceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);

      // Primeiro, deletar as transações associadas
      const { error: txError } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('invoice_id', invoiceId);

      if (txError) {
        console.error('Erro ao deletar transações:', txError);
        // Continuar mesmo se não houver transações
      }

      // Deletar pagamentos associados
      const { error: paymentError } = await supabase
        .from('credit_card_payments')
        .delete()
        .eq('invoice_id', invoiceId);

      if (paymentError) {
        console.error('Erro ao deletar pagamentos:', paymentError);
        // Continuar mesmo se não houver pagamentos
      }

      // Deletar a fatura
      const { error: invoiceError } = await supabase
        .from('credit_card_invoices')
        .delete()
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      toast({
        title: 'Fatura excluída',
        description: 'A fatura e suas transações foram excluídas com sucesso.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Erro ao excluir fatura:', err);
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir a fatura.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir Fatura
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Tem certeza que deseja excluir esta fatura
              {invoiceMonth && cardName && (
                <span className="font-medium"> de {invoiceMonth} ({cardName})</span>
              )}
              ?
            </p>
            <p className="text-red-600 font-medium">
              Esta ação não pode ser desfeita. Todas as transações e pagamentos associados também serão excluídos.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Fatura'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
