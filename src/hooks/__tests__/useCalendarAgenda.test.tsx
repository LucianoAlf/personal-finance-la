/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockRpc = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { useCalendarAgenda } from '../useCalendarAgenda';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useCalendarAgenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns agenda items for given window', async () => {
    const mockItems = [
      {
        agenda_item_type: 'canonical_event',
        origin_type: 'calendar_event',
        origin_id: 'evt-1',
        dedup_key: 'ce:evt-1',
        display_start_at: '2026-04-10T10:00:00-03:00',
        display_end_at: '2026-04-10T11:00:00-03:00',
        title: 'Reuniao',
        subtitle: null,
        status: 'scheduled',
        badge: 'personal',
        edit_route: '/calendar/events/evt-1',
        is_read_only: false,
        supports_reschedule: true,
        supports_complete: true,
        metadata: {},
      },
    ];

    mockRpc.mockResolvedValue({ data: mockItems, error: null });

    const { result } = renderHook(
      () =>
        useCalendarAgenda({
          from: '2026-04-10T00:00:00-03:00',
          to: '2026-04-11T00:00:00-03:00',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].title).toBe('Reuniao');
    expect(mockRpc).toHaveBeenCalledWith('get_agenda_window', {
      p_user_id: 'user-123',
      p_from: '2026-04-10T00:00:00-03:00',
      p_to: '2026-04-11T00:00:00-03:00',
    });
  });

  it('returns empty array when no items in window', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(
      () =>
        useCalendarAgenda({
          from: '2026-04-10T00:00:00-03:00',
          to: '2026-04-11T00:00:00-03:00',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('handles RPC error gracefully', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function not found', code: '42883' },
    });

    const { result } = renderHook(
      () =>
        useCalendarAgenda({
          from: '2026-04-10T00:00:00-03:00',
          to: '2026-04-11T00:00:00-03:00',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('does not fetch when params are empty', () => {
    const { result } = renderHook(
      () => useCalendarAgenda({ from: '', to: '' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
