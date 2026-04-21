/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AgendaDayList } from '../AgendaDayList';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'evt-1',
    dedup_key: 'k1',
    display_start_at: '2026-04-21T10:00:00.000Z',
    display_end_at: '2026-04-21T11:00:00.000Z',
    title: 'Reunião',
    subtitle: '10:00 – 11:00',
    status: 'scheduled',
    badge: 'personal',
    edit_route: null,
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

describe('AgendaDayList', () => {
  afterEach(() => cleanup());

  const focusedDay = new Date(2026, 3, 21); // Apr 21 2026

  it('renders only items that fall on the focused day', () => {
    const items = [
      makeItem({ origin_id: 'a', title: 'Hoje' }),
      makeItem({
        origin_id: 'b',
        title: 'Outro dia',
        display_start_at: '2026-04-22T10:00:00.000Z',
      }),
    ];
    render(<AgendaDayList items={items} focusedDay={focusedDay} onItemClick={vi.fn()} />);
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.queryByText('Outro dia')).toBeNull();
  });

  it('renders empty state when no items match', () => {
    render(<AgendaDayList items={[]} focusedDay={focusedDay} onItemClick={vi.fn()} />);
    expect(screen.getByText(/nenhum compromisso/i)).toBeTruthy();
  });

  it('shows the read-only lock icon when is_read_only', () => {
    render(
      <AgendaDayList
        items={[makeItem({ is_read_only: true })]}
        focusedDay={focusedDay}
        onItemClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/somente leitura/i)).toBeTruthy();
  });

  it('fires onItemClick when an item is tapped', () => {
    const onClick = vi.fn();
    const item = makeItem();
    render(<AgendaDayList items={[item]} focusedDay={focusedDay} onItemClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Reunião/i }));
    expect(onClick).toHaveBeenCalledWith(item);
  });

  it('renders section header with focused day label and count', () => {
    render(
      <AgendaDayList
        items={[makeItem(), makeItem({ origin_id: 'c', dedup_key: 'k2', title: 'Outra' })]}
        focusedDay={focusedDay}
        onItemClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/21 abr/i)).toBeTruthy();
    expect(screen.getByText(/2 compromissos/i)).toBeTruthy();
  });
});
