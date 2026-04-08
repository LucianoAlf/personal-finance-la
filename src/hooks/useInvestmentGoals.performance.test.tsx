/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import { useInvestmentGoals } from './useInvestmentGoals';

const rpcMock = vi.fn();

function createGoalsQuery() {
  const query: Record<string, unknown> = {
    eq: () => query,
    order: () =>
      Promise.resolve({
        data: [
          {
            id: 'goal-1',
            user_id: 'user-1',
            name: 'Aposentadoria',
            category: 'retirement',
            target_amount: 1_000_000,
            current_amount: 10_000,
            start_date: '2026-01-01',
            target_date: '2046-01-01',
            expected_return_rate: 8,
            monthly_contribution: 1000,
            linked_investments: [],
            auto_invest: false,
            status: 'active',
            priority: 'medium',
            notify_milestones: true,
            notify_contribution: false,
            notify_rebalancing: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      }),
  };
  return query;
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'u@example.com' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useInvestments', () => ({
  loadActiveInvestmentsForUser: vi.fn().mockResolvedValue([]),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/gamification', () => ({
  processGamificationEvent: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'investment_goals') {
        return {
          select: () => createGoalsQuery(),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
    rpc: (...args: unknown[]) => rpcMock(...args),
    channel: vi.fn(() => {
      const ch = {
        on: () => ch,
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      };
      return ch;
    }),
  },
}));

describe('useInvestmentGoals performance', () => {
  afterEach(() => {
    cleanup();
    rpcMock.mockClear();
  });

  it('does not call RPCs when lightweight mode is enabled', async () => {
    const hook = renderHook(() => useInvestmentGoals({ lightweight: true }));

    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false);
      expect(hook.result.current.goals).toHaveLength(1);
    });

    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('calls RPC enrichment when lightweight mode is disabled', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'get_investment_goal_metrics') {
        return Promise.resolve({
          data: {
            months_remaining: 12,
            months_total: 120,
            months_elapsed: 0,
          },
          error: null,
        });
      }
      if (name === 'calculate_investment_projection') {
        return Promise.resolve({
          data: [{ month: 1, contribution: 0, interest: 0, balance: 50_000 }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const hook = renderHook(() => useInvestmentGoals({ lightweight: false }));

    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false);
    });

    expect(rpcMock).toHaveBeenCalled();
  });
});
