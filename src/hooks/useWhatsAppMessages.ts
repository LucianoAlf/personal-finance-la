/**
 * Hook: useWhatsAppMessages
 * Responsabilidade: Gerenciar mensagens WhatsApp do usuário
 * 
 * Features:
 * - Buscar mensagens com filtros
 * - Realtime updates
 * - Paginação
 * - Estatísticas
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  WhatsAppMessage,
  WhatsAppStats,
  MessageDirection,
  IntentType,
  ProcessingStatus,
} from '@/types/whatsapp.types';

interface MessageFilters {
  direction?: MessageDirection;
  intent?: IntentType;
  status?: ProcessingStatus;
  startDate?: Date;
  endDate?: Date;
}

interface UseWhatsAppMessagesReturn {
  messages: WhatsAppMessage[];
  stats: WhatsAppStats | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilters: (filters: MessageFilters) => void;
}

const PAGE_SIZE = 50;

export function useWhatsAppMessages(
  initialFilters: MessageFilters = {}
): UseWhatsAppMessagesReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<MessageFilters>(initialFilters);

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

  // Fetch messages
  const fetchMessages = async (pageNum: number, append = false) => {
    if (!userId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      if (!append) setIsLoading(true);
      setError(null);

      let query = supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('received_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      // Apply filters
      if (filters.direction) {
        query = query.eq('direction', filters.direction);
      }
      if (filters.intent) {
        query = query.eq('intent', filters.intent);
      }
      if (filters.status) {
        query = query.eq('processing_status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('received_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('received_at', filters.endDate.toISOString());
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      if (append) {
        setMessages((prev) => [...prev, ...(data || [])]);
      } else {
        setMessages(data || []);
      }

      setHasMore(count ? (pageNum + 1) * PAGE_SIZE < count : false);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    if (!userId) return;

    try {
      const { data, error: statsError } = await supabase
        .from('whatsapp_connection_status')
        .select('total_messages_sent, total_messages_received, last_message_at')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      if (data) {
        // Buscar estatísticas detalhadas
        const { data: messagesData } = await supabase
          .from('whatsapp_messages')
          .select('processing_status, intent')
          .eq('user_id', userId);

        const totalMessages = messagesData?.length || 0;
        const successCount = messagesData?.filter((m) => m.processing_status === 'completed').length || 0;
        const failedCount = messagesData?.filter((m) => m.processing_status === 'failed').length || 0;
        const pendingCount = messagesData?.filter((m) => m.processing_status === 'pending').length || 0;

        const intentCounts = messagesData?.reduce((acc, m) => {
          if (m.intent) {
            acc[m.intent] = (acc[m.intent] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>) || {};

        const mostUsedCommand = Object.entries(intentCounts)
          .filter(([intent]) => intent === 'quick_command')
          .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

        setStats({
          totalMessages,
          totalSent: data.total_messages_sent || 0,
          totalReceived: data.total_messages_received || 0,
          successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
          failedCount,
          pendingCount,
          mostUsedCommand,
          lastMessageAt: data.last_message_at ? new Date(data.last_message_at) : null,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  // Load more messages
  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchMessages(nextPage, true);
  };

  // Refresh messages
  const refresh = async () => {
    setPage(0);
    await fetchMessages(0, false);
    await fetchStats();
  };

  // Update filters
  const updateFilters = (newFilters: MessageFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Initial fetch
  useEffect(() => {
    fetchMessages(0);
    fetchStats();
  }, [userId, filters]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`whatsapp_messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as WhatsAppMessage, ...prev]);
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === (payload.new as WhatsAppMessage).id
                ? (payload.new as WhatsAppMessage)
                : msg
            )
          );
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    messages,
    stats,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    setFilters: updateFilters,
  };
}
