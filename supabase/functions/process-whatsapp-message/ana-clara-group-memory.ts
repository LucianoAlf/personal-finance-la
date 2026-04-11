/**
 * Memória passiva de grupo — inserts e resumo curto para prompt.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AnaClaraGroupRuntimeConfig } from './ana-clara-group-config.ts';

export async function insertGroupPassiveMemory(
  supabase: SupabaseClient,
  params: {
    userId: string;
    groupJid: string;
    participantPhone: string | null;
    participantName: string | null;
    messageType: string;
    content: string | null;
    mediaSummary: string | null;
    triggerDetected: boolean;
    metadata?: Record<string, unknown>;
  },
  cfg: AnaClaraGroupRuntimeConfig,
): Promise<void> {
  const retentionDays = Math.max(1, Math.min(cfg.group_memory_retention_days, 90));
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + retentionDays);

  const slice = (s: string | null, max = 2000) =>
    s ? (s.length > max ? `${s.slice(0, max)}…` : s) : null;

  const { error } = await supabase.from('ana_clara_group_message_memory').insert({
    user_id: params.userId,
    group_jid: params.groupJid,
    participant_phone: params.participantPhone,
    participant_name: params.participantName,
    message_type: params.messageType,
    content: slice(params.content),
    media_summary: slice(params.mediaSummary, 1000),
    trigger_detected: params.triggerDetected,
    metadata: params.metadata ?? {},
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[ana-clara-group-memory] insert failed:', error);
  }
}

export async function fetchRecentGroupMemoryLines(
  supabase: SupabaseClient,
  userId: string,
  groupJid: string,
  cfg: AnaClaraGroupRuntimeConfig,
): Promise<string> {
  const hours = Math.max(1, cfg.group_memory_hours_back);
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const limit = Math.max(5, Math.min(cfg.group_memory_max_messages, 120));

  const { data, error } = await supabase
    .from('ana_clara_group_message_memory')
    .select('participant_name, participant_phone, message_type, content, media_summary, created_at')
    .eq('user_id', userId)
    .eq('group_jid', groupJid)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) {
    return '';
  }

  const lines = [...data].reverse().map((row) => {
    const who = row.participant_name || row.participant_phone || '?';
    const body = row.content || row.media_summary || `(${row.message_type})`;
    const short = body.length > 280 ? `${body.slice(0, 280)}…` : body;
    return `- [${who}] ${short}`;
  });

  return `Contexto recente do grupo (últimas mensagens):\n${lines.join('\n')}`;
}
