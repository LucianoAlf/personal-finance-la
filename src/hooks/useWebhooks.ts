// src/hooks/useWebhooks.ts
// Hook para gerenciar webhooks e seus logs

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
// Removed useAuthStore import - using supabase.auth directly
import { toast } from 'sonner';
import type {
  WebhookEndpoint,
  WebhookLog,
  CreateWebhookInput,
  UpdateWebhookInput,
} from '@/types/settings.types';

export function useWebhooks() {
  const [userId, setUserId] = useState<string | null>(null);

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
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWebhooks(data || []);
    } catch (err: any) {
      console.error('Error fetching webhooks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch logs for a webhook
  const fetchLogs = useCallback(
    async (webhookId: string, limit: number = 100) => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from('webhook_logs')
          .select('*')
          .eq('webhook_id', webhookId)
          .order('triggered_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        setLogs(data || []);
      } catch (err: any) {
        console.error('Error fetching webhook logs:', err);
        toast.error('Erro ao carregar logs');
      }
    },
    [userId]
  );

  // Create webhook (via Edge Function)
  const createWebhook = useCallback(
    async (input: CreateWebhookInput) => {
      if (!userId) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-webhook`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'create', ...input }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao criar webhook');
        }

        const data = await response.json();
        
        // Atualizar lista local
        await fetchWebhooks();
        
        toast.success('Webhook criado!');
        return data;
      } catch (err: any) {
        console.error('Error creating webhook:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [userId, fetchWebhooks]
  );

  // Update webhook (via Edge Function)
  const updateWebhook = useCallback(
    async (id: string, input: UpdateWebhookInput) => {
      if (!userId) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-webhook`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'update', id, ...input }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar webhook');
        }

        const data = await response.json();
        
        // Atualizar lista local
        await fetchWebhooks();
        
        toast.success('Webhook atualizado!');
        return data;
      } catch (err: any) {
        console.error('Error updating webhook:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [userId, fetchWebhooks]
  );

  // Delete webhook (via Edge Function)
  const deleteWebhook = useCallback(
    async (id: string) => {
      if (!userId) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-webhook`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'delete', id }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao deletar webhook');
        }

        // Atualizar lista local
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        
        toast.success('Webhook removido');
      } catch (err: any) {
        console.error('Error deleting webhook:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [userId]
  );

  // Test webhook connection (via Edge Function)
  const testWebhook = useCallback(
    async (webhookId: string, testPayload?: any) => {
      if (!userId) return;

      try {
        setTesting(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-webhook-connection`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ webhook_id: webhookId, test_payload: testPayload }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Erro ao testar webhook');
        }

        toast.success(`Webhook testado! Status: ${data.status_code} (${data.response_time_ms}ms)`);
        
        // Atualizar logs
        await fetchLogs(webhookId);
        
        return data;
      } catch (err: any) {
        console.error('Error testing webhook:', err);
        toast.error(err.message);
        throw err;
      } finally {
        setTesting(false);
      }
    },
    [userId, fetchLogs]
  );

  // Trigger webhook manually (via Edge Function)
  const triggerWebhook = useCallback(
    async (webhookId: string, payload: any) => {
      if (!userId) return;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-webhook`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ webhook_id: webhookId, payload }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Erro ao disparar webhook');
        }

        toast.success('Webhook disparado com sucesso!');
        
        // Atualizar logs
        await fetchLogs(webhookId);
        
        return data;
      } catch (err: any) {
        console.error('Error triggering webhook:', err);
        toast.error(err.message);
        throw err;
      }
    },
    [userId, fetchLogs]
  );

  // Computed values
  const activeWebhooks = webhooks.filter((w) => w.is_active);
  const recentlyTriggered = webhooks
    .filter((w) => w.last_triggered_at)
    .sort(
      (a, b) =>
        new Date(b.last_triggered_at!).getTime() - new Date(a.last_triggered_at!).getTime()
    );

  // Load on mount
  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('webhook_endpoints_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_endpoints',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchWebhooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchWebhooks]);

  return {
    // State
    webhooks,
    logs,
    activeWebhooks,
    recentlyTriggered,
    loading,
    testing,
    error,

    // Actions
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    triggerWebhook,
    fetchLogs,
    refresh: fetchWebhooks,
  };
}
