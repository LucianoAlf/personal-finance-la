import { useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCreditCards } from '@/hooks/useCreditCards';
import { CreditCard } from '@/types/database.types';

import { CreditCardForm } from './CreditCardForm';

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

  const handleSubmit = async (data: any) => {
    setLoading(true);

    try {
      if (card) {
        const result = await updateCard(card.id, data);
        if (!result) throw new Error('Erro ao atualizar cartão');

        toast({
          title: 'Cartão atualizado!',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        const result = await createCard(data);
        if (!result) throw new Error('Erro ao criar cartão');

        toast({
          title: 'Cartão criado!',
          description: 'Seu novo cartão foi adicionado com sucesso.',
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      onSuccess?.();
      onOpenChange(false);
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-border/70 bg-card/95 p-0 text-foreground shadow-[0_30px_90px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">
            {card ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <CreditCardForm
            card={card}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            loading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
