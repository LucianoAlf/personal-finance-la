import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tag, CreateTagInput, UpdateTagInput } from '@/types/tags';

export function useCreditCardTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Buscar todas as tags do usuário (reutiliza tabela tags)
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

  // Buscar tags de múltiplas transações de cartão em uma única query
  const getTagsForTransactions = async (
    transactionIds: string[]
  ): Promise<Record<string, Tag[]>> => {
    if (!transactionIds || transactionIds.length === 0) return {};
    try {
      const { data, error } = await supabase
        .from('credit_card_transaction_tags')
        .select('credit_card_transaction_id, tag:tags(*)')
        .in('credit_card_transaction_id', transactionIds);

      if (error) throw error;

      const map: Record<string, Tag[]> = {};
      (data as any[])?.forEach((row: any) => {
        const txId = row.credit_card_transaction_id;
        const tag: Tag | null = row.tag;
        if (!tag) return;
        if (!map[txId]) map[txId] = [];
        map[txId].push(tag);
      });

      return map;
    } catch (err) {
      console.error('Erro ao buscar tags de múltiplas transações de cartão:', err);
      return {};
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

  // Buscar tags de uma transação de cartão específica
  const getCreditCardTransactionTags = async (transactionId: string): Promise<Tag[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('credit_card_transaction_tags')
        .select('tag:tags(*)')
        .eq('credit_card_transaction_id', transactionId);

      if (fetchError) throw fetchError;
      return data?.map((item: any) => item.tag).filter(Boolean) || [];
    } catch (err) {
      console.error('Erro ao buscar tags da transação de cartão:', err);
      return [];
    }
  };

  // Adicionar tag a uma transação de cartão
  const addTagToCreditCardTransaction = async (transactionId: string, tagId: string): Promise<void> => {
    try {
      const { error: insertError } = await supabase
        .from('credit_card_transaction_tags')
        .insert({
          credit_card_transaction_id: transactionId,
          tag_id: tagId,
        });

      if (insertError) throw insertError;
    } catch (err) {
      console.error('Erro ao adicionar tag à transação de cartão:', err);
      throw err;
    }
  };

  // Remover tag de uma transação de cartão
  const removeTagFromCreditCardTransaction = async (transactionId: string, tagId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from('credit_card_transaction_tags')
        .delete()
        .eq('credit_card_transaction_id', transactionId)
        .eq('tag_id', tagId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Erro ao remover tag da transação de cartão:', err);
      throw err;
    }
  };

  // Atualizar tags de uma transação de cartão (substitui todas)
  const updateCreditCardTransactionTags = async (transactionId: string, tagIds: string[]): Promise<void> => {
    try {
      // Remover todas as tags existentes
      await supabase
        .from('credit_card_transaction_tags')
        .delete()
        .eq('credit_card_transaction_id', transactionId);

      // Adicionar novas tags
      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from('credit_card_transaction_tags')
          .insert(
            tagIds.map((tagId) => ({
              credit_card_transaction_id: transactionId,
              tag_id: tagId,
            }))
          );

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Erro ao atualizar tags da transação de cartão:', err);
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
    getCreditCardTransactionTags,
    getTagsForTransactions,
    addTagToCreditCardTransaction,
    removeTagFromCreditCardTransaction,
    updateCreditCardTransactionTags,
  };
}
