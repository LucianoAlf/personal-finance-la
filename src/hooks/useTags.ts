import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tag, CreateTagInput, UpdateTagInput } from '@/types/tags';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Buscar todas as tags do usuário
  const fetchTags = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setTags(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Erro ao buscar tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar nova tag
  const createTag = async (input: CreateTagInput): Promise<Tag | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error: createError } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          color: input.color || '#6B7280',
        })
        .select()
        .single();

      if (createError) throw createError;

      // Atualizar lista local
      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      console.error('Erro ao criar tag:', err);
      throw err;
    }
  };

  // Atualizar tag
  const updateTag = async (id: string, input: UpdateTagInput): Promise<Tag | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from('tags')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Atualizar lista local
      setTags((prev) =>
        prev.map((tag) => (tag.id === id ? data : tag)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return data;
    } catch (err) {
      console.error('Erro ao atualizar tag:', err);
      throw err;
    }
  };

  // Deletar tag
  const deleteTag = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Atualizar lista local
      setTags((prev) => prev.filter((tag) => tag.id !== id));
    } catch (err) {
      console.error('Erro ao deletar tag:', err);
      throw err;
    }
  };

  // Buscar tags de uma transação específica
  const getTransactionTags = async (transactionId: string): Promise<Tag[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('transaction_tags')
        .select('tag:tags(*)')
        .eq('transaction_id', transactionId);

      if (fetchError) throw fetchError;
      return data?.map((item: any) => item.tag).filter(Boolean) || [];
    } catch (err) {
      console.error('Erro ao buscar tags da transação:', err);
      return [];
    }
  };

  // Adicionar tag a uma transação
  const addTagToTransaction = async (transactionId: string, tagId: string): Promise<void> => {
    try {
      const { error: insertError } = await supabase
        .from('transaction_tags')
        .insert({
          transaction_id: transactionId,
          tag_id: tagId,
        });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Erro ao adicionar tag à transação:', err);
      throw err;
    }
  };

  // Remover tag de uma transação
  const removeTagFromTransaction = async (transactionId: string, tagId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId)
        .eq('tag_id', tagId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Erro ao remover tag da transação:', err);
      throw err;
    }
  };

  // Atualizar tags de uma transação (substitui todas)
  const updateTransactionTags = async (transactionId: string, tagIds: string[]): Promise<void> => {
    try {
      // Remover todas as tags existentes
      await supabase
        .from('transaction_tags')
        .delete()
        .eq('transaction_id', transactionId);

      // Adicionar novas tags
      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from('transaction_tags')
          .insert(
            tagIds.map((tagId) => ({
              transaction_id: transactionId,
              tag_id: tagId,
            }))
          );

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Erro ao atualizar tags da transação:', err);
      throw err;
    }
  };

  // Carregar tags ao montar o componente
  useEffect(() => {
    fetchTags();
  }, []);

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    getTransactionTags,
    addTagToTransaction,
    removeTagFromTransaction,
    updateTransactionTags,
  };
}
