/**
 * Agent Memory Manager — embedding generation, semantic search, storage, and prompt formatting.
 * Equivalent to OpenClaw's MEMORY.md + memory/ system but backed by pgvector in Supabase.
 *
 * Features:
 * - Embedding via OpenAI text-embedding-3-small (1536 dims)
 * - Semantic search with configurable similarity threshold
 * - FTS fallback when embedding generation fails
 * - Deduplication: checks similarity before inserting
 * - Token-budgeted prompt formatting
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  shouldReinforceMemoryType,
  type ReinforcementRolloutStage,
} from './agent-memory-reinforcement.ts';

export type MemoryType =
  | 'decision'
  | 'lesson'
  | 'preference'
  | 'pattern'
  | 'note'
  | 'feedback';

export type MemorySource = 'conversation' | 'system' | 'user_explicit';

export interface MemoryEntry {
  id?: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  source?: MemorySource;
  expires_at?: string | null;
}

export interface MemorySearchResult {
  id: string;
  memory_type: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  similarity: number;
}

const MAX_MEMORY_TOKENS = 400;
const DEDUP_THRESHOLD = 0.85;
const DEFAULT_MATCH_THRESHOLD = 0.5;
const PATTERN_TTL_DAYS = 90;
const ACTIVE_REINFORCEMENT_STAGE: ReinforcementRolloutStage = 'stage2';

interface ReinforcementRpcRow {
  id: string;
  reinforcement_count: number;
  confidence: number;
  created_new: boolean;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text.slice(0, 8000),
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export async function saveMemory(
  supabase: SupabaseClient,
  entry: MemoryEntry,
): Promise<string | null> {
  try {
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(entry.content);
    } catch (embErr) {
      console.warn('[agent-memory] Embedding failed, saving without vector:', embErr);
    }

    if (shouldReinforceMemoryType(entry.memory_type, ACTIVE_REINFORCEMENT_STAGE)) {
      try {
        const { data, error } = await supabase.rpc('learn_or_reinforce_fact', {
          p_user_id: entry.user_id,
          p_memory_type: entry.memory_type,
          p_content: entry.content,
          p_metadata: entry.metadata || {},
          p_tags: entry.tags || [],
          p_source: entry.source || 'system',
          p_query_embedding: embedding,
        });

        if (!error) {
          const reinforced = (data as ReinforcementRpcRow[] | null)?.[0];
          if (reinforced?.id) {
            console.log(
              `[agent-memory] Reinforced ${entry.memory_type} memory ${reinforced.id} ` +
                `(count=${reinforced.reinforcement_count}, confidence=${reinforced.confidence})`,
            );
            return reinforced.id;
          }
        } else {
          console.warn('[agent-memory] Reinforcement RPC failed, falling back:', error);
        }
      } catch (rpcErr) {
        console.warn('[agent-memory] Reinforcement RPC threw, falling back:', rpcErr);
      }
    }

    // Deduplication: check for similar existing memory
    if (embedding) {
      const { data: similar } = await supabase.rpc('search_agent_memories', {
        p_user_id: entry.user_id,
        p_query_embedding: embedding,
        p_match_threshold: DEDUP_THRESHOLD,
        p_match_count: 1,
        p_memory_types: [entry.memory_type],
      });

      if (similar && similar.length > 0) {
        // Update existing memory instead of creating duplicate
        const existingId = similar[0].id;
        const mergedContent =
          entry.content.length > similar[0].content.length
            ? entry.content
            : similar[0].content;

        await supabase
          .from('agent_memory_entries')
          .update({
            content: mergedContent,
            embedding,
            metadata: {
              ...(similar[0].metadata || {}),
              ...(entry.metadata || {}),
              merge_count:
                ((similar[0].metadata as Record<string, unknown>)?.merge_count as number || 0) + 1,
            },
            tags: [
              ...new Set([...(similar[0].tags || []), ...(entry.tags || [])]),
            ],
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingId);

        console.log(
          `[agent-memory] Deduplicated: updated existing ${existingId} instead of creating new`,
        );
        return existingId;
      }
    }

    // Set TTL for patterns
    let expiresAt = entry.expires_at ?? null;
    if (entry.memory_type === 'pattern' && !expiresAt) {
      const ttlDate = new Date();
      ttlDate.setDate(ttlDate.getDate() + PATTERN_TTL_DAYS);
      expiresAt = ttlDate.toISOString();
    }

    const { data, error } = await supabase
      .from('agent_memory_entries')
      .insert({
        user_id: entry.user_id,
        memory_type: entry.memory_type,
        content: entry.content,
        metadata: entry.metadata || {},
        tags: entry.tags || [],
        embedding,
        source: entry.source || 'system',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[agent-memory] Insert failed:', error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('[agent-memory] saveMemory error:', err);
    return null;
  }
}

export async function searchMemories(
  supabase: SupabaseClient,
  userId: string,
  queryText: string,
  matchCount = 5,
  matchThreshold = DEFAULT_MATCH_THRESHOLD,
  memoryTypes?: MemoryType[],
): Promise<MemorySearchResult[]> {
  try {
    const embedding = await generateEmbedding(queryText);

    const { data, error } = await supabase.rpc('search_agent_memories', {
      p_user_id: userId,
      p_query_embedding: embedding,
      p_match_threshold: matchThreshold,
      p_match_count: matchCount,
      p_memory_types: memoryTypes ?? null,
    });

    if (error) {
      console.error('[agent-memory] Semantic search failed:', error);
      return searchMemoriesFTS(supabase, userId, queryText, matchCount);
    }

    return (data as MemorySearchResult[]) || [];
  } catch (embErr) {
    console.warn('[agent-memory] Embedding failed, falling back to FTS:', embErr);
    return searchMemoriesFTS(supabase, userId, queryText, matchCount);
  }
}

async function searchMemoriesFTS(
  supabase: SupabaseClient,
  userId: string,
  queryText: string,
  matchCount = 5,
): Promise<MemorySearchResult[]> {
  try {
    const words = queryText
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5);

    if (words.length === 0) return [];

    const tsQuery = words.join(' & ');

    const { data, error } = await supabase
      .from('agent_memory_entries')
      .select('id, memory_type, content, metadata, tags')
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .textSearch('content', tsQuery, { config: 'portuguese' })
      .limit(matchCount);

    if (error) {
      console.error('[agent-memory] FTS search failed:', error);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      similarity: 0.3,
    })) as MemorySearchResult[];
  } catch (err) {
    console.error('[agent-memory] FTS fallback error:', err);
    return [];
  }
}

export function formatMemoriesForPrompt(
  memories: MemorySearchResult[],
): string {
  if (!memories || memories.length === 0) return '';

  const typeLabels: Record<string, string> = {
    decision: 'Decisão',
    lesson: 'Lição',
    preference: 'Preferência',
    pattern: 'Padrão',
    note: 'Nota',
    feedback: 'Feedback',
  };

  let result = '## MEMÓRIAS RELEVANTES\n';
  let tokenCount = estimateTokens(result);

  for (const mem of memories) {
    const line = `- [${typeLabels[mem.memory_type] || mem.memory_type}] ${mem.content}\n`;
    const lineTokens = estimateTokens(line);

    if (tokenCount + lineTokens > MAX_MEMORY_TOKENS) break;

    result += line;
    tokenCount += lineTokens;
  }

  return result.trim();
}

export async function logAgentAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from('agent_action_log').insert({
      user_id: userId,
      action_type: actionType,
      details,
    });
  } catch (err) {
    console.warn('[agent-memory] Failed to log action:', err);
  }
}
