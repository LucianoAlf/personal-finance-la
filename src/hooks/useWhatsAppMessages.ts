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

/** Rows returned by stats query (subset of whatsapp_messages). */
export type WhatsAppStatsAggregationRow = {
  processing_status: string;
  intent?: string | null;
  direction: string;
  message_type: WhatsAppMessageType;
  received_at: string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
  response_sent_at?: string | null;
};

export function sortMessagesByReceivedAtDesc<T extends { received_at: string }>(
  messages: T[]
): T[] {
  return [...messages].sort(
    (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
  );
}

export function lastMessageReceivedAtFromRows(
  rows: { received_at: string }[]
): string | null {
  if (!rows.length) return null;
  return sortMessagesByReceivedAtDesc(rows)[0].received_at;
}

export function buildMostUsedQuickCommandsFromRows(
  rows: Pick<WhatsAppStatsAggregationRow, 'intent' | 'metadata'>[]
): Array<{ command: string; count: number }> {
  const counts = new Map<string, number>();
  for (const m of rows) {
    if (m.intent !== 'quick_command') continue;
    const raw = m.metadata?.command;
    const cmd = typeof raw === 'string' ? raw.trim() : '';
    if (!cmd) continue;
    counts.set(cmd, (counts.get(cmd) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count);
}

export function averageInboundResponseTimeSeconds(
  rows: Pick<WhatsAppStatsAggregationRow, 'direction' | 'received_at' | 'response_sent_at'>[]
): number | null {
  const deltas: number[] = [];
  for (const m of rows) {
    if (m.direction !== 'inbound') continue;
    if (!m.received_at || !m.response_sent_at) continue;
    const t0 = new Date(m.received_at).getTime();
    const t1 = new Date(m.response_sent_at).getTime();
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 < t0) continue;
    deltas.push((t1 - t0) / 1000);
  }
  if (deltas.length === 0) return null;
  return deltas.reduce((s, x) => s + x, 0) / deltas.length;
}

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
        setMessages((prev) =>
          sortMessagesByReceivedAtDesc([...prev, ...(data || [])])
        );
      } else {
        setMessages(sortMessagesByReceivedAtDesc(data || []));
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
        .select(
          'processing_status, intent, direction, message_type, created_at, received_at, metadata, response_sent_at'
        )
        .eq('user_id', userId);

      const rows = (messagesData || []) as WhatsAppStatsAggregationRow[];

      const totalMessages = rows.length;
      const totalSent = rows.filter((m) => m.direction === 'outbound').length;
      const totalReceived = rows.filter((m) => m.direction === 'inbound').length;
      const successCount = rows.filter((m) => m.processing_status === 'completed').length;

      const last_message_at = lastMessageReceivedAtFromRows(rows);
      const commandCounts = buildMostUsedQuickCommandsFromRows(rows);
      const avg_response_time_seconds = averageInboundResponseTimeSeconds(rows);

      // Agrupar por tipo e intent para estatísticas
      const messagesByType = rows.reduce(
        (acc, m) => {
          acc[m.message_type] = (acc[m.message_type] || 0) + 1;
          return acc;
        },
        {
          text: 0,
          audio: 0,
          image: 0,
          document: 0,
          video: 0,
          location: 0,
          contact: 0,
        } as Record<WhatsAppMessageType, number>
      );

      const messagesByIntent = rows.reduce(
        (acc, m) => {
          if (m.intent) {
            acc[m.intent as IntentType] = (acc[m.intent as IntentType] || 0) + 1;
          }
          return acc;
        },
        {
          transaction: 0,
          quick_command: 0,
          conversation: 0,
          help: 0,
          unknown: 0,
        } as Record<IntentType, number>
      );

      setStats({
        total_messages: totalMessages,
        messages_sent: totalSent,
        messages_received: totalReceived,
        last_message_at,
        avg_response_time_seconds,
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
          setMessages((prev) =>
            sortMessagesByReceivedAtDesc([
              payload.new as WhatsAppMessage,
              ...prev,
            ])
          );
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
            sortMessagesByReceivedAtDesc(
              prev.map((msg) =>
                msg.id === (payload.new as WhatsAppMessage).id
                  ? (payload.new as WhatsAppMessage)
                  : msg
              )
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
