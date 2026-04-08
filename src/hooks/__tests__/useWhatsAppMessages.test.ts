import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

import {
  averageInboundResponseTimeSeconds,
  buildMostUsedQuickCommandsFromRows,
  lastMessageReceivedAtFromRows,
  sortMessagesByReceivedAtDesc,
} from '@/hooks/useWhatsAppMessages';

describe('useWhatsAppMessages data helpers', () => {
  it('orders history by received_at descending (newest first)', () => {
    const ordered = sortMessagesByReceivedAtDesc([
      { id: 'a', received_at: '2026-04-01T10:00:00.000Z' },
      { id: 'b', received_at: '2026-04-08T12:00:00.000Z' },
      { id: 'c', received_at: '2026-04-05T08:00:00.000Z' },
    ]);
    expect(ordered.map((m) => m.id)).toEqual(['b', 'c', 'a']);
  });

  it('computes lastMessageAt from received_at of the chronologically latest message', () => {
    const rows = [
      { received_at: '2026-04-01T10:00:00.000Z', created_at: '2026-04-10T10:00:00.000Z' },
      { received_at: '2026-04-09T15:00:00.000Z', created_at: '2026-04-02T10:00:00.000Z' },
    ];
    expect(lastMessageReceivedAtFromRows(rows)).toBe('2026-04-09T15:00:00.000Z');
  });

  it('derives quick-command stats from metadata.command, not from intent label', () => {
    const rows = [
      {
        intent: 'quick_command',
        metadata: { command: 'saldo' },
      },
      {
        intent: 'quick_command',
        metadata: { command: 'resumo' },
      },
      {
        intent: 'quick_command',
        metadata: { command: 'saldo' },
      },
    ];
    const counts = buildMostUsedQuickCommandsFromRows(rows);
    expect(counts).toEqual([
      { command: 'saldo', count: 2 },
      { command: 'resumo', count: 1 },
    ]);
    expect(counts.some((c) => c.command === 'quick_command')).toBe(false);
  });

  it('returns null average response time when inbound messages lack response_sent_at', () => {
    expect(
      averageInboundResponseTimeSeconds([
        {
          direction: 'inbound',
          received_at: '2026-04-01T10:00:00.000Z',
          response_sent_at: null,
        },
      ]),
    ).toBeNull();
  });

  it('averages inbound response latency only when received_at and response_sent_at are both valid', () => {
    const avg = averageInboundResponseTimeSeconds([
      {
        direction: 'inbound',
        received_at: '2026-04-01T10:00:00.000Z',
        response_sent_at: '2026-04-01T10:00:05.000Z',
      },
      {
        direction: 'inbound',
        received_at: '2026-04-01T10:00:00.000Z',
        response_sent_at: '2026-04-01T10:00:15.000Z',
      },
      {
        direction: 'outbound',
        received_at: '2026-04-01T10:00:00.000Z',
        response_sent_at: '2026-04-01T10:00:01.000Z',
      },
    ]);
    expect(avg).toBe(10);
  });
});
