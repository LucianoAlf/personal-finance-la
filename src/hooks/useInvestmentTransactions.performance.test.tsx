/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

import { useInvestmentTransactions } from './useInvestmentTransactions';

let fetchCount = 0;

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
    user: { id: 'user-1', email: 'u@example.com' },
    loading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/gamification', () => ({
  processGamificationEvent: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      fetchCount += 1;
      return {
        select: () =>
          createQuery({
            data: [
              {
                id: 'tx-1',
                user_id: 'user-1',
                investment_id: 'inv-1',
                transaction_type: 'buy',
                quantity: 1,
                price: 10,
                total_value: 10,
                fees: 0,
                tax: 0,
                transaction_date: new Date().toISOString(),
                notes: null,
                created_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        insert: vi.fn(),
        delete: vi.fn(),
      };
    }),
    channel: vi.fn(() => {
      const channel = {
        on: () => channel,
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
      };
      return channel;
    }),
    removeChannel: vi.fn(),
  },
}));

describe('useInvestmentTransactions', () => {
  beforeEach(() => {
    fetchCount = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('reuses cached transactions on a repeated mount for the same user', async () => {
    const first = renderHook(() => useInvestmentTransactions());

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
      expect(first.result.current.transactions).toHaveLength(1);
    });

    expect(fetchCount).toBe(1);

    const second = renderHook(() => useInvestmentTransactions());

    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.transactions).toHaveLength(1);
    expect(fetchCount).toBe(1);
  });
});
