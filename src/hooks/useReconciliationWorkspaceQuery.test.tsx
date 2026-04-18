/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReconciliationWorkspaceQuery, RECONCILIATION_WORKSPACE_QUERY_KEY } from './useReconciliationWorkspaceQuery';
import type { ReconciliationWindow } from '@/types/reconciliation';

const TEST_WINDOW: ReconciliationWindow = {
  presetId: 'all_time',
  startDate: null,
  endDate: null,
  label: 'Tudo (historico)',
};

const { realtimeCallbacks, removeChannelMock } = vi.hoisted(() => ({
  realtimeCallbacks: [] as Array<() => void>,
  removeChannelMock: vi.fn(),
}));

const pagedTableData = vi.hoisted(
  () =>
    ({
      reconciliation_cases: [[]] as Array<Array<Record<string, unknown>>>,
      bank_transactions: [[]] as Array<Array<Record<string, unknown>>>,
      pluggy_connections: [[]] as Array<Array<Record<string, unknown>>>,
      reconciliation_audit_log: [[]] as Array<Array<Record<string, unknown>>>,
    }) satisfies Record<string, Array<Array<Record<string, unknown>>>>,
);

function createQuery<T>(result: T) {
  const query: Record<string, unknown> = {
    eq: () => query,
    order: () => query,
    limit: () => query,
    range: () => query,
    then: (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

function createPagedQuery(table: keyof typeof pagedTableData) {
  let rangeStart = 0;

  const query: Record<string, unknown> = {
    eq: () => query,
    order: () => query,
    limit: () => query,
    range: (from: number) => {
      rangeStart = from;
      return query;
    },
    then: (
      resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => {
      const pageIndex = Math.floor(rangeStart / 1000);
      const page = pagedTableData[table][pageIndex] ?? [];
      return Promise.resolve({ data: page, error: null }).then(resolve, reject);
    },
  };

  return query;
}

function defaultFromImplementation(table: string) {
  if (table === 'reconciliation_cases') {
    return {
      select: () => createPagedQuery('reconciliation_cases'),
    };
  }

  if (table === 'bank_transactions') {
    return {
      select: () => createPagedQuery('bank_transactions'),
    };
  }

  if (table === 'pluggy_connections') {
    return {
      select: () => createPagedQuery('pluggy_connections'),
    };
  }

  if (table === 'reconciliation_audit_log') {
    return {
      select: () => createPagedQuery('reconciliation_audit_log'),
    };
  }

  throw new Error(`Unexpected table ${table}`);
}

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
    from: vi.fn((table: string) => defaultFromImplementation(table)),
    channel: vi.fn(() => {
      const channel = {
        on: (_event: string, _config: unknown, callback: () => void) => {
          realtimeCallbacks.push(callback);
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    }),
    removeChannel: removeChannelMock,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    queryClient,
    Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

describe('useReconciliationWorkspaceQuery realtime', () => {
  beforeEach(async () => {
    realtimeCallbacks.length = 0;
    removeChannelMock.mockReset();
    pagedTableData.reconciliation_cases = [[]];
    pagedTableData.bank_transactions = [[]];
    pagedTableData.pluggy_connections = [[]];
    pagedTableData.reconciliation_audit_log = [[]];
    const supabaseModule = await import('@/lib/supabase');
    vi.mocked(supabaseModule.supabase.from).mockImplementation((table: string) => defaultFromImplementation(table));
  });

  afterEach(() => {
    cleanup();
  });

  it('invalidates the workspace query when reconciliation tables change', async () => {
    const { queryClient, Wrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { unmount } = renderHook(() => useReconciliationWorkspaceQuery({ window: TEST_WINDOW }), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(realtimeCallbacks.length).toBeGreaterThanOrEqual(2);
    });

    realtimeCallbacks.forEach((callback) => callback());

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: RECONCILIATION_WORKSPACE_QUERY_KEY,
    });

    unmount();

    expect(removeChannelMock).toHaveBeenCalled();
  });

  it('surfaces infrastructure error when reconciliation tables are missing remotely', async () => {
    const supabaseModule = await import('@/lib/supabase');
    vi.mocked(supabaseModule.supabase.from).mockImplementation((table: string) => {
      if (table === 'reconciliation_cases') {
        return {
          select: () =>
            createQuery({
              data: null,
              error: {
                code: 'PGRST205',
                message: "Could not find the table 'public.reconciliation_cases' in the schema cache",
              },
            }),
        };
      }

      if (table === 'bank_transactions' || table === 'pluggy_connections' || table === 'reconciliation_audit_log') {
        return {
          select: () => createQuery({ data: [], error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReconciliationWorkspaceQuery({ window: TEST_WINDOW }), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toMatch(/infraestrutura da conciliacao/i);
    expect((result.current.error as Error).message).toMatch(/reconciliation_cases/i);
  });

  it('loads all reconciliation pages instead of truncating at the first 1000 rows', async () => {
    pagedTableData.reconciliation_cases = [
      Array.from({ length: 1000 }, (_, index) => ({
        id: `case-${index}`,
        user_id: 'user-1',
        bank_transaction_id: `bt-${index}`,
        divergence_type: 'unmatched_bank_transaction',
        matched_record_type: null,
        matched_record_id: null,
        confidence: 0,
        confidence_reasoning: {},
        hypotheses: [],
        status: 'open',
        priority: 'urgent',
        auto_close_reason: null,
        resolved_at: null,
        resolved_by: null,
        created_at: '2026-04-16T12:00:00Z',
        updated_at: '2026-04-16T12:00:00Z',
      })),
      Array.from({ length: 200 }, (_, index) => ({
        id: `case-1000-${index}`,
        user_id: 'user-1',
        bank_transaction_id: `bt-1000-${index}`,
        divergence_type: 'unmatched_bank_transaction',
        matched_record_type: null,
        matched_record_id: null,
        confidence: 0,
        confidence_reasoning: {},
        hypotheses: [],
        status: 'open',
        priority: 'urgent',
        auto_close_reason: null,
        resolved_at: null,
        resolved_by: null,
        created_at: '2026-04-16T12:00:00Z',
        updated_at: '2026-04-16T12:00:00Z',
      })),
    ];

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReconciliationWorkspaceQuery({ window: TEST_WINDOW }), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data?.cases.length).toBe(1200);
    });
  });
});
