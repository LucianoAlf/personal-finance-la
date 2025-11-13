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
  WhatsAppMessageType,
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
      // Buscar estatísticas detalhadas das mensagens
      const { data: messagesData } = await supabase
        .from('whatsapp_messages')
        .select('processing_status, intent, direction, message_type, created_at')
        .eq('user_id', userId);

      const totalMessages = messagesData?.length || 0;
      const totalSent = messagesData?.filter((m) => m.direction === 'outbound').length || 0;
      const totalReceived = messagesData?.filter((m) => m.direction === 'inbound').length || 0;
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

      const lastMessage = messagesData?.[0];
      const lastMessageAt = lastMessage?.created_at ? new Date(lastMessage.created_at) : null;

      // Agrupar por tipo e intent para estatísticas
      const messagesByType = messagesData?.reduce((acc, m) => {
        acc[m.message_type] = (acc[m.message_type] || 0) + 1;
        return acc;
      }, {} as Record<WhatsAppMessageType, number>) || {};

      const messagesByIntent = messagesData?.reduce((acc, m) => {
        if (m.intent) {
          acc[m.intent] = (acc[m.intent] || 0) + 1;
        }
        return acc;
      }, {} as Record<IntentType, number>) || {};

      const commandCounts = Object.entries(intentCounts)
        .filter(([intent]) => intent === 'quick_command')
        .map(([command, count]) => ({ command, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        total_messages: totalMessages,
        messages_sent: totalSent,
        messages_received: totalReceived,
        avg_response_time_seconds: 0, // TODO: calcular tempo médio de resposta
        success_rate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
        most_used_commands: commandCounts,
        messages_by_type: messagesByType,
        messages_by_intent: messagesByIntent,
      });
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
