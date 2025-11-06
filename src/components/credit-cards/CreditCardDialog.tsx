import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditCardForm } from './CreditCardForm';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCard } from '@/types/database.types';
import { useToast } from '@/hooks/use-toast';

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CreditCard;
  onSuccess?: () => void;
}

export function CreditCardDialog({ open, onOpenChange, card, onSuccess }: CreditCardDialogProps) {
  const { createCard, updateCard } = useCreditCards();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  console.log('CreditCardDialog renderizado - open:', open, 'card:', card);

  const handleSubmit = async (data: any) => {
    setLoading(true);

    try {
      if (card) {
        // Modo edição
        const result = await updateCard(card.id, data);
        if (result) {
          toast({
            title: 'Cartão atualizado!',
            description: 'As alterações foram salvas com sucesso.',
          });
          onSuccess?.();
          onOpenChange(false);
        } else {
          throw new Error('Erro ao atualizar cartão');
        }
      } else {
        // Modo criação
        const result = await createCard(data);
        if (result) {
          toast({
            title: 'Cartão criado!',
            description: 'Seu novo cartão foi adicionado com sucesso.',
          });
          // Aguardar um pouco para o realtime subscription processar
          await new Promise(resolve => setTimeout(resolve, 500));
          onSuccess?.();
          onOpenChange(false);
        } else {
          throw new Error('Erro ao criar cartão');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao salvar o cartão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {card ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
          </DialogTitle>
        </DialogHeader>

        <CreditCardForm
          card={card}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          loading={loading}
        />
      </DialogContent>
    </Dialog>
  );
}
