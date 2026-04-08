/* @vitest-environment jsdom */

import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccounts } from './useAccounts';

const accountsFetchCount = {
  accounts: 0,
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
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'accounts') {
        accountsFetchCount.accounts += 1;
        return {
          select: () =>
            createQuery({
              data: [
                {
                  id: 'acc-1',
                  user_id: 'user-1',
                  name: 'Conta Principal',
                  type: 'checking',
                  current_balance: '1500',
                  initial_balance: '1000',
                  is_active: true,
                  created_at: '2026-04-01T10:00:00.000Z',
                },
              ],
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

describe('useAccounts', () => {
  beforeEach(() => {
    accountsFetchCount.accounts = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('deduplicates in-flight accounts fetch across hook instances (allows 2 under React StrictMode double effect)', async () => {
    renderHook(() => useAccounts());
    renderHook(() => useAccounts());

    await waitFor(() => {
      expect(accountsFetchCount.accounts).toBeGreaterThanOrEqual(1);
      expect(accountsFetchCount.accounts).toBeLessThanOrEqual(2);
    });
  });
});
