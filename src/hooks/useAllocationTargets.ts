// SPRINT 4 DIA 2: Hook para gerenciar metas de alocação
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface AllocationTarget {
  id: string;
  user_id: string;
  asset_class: string;
  target_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAllocationTargetInput {
  asset_class: string;
  target_percentage: number;
}

export function useAllocationTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<AllocationTarget[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch targets
  const fetchTargets = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('investment_allocation_targets')
        .select('*')
        .eq('user_id', user.id)
        .order('asset_class');

      if (error) throw error;

      setTargets(data || []);
    } catch (error) {
      console.error('Erro ao buscar metas de alocação:', error);
      toast.error('Erro ao carregar metas de alocação');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Add target
  const addTarget = useCallback(
    async (input: CreateAllocationTargetInput) => {
      if (!user) return;

      try {
        // Validar que soma não exceda 100%
        const currentTotal = targets.reduce(
          (sum, t) => (t.asset_class !== input.asset_class ? sum + t.target_percentage : sum),
          0
        );

        if (currentTotal + input.target_percentage > 100) {
          toast.error('A soma das metas não pode exceder 100%');
          return;
        }

        const { data, error } = await supabase
          .from('investment_allocation_targets')
          .insert({
            user_id: user.id,
            ...input,
          })
          .select()
          .single();

        if (error) throw error;

        setTargets((prev) => [...prev, data]);
        toast.success('Meta de alocação criada');
      } catch (error: any) {
        console.error('Erro ao criar meta:', error);
        
        if (error.code === '23505') {
          toast.error('Já existe uma meta para esta classe de ativo');
        } else {
          toast.error('Erro ao criar meta de alocação');
        }
      }
    },
    [user, targets]
  );

  // Update target
  const updateTarget = useCallback(
    async (id: string, target_percentage: number) => {
      try {
        // Validar que soma não exceda 100%
        const currentTotal = targets.reduce(
          (sum, t) => (t.id !== id ? sum + t.target_percentage : sum),
          0
        );

        if (currentTotal + target_percentage > 100) {
          toast.error('A soma das metas não pode exceder 100%');
          return;
        }

        const { data, error } = await supabase
          .from('investment_allocation_targets')
          .update({ target_percentage, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        setTargets((prev) => prev.map((t) => (t.id === id ? data : t)));
        toast.success('Meta atualizada');
      } catch (error) {
        console.error('Erro ao atualizar meta:', error);
        toast.error('Erro ao atualizar meta');
      }
    },
    [targets]
  );

  // Delete target
  const deleteTarget = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('investment_allocation_targets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTargets((prev) => prev.filter((t) => t.id !== id));
      toast.success('Meta removida');
    } catch (error) {
      console.error('Erro ao deletar meta:', error);
      toast.error('Erro ao remover meta');
    }
  }, []);

  // Set default targets (se não existir)
  const setDefaultTargets = useCallback(async () => {
    if (!user || targets.length > 0) return;

    const defaultTargets: CreateAllocationTargetInput[] = [
      { asset_class: 'renda_fixa', target_percentage: 30 },
      { asset_class: 'acoes_nacionais', target_percentage: 40 },
      { asset_class: 'fiis', target_percentage: 20 },
      { asset_class: 'internacional', target_percentage: 10 },
    ];

    try {
      const { data, error } = await supabase
        .from('investment_allocation_targets')
        .insert(
          defaultTargets.map((t) => ({
            user_id: user.id,
            ...t,
          }))
        )
        .select();

      if (error) throw error;

      setTargets(data || []);
      toast.success('Metas padrão configuradas');
    } catch (error) {
      console.error('Erro ao criar metas padrão:', error);
    }
  }, [user, targets]);

  // Calcular total alocado
  const totalAllocated = targets.reduce((sum, t) => sum + t.target_percentage, 0);

  useEffect(() => {
    if (user) {
      fetchTargets();
    }
  }, [user, fetchTargets]);

  return {
    targets,
    loading,
    totalAllocated,
    addTarget,
    updateTarget,
    deleteTarget,
    setDefaultTargets,
    refetch: fetchTargets,
  };
}
