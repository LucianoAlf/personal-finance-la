import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface CategoryRule {
  id: string;
  user_id: string;
  merchant_pattern: string;
  category_id: string;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
}

export function useCategoryRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as regras do usuário
  const fetchRules = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('category_rules')
        .select(`
          *,
          category:category_id (
            id,
            name,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRules(data || []);
    } catch (err) {
      console.error('Erro ao buscar regras:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar regras');
    } finally {
      setLoading(false);
    }
  };

  // Criar nova regra
  const createRule = async (merchantPattern: string, categoryId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: insertError } = await supabase
        .from('category_rules')
        .upsert({
          user_id: user.id,
          merchant_pattern: merchantPattern,
          category_id: categoryId,
        }, {
          onConflict: 'user_id,merchant_pattern',
        });

      if (insertError) throw insertError;

      await fetchRules();
      return true;
    } catch (err) {
      console.error('Erro ao criar regra:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar regra');
      return false;
    }
  };

  // Criar múltiplas regras de uma vez
  const createBulkRules = async (
    patterns: string[],
    categoryId: string
  ): Promise<boolean> => {
    if (!user || patterns.length === 0) return false;

    try {
      setError(null);

      const rulesToInsert = patterns.map((pattern) => ({
        user_id: user.id,
        merchant_pattern: `%${pattern}%`,
        category_id: categoryId,
      }));

      const { error: insertError } = await supabase
        .from('category_rules')
        .upsert(rulesToInsert, {
          onConflict: 'user_id,merchant_pattern',
        });

      if (insertError) throw insertError;

      await fetchRules();
      return true;
    } catch (err) {
      console.error('Erro ao criar regras em lote:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar regras');
      return false;
    }
  };

  // Atualizar regra existente
  const updateRule = async (
    ruleId: string,
    updates: Partial<Pick<CategoryRule, 'merchant_pattern' | 'category_id'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('category_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchRules();
      return true;
    } catch (err) {
      console.error('Erro ao atualizar regra:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar regra');
      return false;
    }
  };

  // Deletar regra
  const deleteRule = async (ruleId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('category_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await fetchRules();
      return true;
    } catch (err) {
      console.error('Erro ao deletar regra:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar regra');
      return false;
    }
  };

  // Verificar se existe regra para um padrão
  const hasRuleForPattern = (pattern: string): boolean => {
    return rules.some(
      (rule) => rule.merchant_pattern.toLowerCase() === `%${pattern.toLowerCase()}%`
    );
  };

  // Effect para buscar regras
  useEffect(() => {
    if (user) {
      fetchRules();
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('category_rules_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'category_rules',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    rules,
    loading,
    error,
    fetchRules,
    createRule,
    createBulkRules,
    updateRule,
    deleteRule,
    hasRuleForPattern,
  };
}
