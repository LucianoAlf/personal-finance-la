import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { processGamificationEvent } from '@/lib/gamification';
import { Investment, CreateInvestmentInput, UpdateInvestmentInput } from '@/types/database.types';
import { normalizeInvestmentCategory } from '@/utils/investments/contracts';

const investmentsCache = new Map<string, Investment[]>();
const investmentRequests = new Map<string, Promise<Investment[]>>();

const normalizeInvestments = (rows: Investment[] | null | undefined): Investment[] => rows || [];

const requestActiveInvestmentsForUser = (userId: string): Promise<Investment[]> => {
  const existingRequest = investmentRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async (): Promise<Investment[]> => {
    const { data, error: fetchError } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    const normalized = normalizeInvestments(data);
    investmentsCache.set(userId, normalized);
    return normalized;
  })();

  investmentRequests.set(userId, request);
  request.finally(() => {
    investmentRequests.delete(userId);
  });

  return request;
};

export const getCachedInvestmentsForUser = (userId: string) => investmentsCache.get(userId);

export const loadActiveInvestmentsForUser = (userId: string) => requestActiveInvestmentsForUser(userId);

/**
 * Hook para gerenciar investimentos do usuário
 * CRUD completo com Realtime subscriptions
 */
export function useInvestments() {
  const { user, loading: authLoading } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>(() =>
    user?.id ? getCachedInvestmentsForUser(user.id) ?? [] : []
  );
  const [loading, setLoading] = useState(() =>
    user?.id ? !investmentsCache.has(user.id) : true
  );
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH: Buscar investimentos
  // ============================================
  const fetchInvestments = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setInvestments([]);
      setError(null);
      setLoading(false);
      return [];
    }

    const cached = getCachedInvestmentsForUser(user.id);

    try {
      setLoading(!cached);
      setError(null);

      if (cached) {
        setInvestments(cached);
      }

      const resolvedInvestments = await requestActiveInvestmentsForUser(user.id);
      setInvestments(resolvedInvestments);
      return resolvedInvestments;
    } catch (err: any) {
      console.error('❌ Erro ao buscar investimentos:', err);
      setError(err.message);
      toast.error('Erro ao carregar investimentos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.id]);

  // ============================================
  // CREATE: Adicionar investimento
  // ============================================
  const addInvestment = async (input: CreateInvestmentInput): Promise<Investment | null> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      // Calcular total_invested
      const total_invested = input.quantity * input.purchase_price;
      
      // Calcular current_value
      const current_value = input.current_price 
        ? input.quantity * input.current_price 
        : total_invested;

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          type: input.type,
          category: normalizeInvestmentCategory(input.category, input.type),
          name: input.name,
          ticker: input.ticker || null,
          quantity: input.quantity,
          purchase_price: input.purchase_price,
          current_price: input.current_price || null,
          total_invested,
          current_value,
          purchase_date: input.purchase_date || null,
          subcategory: input.subcategory || null,
          annual_rate: input.annual_rate || null,
          maturity_date: input.maturity_date || null,
          dividend_yield: input.dividend_yield || null,
          notes: input.notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchInvestments(); // Recarregar lista
      await processGamificationEvent('create_investment');
      toast.success(`✅ ${input.name} adicionado ao portfólio!`);
      return data;
    } catch (err: any) {
      console.error('❌ Erro ao adicionar investimento:', err);
      toast.error('Erro ao adicionar investimento');
      return null;
    }
  };

  // ============================================
  // UPDATE: Editar investimento
  // ============================================
  const updateInvestment = async (
    id: string, 
    input: UpdateInvestmentInput
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // Se alterou quantity ou purchase_price, recalcular total_invested
      const updates: any = { ...input };
      if (input.category !== undefined || input.type !== undefined) {
        const current = investments.find((i) => i.id === id);
        updates.category = normalizeInvestmentCategory(
          input.category ?? current?.category,
          input.type ?? current?.type
        );
      }
      
      if (input.quantity !== undefined || input.purchase_price !== undefined) {
        const current = investments.find(i => i.id === id);
        if (current) {
          const newQty = input.quantity ?? current.quantity;
          const newPrice = input.purchase_price ?? current.purchase_price;
          updates.total_invested = newQty * newPrice;
          
          // Recalcular current_value se tiver current_price
          const currentPrice = input.current_price ?? current.current_price;
          if (currentPrice) {
            updates.current_value = newQty * currentPrice;
          } else {
            updates.current_value = updates.total_invested;
          }
        }
      }

      const { error } = await supabase
        .from('investments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchInvestments();
      toast.success('✅ Investimento atualizado!');
      return true;
    } catch (err: any) {
      console.error('❌ Erro ao atualizar investimento:', err);
      toast.error('Erro ao atualizar investimento');
      return false;
    }
  };

  // ============================================
  // DELETE: Remover investimento (soft delete)
  // ============================================
  const deleteInvestment = async (id: string): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('investments')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchInvestments();
      toast.success('✅ Investimento removido!');
      return true;
    } catch (err: any) {
      console.error('❌ Erro ao deletar investimento:', err);
      toast.error('Erro ao deletar investimento');
      return false;
    }
  };

  // ============================================
  // UPDATE PRICE: Atualizar cotação
  // ============================================
  const updatePrice = async (id: string, newPrice: number): Promise<boolean> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const investment = investments.find(i => i.id === id);
      if (!investment) {
        throw new Error('Investimento não encontrado');
      }

      const current_value = investment.quantity * newPrice;

      const { error } = await supabase
        .from('investments')
        .update({ 
          current_price: newPrice,
          current_value,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchInvestments();
      toast.success('✅ Cotação atualizada!');
      return true;
    } catch (err: any) {
      console.error('❌ Erro ao atualizar preço:', err);
      toast.error('Erro ao atualizar cotação');
      return false;
    }
  };

  // ============================================
  // EFFECT: Carregar ao montar
  // ============================================
  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  // ============================================
  // REALTIME: Subscription
  // ============================================
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('investments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Realtime update:', payload);
          fetchInvestments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchInvestments]);

  // ============================================
  // RETURN: API pública do hook
  // ============================================
  return {
    investments,
    loading,
    error,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    updatePrice,
    refresh: fetchInvestments,
  };
}
