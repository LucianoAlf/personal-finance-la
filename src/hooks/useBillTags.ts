import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Tag } from '@/types/tags';

export function useBillTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar todas as tags do usuário
  const fetchTags = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Erro ao buscar tags:', error);
      toast.error('Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Criar nova tag
  const createTag = async (name: string): Promise<Tag | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ user_id: user.id, name: name.trim() }])
        .select()
        .single();

      if (error) throw error;

      setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Tag criada com sucesso!');
      return data;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe uma tag com este nome');
      } else {
        console.error('Erro ao criar tag:', error);
        toast.error('Erro ao criar tag');
      }
      return null;
    }
  };

  // Buscar tags de uma conta
  const getBillTags = async (billId: string): Promise<Tag[]> => {
    try {
      const { data, error } = await supabase
        .from('bill_tags')
        .select(`
          tags (*)
        `)
        .eq('bill_id', billId);

      if (error) throw error;
      
      // Extrair os objetos tags do array de resultados
      const tagsList = (data || [])
        .map((item: any) => item.tags)
        .filter(Boolean) as Tag[];
        
      return tagsList;
    } catch (error) {
      console.error('Erro ao buscar tags da conta:', error);
      return [];
    }
  };

  // Atualizar tags de uma conta
  const updateBillTags = async (billId: string, tagIds: string[]) => {
    try {
      // Deletar todas as tags existentes
      const { error: deleteError } = await supabase
        .from('bill_tags')
        .delete()
        .eq('bill_id', billId);

      if (deleteError) throw deleteError;

      // Inserir novas tags
      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from('bill_tags')
          .insert(tagIds.map(tagId => ({ bill_id: billId, tag_id: tagId })));

        if (insertError) throw insertError;
      }

      toast.success('Tags atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar tags:', error);
      toast.error('Erro ao atualizar tags');
      throw error;
    }
  };

  // Deletar tag
  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      setTags(prev => prev.filter(tag => tag.id !== tagId));
      toast.success('Tag deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar tag:', error);
      toast.error('Erro ao deletar tag');
      throw error;
    }
  };

  return {
    tags,
    loading,
    createTag,
    getBillTags,
    updateBillTags,
    deleteTag,
    refreshTags: fetchTags,
  };
}
