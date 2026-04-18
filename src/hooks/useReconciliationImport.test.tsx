/* @vitest-environment jsdom */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReconciliationImport } from './useReconciliationImport';

const invokeMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useReconciliationImport', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({ data: { importedCount: 1 }, error: null });
  });

  it('imports the prepared manual preview through the reconciliation endpoint', async () => {
    const { result } = renderHook(() => useReconciliationImport(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setMode('manual');
      result.current.setManualDraft({
        description: 'Conta de luz',
        amount: '152,37',
        date: '2026-04-15',
        accountName: 'Nubank PJ',
      });
    });

    act(() => {
      result.current.handleManualPreview();
    });

    await act(async () => {
      await (result.current as any).handleImport();
    });

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('reconciliation-import', {
        body: {
          source: 'manual_entry',
          rows: [
            {
              account_name: 'Nubank PJ',
              amount: 152.37,
              date: '2026-04-15',
              description: 'Conta de luz',
              external_account_id: null,
              external_id: null,
              internal_account_id: null,
              raw_description: 'Conta de luz',
              source_item_id: null,
            },
          ],
        },
      });
    });
  });
});
