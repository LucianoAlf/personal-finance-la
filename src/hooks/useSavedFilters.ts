import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { FilterConfig } from '@/components/transactions/AdvancedFiltersModal';

interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filter_config: FilterConfig;
  created_at: string;
  updated_at: string;
}

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Buscar todos os filtros salvos do usuário
  const fetchSavedFilters = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Converter datas do JSONB de volta para Date objects
      const filtersWithDates = (data || []).map((filter) => ({
        ...filter,
        filter_config: {
          ...filter.filter_config,
          dateRange: {
            from: filter.filter_config.dateRange.from 
              ? new Date(filter.filter_config.dateRange.from) 
              : null,
            to: filter.filter_config.dateRange.to 
              ? new Date(filter.filter_config.dateRange.to) 
              : null,
          },
        },
      }));

      setSavedFilters(filtersWithDates);
    } catch (err) {
      setError(err as Error);
      console.error('Erro ao buscar filtros salvos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar novo filtro salvo
  const createSavedFilter = async (name: string, filterConfig: FilterConfig): Promise<SavedFilter | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: createError } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name: name.trim(),
          filter_config: filterConfig,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Converter datas
      const filterWithDates = {
        ...data,
        filter_config: {
          ...data.filter_config,
          dateRange: {
            from: data.filter_config.dateRange.from 
              ? new Date(data.filter_config.dateRange.from) 
              : null,
            to: data.filter_config.dateRange.to 
              ? new Date(data.filter_config.dateRange.to) 
              : null,
          },
        },
      };

      // Atualizar lista local
      setSavedFilters((prev) => [filterWithDates, ...prev]);
      return filterWithDates;
    } catch (err) {
      console.error('Erro ao criar filtro salvo:', err);
      throw err;
    }
  };

  // Deletar filtro salvo
  const deleteSavedFilter = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Atualizar lista local
      setSavedFilters((prev) => prev.filter((filter) => filter.id !== id));
    } catch (err) {
      console.error('Erro ao deletar filtro salvo:', err);
      throw err;
    }
  };

  // Atualizar filtro salvo
  const updateSavedFilter = async (id: string, name: string, filterConfig: FilterConfig): Promise<SavedFilter | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('saved_filters')
        .update({
          name: name.trim(),
          filter_config: filterConfig,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Converter datas
      const filterWithDates = {
        ...data,
        filter_config: {
          ...data.filter_config,
          dateRange: {
            from: data.filter_config.dateRange.from 
              ? new Date(data.filter_config.dateRange.from) 
              : null,
            to: data.filter_config.dateRange.to 
              ? new Date(data.filter_config.dateRange.to) 
              : null,
          },
        },
      };

      // Atualizar lista local
      setSavedFilters((prev) =>
        prev.map((filter) => (filter.id === id ? filterWithDates : filter))
      );
      return filterWithDates;
    } catch (err) {
      console.error('Erro ao atualizar filtro salvo:', err);
      throw err;
    }
  };

  // Carregar filtros ao montar o componente
  useEffect(() => {
    fetchSavedFilters();

    // Configurar Realtime subscription
    const channel = supabase
      .channel('saved_filters_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_filters',
        },
        () => {
          fetchSavedFilters();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    savedFilters,
    loading,
    error,
    fetchSavedFilters,
    createSavedFilter,
    deleteSavedFilter,
    updateSavedFilter,
  };
}
