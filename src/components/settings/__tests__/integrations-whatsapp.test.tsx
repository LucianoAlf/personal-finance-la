/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const supabaseMockStore = vi.hoisted(() => {
  let connectedRow: Record<string, unknown> | null = null;
  let disconnectedRow: Record<string, unknown> | null = null;
  let quickCommandsRows: Record<string, unknown>[] = [];

  const getUserMock = vi.fn();
  const invokeMock = vi.fn();
  const updateMock = vi.fn();
  const updateEqMock = vi.fn();
  const channelInstance = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  };
  const channelMock = vi.fn(() => channelInstance);

  updateMock.mockImplementation(() => ({ eq: updateEqMock }));
  updateEqMock.mockResolvedValue({ error: null });

  const fromMock = vi.fn((table: string) => {
    if (table === 'whatsapp_quick_commands') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({ data: quickCommandsRows, error: null }),
            ),
          })),
        })),
        insert: vi.fn(),
        update: vi.fn(),
      };
    }
    if (table !== 'whatsapp_connections') {
      return {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn((_col: string, _val: string) => ({
          single: vi.fn(() => {
            // StrictMode double-mount would break a simple fetch counter; tie refetch to disconnect.
            const row =
              invokeMock.mock.calls.some(([name]) => name === 'disconnect-whatsapp')
                ? disconnectedRow
                : connectedRow;
            return Promise.resolve({ data: row, error: null });
          }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: updateMock,
    };
  });

  return {
    getUserMock,
    invokeMock,
    updateMock,
    updateEqMock,
    fromMock,
    channelMock,
    channelInstance,
    setWhatsappRows(connected: Record<string, unknown>, disconnected: Record<string, unknown>) {
      connectedRow = connected;
      disconnectedRow = disconnected;
    },
    setQuickCommandsRows(rows: Record<string, unknown>[]) {
      quickCommandsRows = rows;
    },
  };
});

vi.mock('@/hooks/useWhatsAppMessages', () => ({
  useWhatsAppMessages: () => ({
    messages: [],
    stats: null,
    isLoading: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    setFilters: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => supabaseMockStore.getUserMock(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: supabaseMockStore.fromMock,
    functions: { invoke: supabaseMockStore.invokeMock },
    channel: supabaseMockStore.channelMock,
    removeChannel: vi.fn(),
  },
}));

import { IntegrationsSettings } from '../IntegrationsSettings';

const connectedRow = {
  id: 'wc1',
  user_id: 'u1',
  instance_id: 'inst',
  instance_token: 'tok',
  status: 'connected' as const,
  connected: true,
  logged_in: true,
  phone_number: '5511999999999',
  updated_at: '2026-04-08T12:00:00.000Z',
  connected_at: '2026-04-01T12:00:00.000Z',
};

const disconnectedRow = {
  ...connectedRow,
  connected: false,
  logged_in: false,
  status: 'disconnected' as const,
  phone_number: null,
  last_disconnect: '2026-04-08T12:05:00.000Z',
  last_disconnect_reason: 'manual_disconnect',
};

describe('IntegrationsSettings WhatsApp disconnect', () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
    Element.prototype.scrollIntoView = function () {};

    supabaseMockStore.setWhatsappRows(connectedRow, disconnectedRow);
    supabaseMockStore.setQuickCommandsRows([]);
    supabaseMockStore.getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    supabaseMockStore.invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    supabaseMockStore.invokeMock.mockClear();
    supabaseMockStore.updateMock.mockClear();
    supabaseMockStore.updateEqMock.mockClear();
    supabaseMockStore.fromMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('disconnect calls supabase.functions.invoke("disconnect-whatsapp") and does not use a direct whatsapp_connections update', async () => {
    const user = userEvent.setup();
    render(<IntegrationsSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /desconectar/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /desconectar/i }));

    await waitFor(() => {
      expect(supabaseMockStore.invokeMock).toHaveBeenCalledWith(
        'disconnect-whatsapp',
        expect.any(Object),
      );
    });

    expect(supabaseMockStore.updateMock).not.toHaveBeenCalled();
  });
});

describe('IntegrationsSettings WhatsApp commands tab', () => {
  const uniqueCommand = 'cmd_from_whatsapp_quick_commands_only';
  const uniqueDescription = 'Description supplied only by mocked DB rows';

  beforeEach(() => {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
    Element.prototype.scrollIntoView = function () {};

    supabaseMockStore.setWhatsappRows(connectedRow, disconnectedRow);
    supabaseMockStore.setQuickCommandsRows([
      {
        id: 'q1',
        command: uniqueCommand,
        aliases: [],
        description: uniqueDescription,
        example: null,
        category: 'test',
        response_template: null,
        requires_params: false,
        usage_count: 0,
        last_used_at: null,
        is_active: true,
        created_at: '2026-04-08T12:00:00.000Z',
        updated_at: '2026-04-08T12:00:00.000Z',
      },
    ]);
    supabaseMockStore.getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    supabaseMockStore.invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    supabaseMockStore.invokeMock.mockClear();
    supabaseMockStore.updateMock.mockClear();
    supabaseMockStore.updateEqMock.mockClear();
    supabaseMockStore.fromMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders active commands from whatsapp_quick_commands (not a hardcoded list)', async () => {
    const user = userEvent.setup();
    render(<IntegrationsSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /desconectar/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('tab', { name: /comandos/i }));

    await waitFor(() => {
      expect(screen.getByText(uniqueCommand)).toBeTruthy();
    });
    expect(screen.getByText(uniqueDescription)).toBeTruthy();
  });
});

describe('IntegrationsSettings WhatsApp QR modal shares parent connection state', () => {
  beforeEach(() => {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
    Element.prototype.scrollIntoView = function () {};

    supabaseMockStore.setWhatsappRows(disconnectedRow, disconnectedRow);
    supabaseMockStore.setQuickCommandsRows([]);
    supabaseMockStore.getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    supabaseMockStore.invokeMock.mockImplementation((name: string) => {
      if (name === 'generate-qr-code') {
        return Promise.resolve({
          data: {
            success: true,
            qrCode: 'data:image/png;base64,test',
            expiresAt: new Date(Date.now() + 120_000).toISOString(),
          },
          error: null,
        });
      }
      return Promise.resolve({ data: { ok: true }, error: null });
    });
    supabaseMockStore.invokeMock.mockClear();
    supabaseMockStore.updateMock.mockClear();
    supabaseMockStore.updateEqMock.mockClear();
    supabaseMockStore.fromMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not invoke generate-qr-code twice when opening the QR modal (no second hook / connect path)', async () => {
    const user = userEvent.setup();
    render(<IntegrationsSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /conectar whatsapp/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /conectar whatsapp/i }));

    await waitFor(() => {
      const qrCalls = supabaseMockStore.invokeMock.mock.calls.filter((c) => c[0] === 'generate-qr-code');
      expect(qrCalls.length).toBe(1);
    });
  });
});
