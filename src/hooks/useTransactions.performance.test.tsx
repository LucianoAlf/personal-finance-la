/* @vitest-environment jsdom */

import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactions } from './useTransactions';

const fetchCount = {
  transactions: 0,
  creditCardTransactions: 0,
  creditCardTransactionTags: 0,
};

const baseTransaction = {
  id: 'tx-1',
  user_id: 'user-1',
  category_id: 'cat-1',
  account_id: 'acc-1',
  amount: 100,
  description: 'Supermercado',
  transaction_date: '2026-04-01',
  created_at: '2026-04-01T10:00:00.000Z',
  type: 'expense',
  is_paid: true,
  category: { id: 'cat-1', name: 'Mercado', icon: 'ShoppingBasket', color: '#ef4444' },
  account: { id: 'acc-1', name: 'Conta Principal' },
  transaction_tags: [],
};

function createQuery<T>(result: T) {
  const query: Record<string, unknown> = {
    eq: () => query,
    order: () => query,
    gte: () => query,
    lte: () => query,
    in: () => query,
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

vi.mock('@/lib/gamification', () => ({
  processGamificationEvent: vi.fn(),
}));

vi.mock('@/utils/tags/tag-assignment', () => ({
  replaceCanonicalTagAssignments: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'luciano@example.com',
          },
        },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'transactions') {
        fetchCount.transactions += 1;
        return {
          select: () =>
            createQuery({
              data: [baseTransaction],
              error: null,
            }),
        };
      }

      if (table === 'credit_card_transactions') {
        fetchCount.creditCardTransactions += 1;
        return {
          select: () =>
            createQuery({
              data: [],
              error: null,
            }),
        };
      }

      if (table === 'credit_card_transaction_tags') {
        fetchCount.creditCardTransactionTags += 1;
        return {
          select: () =>
            createQuery({
              data: [],
              error: null,
            }),
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

describe('useTransactions performance behavior', () => {
  beforeEach(() => {
    fetchCount.transactions = 0;
    fetchCount.creditCardTransactions = 0;
    fetchCount.creditCardTransactionTags = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('each hook instance loads transactions and completes (no cross-instance cache)', async () => {
    const firstHook = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(firstHook.result.current.loading).toBe(false);
      expect(firstHook.result.current.transactions).toHaveLength(1);
    });

    expect(fetchCount.transactions).toBe(1);
    expect(fetchCount.creditCardTransactions).toBe(1);

    const secondHook = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(secondHook.result.current.loading).toBe(false);
      expect(secondHook.result.current.transactions).toHaveLength(1);
    });

    expect(fetchCount.transactions).toBe(2);
    expect(fetchCount.creditCardTransactions).toBe(2);
  });
});
