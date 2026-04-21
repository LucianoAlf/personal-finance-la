/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MonthGridMobile } from '../MonthGridMobile';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(iso: string, id = 'x'): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: id,
    dedup_key: id,
    display_start_at: iso,
    display_end_at: null,
    title: 'T',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: null,
    is_read_only: false,
    supports_reschedule: false,
    supports_complete: false,
    metadata: null,
  };
}

describe('MonthGridMobile', () => {
  afterEach(() => cleanup());

  const anchor = new Date(2026, 3, 15); // Apr 15 2026
  const focusedDay = new Date(2026, 3, 21); // Apr 21 2026

  it('renders 42 day cells (6 weeks × 7)', () => {
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('marks the focused day with aria-current', () => {
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const cell = screen.getByRole('gridcell', { name: /21 de abril/i });
    expect(cell.getAttribute('aria-current')).toBe('date');
  });

  it('calls onDayFocus when tapping a day in the current month', () => {
    const onDayFocus = vi.fn();
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={onDayFocus}
        onMonthChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('gridcell', { name: /22 de abril/i }));
    expect(onDayFocus).toHaveBeenCalledWith(expect.any(Date));
    expect((onDayFocus.mock.calls[0][0] as Date).getDate()).toBe(22);
  });

  it('fires onMonthChange when tapping a day from an adjacent month', () => {
    const onMonthChange = vi.fn();
    const onDayFocus = vi.fn();
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={onDayFocus}
        onMonthChange={onMonthChange}
      />,
    );
    // March 29 lives in the grid top row (before April starts on Wednesday)
    fireEvent.click(screen.getByRole('gridcell', { name: /29 de março/i }));
    expect(onMonthChange).toHaveBeenCalled();
    expect(onDayFocus).toHaveBeenCalled();
  });

  it('renders a dot when a day has at least one event', () => {
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[makeItem('2026-04-21T12:00:00.000Z')]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const cell = screen.getByRole('gridcell', { name: /21 de abril/i });
    expect(cell.querySelector('[data-testid="day-dot"]')).not.toBeNull();
  });
});
