/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AgendaItemSheet } from '../AgendaItemSheet';
import type { AgendaItem } from '@/types/calendar.types';

vi.mock('@/lib/calendar-domain', () => ({
  setCalendarEventStatusDomain: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function buildAgendaItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'event-1',
    dedup_key: 'item-1',
    display_start_at: '2026-04-15T09:00:00.000Z',
    display_end_at: '2026-04-15T11:00:00.000Z',
    title: 'Mentoria com Fabíola',
    subtitle: 'Google Meet',
    status: 'scheduled',
    badge: 'mentoring',
    edit_route: '/agenda/event-1',
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

function renderSheet(item: AgendaItem) {
  return render(
    <MemoryRouter>
      <AgendaItemSheet item={item} open onClose={vi.fn()} onMutationSuccess={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('AgendaItemSheet', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('exibe categoria, prioridade, recorrência e status de sync quando presentes', () => {
    renderSheet(
      buildAgendaItem({
        metadata: {
          event_kind: 'mentoring',
          priority: 'high',
          is_recurring: true,
          sync_provider: 'ticktick',
          sync_status: 'synced',
        },
      }),
    );

    expect(screen.getAllByText('Mentoria').length).toBeGreaterThan(0);
    expect(screen.getByText(/prioridade/i)).toBeTruthy();
    expect(screen.getByText(/alta/i)).toBeTruthy();
    expect(screen.getByText(/recorrente/i)).toBeTruthy();
    expect(screen.getByText(/ticktick - sincronizado/i)).toBeTruthy();
  });

  it('mostra status de sync em português para provider remoto removido', () => {
    renderSheet(
      buildAgendaItem({
        metadata: {
          event_kind: 'work',
          sync_provider: 'ticktick',
          sync_status: 'remote_deleted',
        },
      }),
    );

    expect(screen.getByText(/ticktick - removido do provider/i)).toBeTruthy();
  });

  it('exibe tags sincronizadas do TickTick quando presentes no metadata', () => {
    renderSheet(
      buildAgendaItem({
        metadata: {
          event_kind: 'personal',
          sync_provider: 'ticktick',
          ticktick_tags: ['energia', 'casa'],
        },
      }),
    );

    expect(screen.getByText(/tags do ticktick/i)).toBeTruthy();
    expect(screen.getByText('energia')).toBeTruthy();
    expect(screen.getByText('casa')).toBeTruthy();
  });
});
