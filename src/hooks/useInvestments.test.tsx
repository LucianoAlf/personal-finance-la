/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import { useInvestments } from './useInvestments';

const fetchCount = {
  investments: 0,
};

function createQuery<T>(result: T) {
  const query: Record<string, unknown> = {
    eq: () => query,
    order: () => query,
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'luciano@example.com',
    },
    loading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/lib/gamification', () => ({
  processGamificationEvent: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'investments') {
        fetchCount.investments += 1;
        return {
          select: () =>
            createQuery({
              data: [
                {
                  id: 'inv-1',
                  user_id: 'user-1',
                  name: 'Tesouro IPCA',
                  type: 'treasury',
                  category: 'fixed_income',
                  quantity: 1,
                  purchase_price: 1000,
                  current_price: 1000,
                  current_value: 1000,
                  total_invested: 1000,
                  is_active: true,
                  created_at: '2026-04-01T10:00:00.000Z',
                },
              ],
              error: null,
            }),
          insert: vi.fn(),
          update: vi.fn(),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    channel: vi.fn(() => {
      const channel = {
        on: () => channel,
        subscribe: () => channel,
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

describe('useInvestments', () => {
  beforeEach(() => {
    fetchCount.investments = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('reuses cached investments immediately on a repeated mount for the same user', async () => {
    const firstHook = renderHook(() => useInvestments());

    await waitFor(() => {
      expect(firstHook.result.current.loading).toBe(false);
      expect(firstHook.result.current.investments).toHaveLength(1);
    });

    expect(fetchCount.investments).toBe(1);

    const secondHook = renderHook(() => useInvestments());

    expect(secondHook.result.current.loading).toBe(false);
    expect(secondHook.result.current.investments).toHaveLength(1);
  });
});
