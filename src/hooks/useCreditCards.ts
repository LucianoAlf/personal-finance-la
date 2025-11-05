import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import {
  CreditCard,
  CreditCardSummary,
  CreateCreditCardInput,
  UpdateCreditCardInput,
} from '@/types/database.types';

export function useCreditCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardsSummary, setCardsSummary] = useState<CreditCardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar cartões
  const fetchCards = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCards(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar cartões:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar resumo dos cartões (com view)
  const fetchCardsSummary = async () => {
    if (!user) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('v_credit_cards_summary')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;
      setCardsSummary(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar resumo dos cartões:', err);
    }
  };

  // Criar cartão
  const createCard = async (input: CreateCreditCardInput): Promise<CreditCard | null> => {
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from('credit_cards')
        .insert({
          user_id: user.id,
          ...input,
          available_limit: input.credit_limit, // Inicialmente, limite disponível = limite total
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchCards();
      await fetchCardsSummary();
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar cartão:', err);
      return null;
    }
  };

  // Atualizar cartão
  const updateCard = async (
    id: string,
    input: UpdateCreditCardInput
  ): Promise<CreditCard | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('credit_cards')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchCards();
      await fetchCardsSummary();
      return data;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao atualizar cartão:', err);
      return null;
    }
  };

  // Deletar cartão (soft delete)
  const deleteCard = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('credit_cards')
        .update({ is_archived: true, is_active: false })
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchCards();
      await fetchCardsSummary();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao deletar cartão:', err);
      return false;
    }
  };

  // Arquivar cartão
  const archiveCard = async (id: string): Promise<boolean> => {
    return await deleteCard(id);
  };

  // Ativar/Desativar cartão
  const toggleCardStatus = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('credit_cards')
        .update({ is_active: isActive })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchCards();
      await fetchCardsSummary();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao alterar status do cartão:', err);
      return false;
    }
  };

  // Cálculos agregados
  const getTotalLimit = (): number => {
    return cards.reduce((sum, card) => sum + card.credit_limit, 0);
  };

  const getTotalUsed = (): number => {
    return cards.reduce((sum, card) => sum + (card.credit_limit - card.available_limit), 0);
  };

  const getTotalAvailable = (): number => {
    return cards.reduce((sum, card) => sum + card.available_limit, 0);
  };

  const getActiveCardsCount = (): number => {
    return cards.filter(card => card.is_active).length;
  };

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchCards();
    fetchCardsSummary();

    const subscription = supabase
      .channel('credit_cards_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_cards',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCards();
          fetchCardsSummary();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    cards,
    cardsSummary,
    loading,
    error,
    fetchCards,
    fetchCardsSummary,
    createCard,
    updateCard,
    deleteCard,
    archiveCard,
    toggleCardStatus,
    getTotalLimit,
    getTotalUsed,
    getTotalAvailable,
    getActiveCardsCount,
  };
}
