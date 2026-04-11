import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface AgentFactMemory {
  id: string;
  memory_type: string;
  content: string;
  confidence: number;
  reinforcement_count: number;
  metadata: Record<string, unknown>;
  tags: string[];
}

export interface AgentEpisodeMemory {
  id: string;
  summary: string;
  outcome: string | null;
  importance: number;
  source: string | null;
  created_at: string;
  entities: Record<string, unknown>;
}

export interface UnifiedAgentMemoryContext {
  facts: AgentFactMemory[];
  episodes: AgentEpisodeMemory[];
}

export interface SaveAgentEpisodeInput {
  userId: string;
  summary: string;
  importance?: number;
  source?: string;
  outcome?: string | null;
  entities?: Record<string, unknown>;
  contextWindowHours?: number;
  expiresInHours?: number;
}

const MAX_CONTEXT_TOKENS = 450;

export async function loadUnifiedAgentContext(
  supabase: SupabaseClient,
  userId: string,
  options: {
    maxFacts?: number;
    maxEpisodes?: number;
  } = {},
): Promise<UnifiedAgentMemoryContext | null> {
  try {
    const { data, error } = await supabase.rpc('get_agent_memory_context', {
      p_user_id: userId,
      p_max_facts: options.maxFacts ?? 5,
      p_max_episodes: options.maxEpisodes ?? 5,
    });

    if (error) {
      console.warn('[agent-memory-context] Unified context RPC failed:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { facts: [], episodes: [] };

    return {
      facts: ((row.user_facts ?? row.facts ?? []) as AgentFactMemory[]).map(normalizeFact),
      episodes: ((row.recent_episodes ?? row.episodes ?? []) as AgentEpisodeMemory[]).map(
        normalizeEpisode,
      ),
    };
  } catch (err) {
    console.warn('[agent-memory-context] Failed to load unified context:', err);
    return null;
  }
}

export async function saveAgentMemoryEpisode(
  supabase: SupabaseClient,
  input: SaveAgentEpisodeInput,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('save_memory_episode', {
      p_user_id: input.userId,
      p_summary: input.summary,
      p_importance: input.importance ?? 0.2,
      p_source: input.source ?? 'system',
      p_outcome: input.outcome ?? null,
      p_entities: input.entities ?? {},
      p_context_window_hours: input.contextWindowHours ?? 48,
      p_expires_in_hours: input.expiresInHours ?? 168,
    });

    if (error) {
      console.warn('[agent-memory-context] Failed to save episode:', error);
      return null;
    }

    return typeof data === 'string' ? data : String(data ?? '');
  } catch (err) {
    console.warn('[agent-memory-context] Episode save threw:', err);
    return null;
  }
}

export function formatAgentMemoryContextForPrompt(
  context: UnifiedAgentMemoryContext,
): string {
  if (context.facts.length === 0 && context.episodes.length === 0) return '';

  const sections: string[] = [];

  const orderedFacts = [...context.facts].sort((a, b) => b.confidence - a.confidence);
  if (orderedFacts.length > 0) {
    sections.push('## MEMÓRIA RELEVANTE');
    for (const fact of orderedFacts) {
      const label = factTypeLabel(fact.memory_type);
      sections.push(
        `- [${label} | conf. ${Number(fact.confidence).toFixed(2)}] ${fact.content}`,
      );
    }
  }

  const orderedEpisodes = [...context.episodes].sort((a, b) => b.importance - a.importance);
  if (orderedEpisodes.length > 0) {
    sections.push('## EPISÓDIOS RECENTES');
    for (const episode of orderedEpisodes) {
      const outcome = episode.outcome || 'interaction';
      sections.push(
        `- [${outcome} | imp. ${Number(episode.importance).toFixed(2)}] ${episode.summary}`,
      );
    }
  }

  let result = '';
  let tokenCount = 0;
  for (const line of sections) {
    const candidate = result ? `${result}\n${line}` : line;
    const nextTokens = estimateTokens(candidate);
    if (nextTokens > MAX_CONTEXT_TOKENS) break;
    result = candidate;
    tokenCount = nextTokens;
  }

  return tokenCount > 0 ? result : '';
}

function normalizeFact(input: AgentFactMemory): AgentFactMemory {
  return {
    ...input,
    confidence: Number(input.confidence ?? 0.6),
    reinforcement_count: Number(input.reinforcement_count ?? 1),
    metadata: input.metadata || {},
    tags: input.tags || [],
  };
}

function normalizeEpisode(input: AgentEpisodeMemory): AgentEpisodeMemory {
  return {
    ...input,
    importance: Number(input.importance ?? 0.2),
    entities: input.entities || {},
  };
}

function factTypeLabel(memoryType: string): string {
  switch (memoryType) {
    case 'decision':
      return 'Decisão';
    case 'lesson':
      return 'Lição';
    case 'preference':
      return 'Preferência';
    case 'pattern':
      return 'Padrão';
    case 'feedback':
      return 'Feedback';
    default:
      return 'Nota';
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
