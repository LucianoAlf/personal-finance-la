// src/hooks/useAIProviders.ts
// Hook para gerenciar provedores de IA

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type {
  AIProviderConfig,
  CreateAIProviderInput,
  UpdateAIProviderInput,
  AIProviderType,
} from '@/types/settings.types';

export function useAIProviders() {
  const [userId, setUserId] = useState<string | null>(null);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch providers
  const fetchProviders = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setProviders(data || []);
    } catch (err: any) {
      console.error('Error fetching AI providers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Create provider (via Edge Function)
  const createProvider = useCallback(
    async (input: CreateAIProviderInput) => {
      if (!userId) return { error: 'Não autenticado. Faça login para criar um provedor.' };

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error('Session error:', sessionError);
          toast.error('Sessão expirada. Faça login novamente.');
          throw new Error('Não autenticado');
        }
        const token = sessionData.session.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-ai-config`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar provedor');
        }

        const data = await response.json();
        
        // Atualizar lista local
        await fetchProviders();
        
        toast.success(`Provedor ${input.provider.toUpperCase()} configurado!`);
        return data;
      } catch (err: any) {
        console.error('Error creating AI provider:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [userId, fetchProviders]
  );

  // Update provider
  const updateProvider = useCallback(
    async (provider: AIProviderType, input: UpdateAIProviderInput) => {
      if (!userId) return;

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error('Session error:', sessionError);
          toast.error('Sessão expirada. Faça login novamente.');
          throw new Error('Não autenticado');
        }
        const token = sessionData.session.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-ai-config`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider, ...input }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar provedor');
        }

        const data = await response.json();
        
        // Atualizar lista local
        await fetchProviders();
        
        toast.success('Provedor atualizado!');
        return data;
      } catch (err: any) {
        console.error('Error updating AI provider:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [userId, fetchProviders]
  );

  // Delete provider
  const deleteProvider = useCallback(
    async (id: string) => {
      if (!userId) return;

      try {
        const { error } = await supabase
          .from('ai_provider_configs')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;

        // Atualizar lista local
        setProviders((prev) => prev.filter((p) => p.id !== id));
        
        toast.success('Provedor removido');
      } catch (err: any) {
        console.error('Error deleting AI provider:', err);
        toast.error('Erro ao remover provedor');
        throw err;
      }
    },
    [userId]
  );

  // Validate API Key (via Edge Function)
  const validateApiKey = useCallback(
    async (provider: AIProviderType, apiKey: string, modelName?: string) => {
      if (!userId) return { valid: false, error: 'Não autenticado. Faça login para validar a chave.' };

      try {
        setValidating(true);

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          console.error('Session error:', sessionError);
          toast.error('Sessão expirada. Faça login novamente.');
          return { valid: false, error: 'Sessão expirada' };
        }

        const token = sessionData.session.access_token;
        
        console.log('Validating API key with token:', token ? 'present' : 'missing');

        const payload = { provider, api_key: apiKey, model_name: modelName };

        const { data, error } = await supabase.functions.invoke('validate-api-key', {
          body: JSON.stringify(payload),
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (error) {
          console.error('Validation failed:', error?.status || 'unknown', error);
          toast.error(error.message || 'API Key inválida');
          return { valid: false, error: error.message };
        }

        // Respeita o resultado vindo da função
        console.log('Validation result:', data);
        if (!data || (data as any).valid !== true) {
          const errMsg = (data as any)?.error || 'API Key inválida';
          toast.error(errMsg);
          return { valid: false, error: errMsg } as any;
        }

        toast.success('API Key validada com sucesso!');
        
        // Atualizar lista local
        await fetchProviders();
        
        return data as any;
      } catch (err: any) {
        console.error('Error validating API key:', err);
        toast.error('Erro ao validar API Key');
        return { valid: false, error: err.message };
      } finally {
        setValidating(false);
      }
    },
    [userId, fetchProviders]
  );

  // Set default provider
  const setDefaultProvider = useCallback(
    async (id: string) => {
      if (!userId) return;

      try {
        // Primeiro, desmarcar todos
        const { error: updateError } = await supabase
          .from('ai_provider_configs')
          .update({ is_default: false })
          .eq('user_id', userId);

        if (updateError) throw updateError;

        // Depois, marcar o selecionado
        const { error: setError } = await supabase
          .from('ai_provider_configs')
          .update({ is_default: true })
          .eq('id', id)
          .eq('user_id', userId);

        if (setError) throw setError;

        // Atualizar lista local
        await fetchProviders();
        
        toast.success('Provedor padrão atualizado!');
      } catch (err: any) {
        console.error('Error setting default provider:', err);
        toast.error('Erro ao definir provedor padrão');
        throw err;
      }
    },
    [userId, fetchProviders]
  );

  // Computed values
  const defaultProvider = providers.find((p) => p.is_default);
  const activeProviders = providers.filter((p) => p.is_active);
  const validatedProviders = providers.filter((p) => p.is_validated);

  // Load on mount
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('ai_provider_configs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_provider_configs',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchProviders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchProviders]);

  return {
    // State
    providers,
    defaultProvider,
    activeProviders,
    validatedProviders,
    loading,
    validating,
    error,

    // Actions
    createProvider,
    updateProvider,
    deleteProvider,
    validateApiKey,
    setDefaultProvider,
    refresh: fetchProviders,
  };
}
