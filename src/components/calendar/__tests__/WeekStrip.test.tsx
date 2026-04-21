/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WeekStrip } from '../WeekStrip';
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

describe('WeekStrip', () => {
  afterEach(() => cleanup());

  const anchor = new Date(2026, 3, 21); // Tuesday Apr 21, 2026
  const focusedDay = new Date(2026, 3, 21);

  it('renders 7 day cells with role="tab"', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('tab')).toHaveLength(7);
  });

  it('marks the focused day with aria-current', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    const cell = screen.getByRole('tab', { name: /21 de abril/i });
    expect(cell.getAttribute('aria-current')).toBe('date');
  });

  it('fires onDayFocus with the tapped day', () => {
    const onDayFocus = vi.fn();
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={onDayFocus}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /23 de abril/i }));
    expect(onDayFocus).toHaveBeenCalled();
    expect((onDayFocus.mock.calls[0][0] as Date).getDate()).toBe(23);
  });

  it('renders a dot when a day has at least one event', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[makeItem('2026-04-22T10:00:00.000Z')]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    const cell = screen.getByRole('tab', { name: /22 de abril/i });
    expect(cell.querySelector('[data-testid="week-dot"]')).not.toBeNull();
  });

  it('renders the week covering the anchor (Sun–Sat)', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    // Week of Apr 21 2026 is Apr 19 (Sun) through Apr 25 (Sat)
    expect(screen.getByRole('tab', { name: /19 de abril/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /25 de abril/i })).toBeTruthy();
  });
});
