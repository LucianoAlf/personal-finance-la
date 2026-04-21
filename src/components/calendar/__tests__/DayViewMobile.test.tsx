/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DayViewMobile } from '../DayViewMobile';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'evt-1',
    dedup_key: 'k1',
    display_start_at: '2026-04-21T13:00:00.000Z',
    display_end_at: '2026-04-21T14:00:00.000Z',
    title: 'Reunião',
    subtitle: null,
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

describe('DayViewMobile', () => {
  afterEach(() => cleanup());

  const anchor = new Date(2026, 3, 21);

  it('renders hourly slots from 06:00 to 23:00', () => {
    render(
      <DayViewMobile
        anchor={anchor}
        items={[]}
        onItemClick={vi.fn()}
      />,
    );
    const slots = screen.getAllByTestId('hour-slot');
    expect(slots).toHaveLength(18); // 6..23 inclusive
  });

  it('renders timed events', () => {
    render(
      <DayViewMobile
        anchor={anchor}
        items={[makeItem({ title: 'Reunião' })]}
        onItemClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Reunião')).toBeTruthy();
  });

  it('renders the all-day band for items without a time component', () => {
    const allDay = makeItem({
      origin_id: 'a1',
      dedup_key: 'a1',
      title: 'Feriado Tiradentes',
      display_start_at: new Date(2026, 3, 21, 0, 0, 0).toISOString(),
      display_end_at: new Date(2026, 3, 21, 23, 59, 0).toISOString(),
    });
    render(
      <DayViewMobile
        anchor={anchor}
        items={[allDay]}
        onItemClick={vi.fn()}
      />,
    );
    const band = screen.getByTestId('all-day-band');
    expect(band.textContent).toContain('Feriado Tiradentes');
  });

  it('fires onItemClick when an event is tapped', () => {
    const onItemClick = vi.fn();
    const item = makeItem();
    render(
      <DayViewMobile
        anchor={anchor}
        items={[item]}
        onItemClick={onItemClick}
      />,
    );
    fireEvent.click(screen.getByText('Reunião'));
    expect(onItemClick).toHaveBeenCalledWith(item);
  });

  it('fires onEmptySlotClick with the hour when an empty slot is tapped', () => {
    const onEmptySlotClick = vi.fn();
    render(
      <DayViewMobile
        anchor={anchor}
        items={[]}
        onItemClick={vi.fn()}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );
    const slots = screen.getAllByTestId('hour-slot');
    fireEvent.click(slots[2]); // 06:00 + 2 = 08:00
    expect(onEmptySlotClick).toHaveBeenCalledWith(expect.any(Date), 8);
  });
});
