import { describe, expect, it } from 'vitest';

import {
  formatAgentMemoryContextForPrompt,
  loadUnifiedAgentContext,
  saveAgentMemoryEpisode,
  type AgentEpisodeMemory,
  type AgentFactMemory,
} from '../agent-memory-context';

describe('agent-memory-context', () => {
  it('returns empty string when there is no memory context', () => {
    expect(
      formatAgentMemoryContextForPrompt({
        facts: [],
        episodes: [],
      }),
    ).toBe('');
  });

  it('formats facts ordered by confidence and labels them clearly', () => {
    const facts: AgentFactMemory[] = [
      {
        id: 'fact-1',
        memory_type: 'preference',
        content: 'Prefere confirmações diretas.',
        confidence: 0.9,
        reinforcement_count: 4,
        metadata: {},
        tags: ['communication_style'],
      },
      {
        id: 'fact-2',
        memory_type: 'pattern',
        content: 'Todo início do mês paga aluguel.',
        confidence: 0.72,
        reinforcement_count: 2,
        metadata: {},
        tags: ['rent'],
      },
    ];

    const prompt = formatAgentMemoryContextForPrompt({ facts, episodes: [] });

    expect(prompt).toContain('## MEMÓRIA RELEVANTE');
    expect(prompt).toContain('[Preferência | conf. 0.90]');
    expect(prompt).toContain('[Padrão | conf. 0.72]');
  });

  it('formats recent episodes ordered by importance', () => {
    const episodes: AgentEpisodeMemory[] = [
      {
        id: 'ep-1',
        summary: 'Consultou agenda de amanhã e recebeu 2 compromissos.',
        outcome: 'query_answered',
        importance: 0.4,
        source: 'whatsapp',
        created_at: '2026-04-10T10:00:00.000Z',
        entities: { query_type: 'calendar' },
      },
      {
        id: 'ep-2',
        summary: 'Concluiu onboarding de tom e preferência de resposta.',
        outcome: 'onboarding_completed',
        importance: 0.6,
        source: 'whatsapp',
        created_at: '2026-04-10T11:00:00.000Z',
        entities: { onboarding: true },
      },
    ];

    const prompt = formatAgentMemoryContextForPrompt({ facts: [], episodes });

    expect(prompt).toContain('## EPISÓDIOS RECENTES');
    expect(prompt).toContain('onboarding_completed');
    expect(prompt).toContain('query_answered');
    expect(prompt.indexOf('onboarding_completed')).toBeLessThan(
      prompt.indexOf('query_answered'),
    );
  });

  it('caps the block when too many memories would exceed the prompt budget', () => {
    const facts: AgentFactMemory[] = Array.from({ length: 20 }, (_, index) => ({
      id: `fact-${index}`,
      memory_type: 'note',
      content: `Nota ${index} `.repeat(20),
      confidence: 0.6,
      reinforcement_count: 1,
      metadata: {},
      tags: [],
    }));

    const prompt = formatAgentMemoryContextForPrompt({ facts, episodes: [] });

    expect(prompt).toContain('## MEMÓRIA RELEVANTE');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt.length).toBeLessThan(2200);
  });

  it('loads unified context from RPC payload and normalizes numeric fields', async () => {
    const supabase = {
      rpc: async () => ({
        data: [
          {
            user_facts: [
              {
                id: 'fact-1',
                memory_type: 'preference',
                content: 'Prefere objetividade.',
                confidence: '0.82',
                reinforcement_count: '3',
                metadata: null,
                tags: null,
              },
            ],
            recent_episodes: [
              {
                id: 'ep-1',
                summary: 'Consultou saldo do Nubank.',
                outcome: 'balance_query_answered',
                importance: '0.35',
                source: 'whatsapp',
                created_at: '2026-04-10T10:00:00.000Z',
                entities: null,
              },
            ],
          },
        ],
        error: null,
      }),
    };

    const result = await loadUnifiedAgentContext(supabase as never, 'user-1');

    expect(result).toEqual({
      facts: [
        {
          id: 'fact-1',
          memory_type: 'preference',
          content: 'Prefere objetividade.',
          confidence: 0.82,
          reinforcement_count: 3,
          metadata: {},
          tags: [],
        },
      ],
      episodes: [
        {
          id: 'ep-1',
          summary: 'Consultou saldo do Nubank.',
          outcome: 'balance_query_answered',
          importance: 0.35,
          source: 'whatsapp',
          created_at: '2026-04-10T10:00:00.000Z',
          entities: {},
        },
      ],
    });
  });

  it('returns null when episode RPC save fails', async () => {
    const supabase = {
      rpc: async () => ({
        data: null,
        error: { message: 'boom' },
      }),
    };

    const result = await saveAgentMemoryEpisode(supabase as never, {
      userId: 'user-1',
      summary: 'Resumo qualquer',
    });

    expect(result).toBeNull();
  });
});
