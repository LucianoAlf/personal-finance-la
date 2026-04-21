import { useState } from 'react';

import { ResponsiveDialog, ResponsiveDialogHeader, ResponsiveDialogBody } from '@/components/ui/responsive-dialog';
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
      <ResponsiveDialogHeader
        title={card ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
        onClose={() => onOpenChange(false)}
      />
      <ResponsiveDialogBody>
        <CreditCardForm
          card={card}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          loading={loading}
        />
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
