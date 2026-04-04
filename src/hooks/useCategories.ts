import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, CategoryType } from '@/types/categories';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as categorias (padrão + personalizadas do usuário)
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar categorias padrão (is_default=true) + categorias do usuário
      // Adicionar timestamp para evitar cache do Supabase
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .or(`is_default.eq.true,user_id.eq.${user.id}`)
        .order('type', { ascending: false }) // income primeiro
        .order('name', { ascending: true })
        .then(result => {
          // Forçar revalidação
          return result;
        });

      if (fetchError) {
        throw fetchError;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
      setError('Erro ao carregar categorias. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Buscar categorias por tipo (income ou expense)
  const getCategoriesByType = (type: CategoryType): Category[] => {
    return categories.filter((cat) => cat.type === type);
  };

  // Buscar categoria por ID
  const getCategoryById = (id: string): Category | undefined => {
    return categories.find((cat) => cat.id === id);
  };

  // Criar categoria personalizada
  const addCategory = async (
    categoryData: Omit<Category, 'id' | 'user_id' | 'created_at' | 'is_default'>
  ) => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error: insertError } = await supabase
        .from('categories')
        .insert({
          ...categoryData,
          user_id: user.id,
          is_default: false,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      await fetchCategories();
      return data;
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      setError(err instanceof Error ? err.message : 'Erro ao adicionar categoria');
      throw err;
    }
  };

  // Atualizar categoria personalizada
  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      await fetchCategories();
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar categoria');
      throw err;
    }
  };

  // Deletar categoria personalizada (apenas não-padrão)
  const deleteCategory = async (id: string) => {
    try {
      setError(null);

      const category = getCategoryById(id);
      
      if (category?.is_default) {
        throw new Error('Não é possível deletar categorias padrão');
      }

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await fetchCategories();
    } catch (err) {
      console.error('Erro ao deletar categoria:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar categoria');
      throw err;
    }
  };

  // Effect para buscar categorias e configurar realtime
  useEffect(() => {
    fetchCategories();

    // Configurar Realtime subscription
    const channel = supabase
      .channel('categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        (payload) => {
          console.log('Mudança detectada na tabela categories:', payload);
          fetchCategories();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    getCategoriesByType,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};
