/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthView } from '../MonthView';
import type { AgendaItem } from '@/types/calendar.types';

const ANCHOR = new Date(2026, 3, 1);

function baseItem(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'e1',
    dedup_key: 'k1',
    display_start_at: '2026-04-09T10:00:00',
    display_end_at: '2026-04-09T11:00:00',
    title: 'Meeting',
    subtitle: null,
    status: 'scheduled',
    badge: 'work',
    edit_route: '/c',
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Task 10 / MonthView click behavior', () => {
  it('renders timed entries with visible hour labels in month cells', () => {
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'timed-month',
            title: 'Reunião de alinhamento',
            display_start_at: '2026-04-09T09:00:00',
            display_end_at: '2026-04-09T10:00:00',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.getByText(/reunião de alinhamento/i)).toBeTruthy();
    const item = screen.getByTestId('month-item-timed-month');
    expect(item.getAttribute('data-agenda-chrome')).toBe('semantic-border-left');
    expect(item.getAttribute('data-agenda-accent')).toBe('left');
    expect(item.className).toContain('rounded-sm');
    expect(item.className).not.toContain('rounded-md');
  });

  it('renders derived month entries with solid borders and compact spacing', () => {
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'derived-month',
            title: 'Conta derivada',
            agenda_item_type: 'derived_projection',
            origin_type: 'payable_bill',
            badge: 'financial',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    const item = screen.getByTestId('month-item-derived-month');
    expect(item.className).not.toContain('border-dashed');
    expect(item.className).toContain('rounded-sm');
    expect(item.className).toContain('px-1.5');
  });

  it('renders financial day-long projections with 09:00 fallback in month cells', () => {
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'all-day-month',
            title: 'Conta de Luz Home',
            origin_type: 'payable_bill',
            badge: 'financial',
            display_start_at: '2026-04-09T00:00:00',
            display_end_at: '2026-04-09T23:59:59',
            metadata: null,
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    expect(screen.getByText(/conta de luz home/i)).toBeTruthy();
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.queryByText('00:00')).toBeNull();
  });

  it('invokes onDayClick when the day cell is clicked', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    const onItemClick = vi.fn();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[]}
        isLoading={false}
        onDayClick={onDayClick}
        onItemClick={onItemClick}
      />,
    );
    const cell = screen.getByTestId('month-day-cell-2026-04-09');
    await user.click(cell);
    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(onItemClick).not.toHaveBeenCalled();
  });

  it('invokes onItemClick and not onDayClick when an item chip is clicked', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    const onItemClick = vi.fn();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[baseItem({})]}
        isLoading={false}
        onDayClick={onDayClick}
        onItemClick={onItemClick}
      />,
    );
    await user.click(screen.getByTestId('month-item-k1'));
    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('shows +N mais when a day has more than four items', () => {
    const items = [1, 2, 3, 4, 5].map((n) =>
      baseItem({ dedup_key: `k${n}`, title: `Item ${n}` }),
    );
    render(
      <MonthView
        anchor={ANCHOR}
        items={items}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );
    expect(screen.getByTestId('month-overflow-more-2026-04-09').textContent?.replace(/\s+/g, ' ').trim()).toBe('+1 mais');
  });

  it('opens sheet listing all items when clicking the day item count', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const items = [1, 2, 3, 4, 5].map((n) =>
      baseItem({ dedup_key: `k${n}`, title: `Item ${n}` }),
    );
    render(
      <MonthView
        anchor={ANCHOR}
        items={items}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={onItemClick}
      />,
    );
    await user.click(screen.getByTestId('month-day-count-2026-04-09'));
    const sheetBody = screen.getByTestId('month-day-list-sheet-body');
    expect(within(sheetBody).getAllByRole('button').length).toBe(5);
    expect(within(sheetBody).getByTestId('month-sheet-item-k1').className).toContain('rounded-xl');
    await user.click(within(sheetBody).getByText('Item 3'));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'k3', title: 'Item 3' }));
  });

  it('keeps pending on the metadata row and avoids duplicating it as subtitle in the sheet card', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'sheet-pending',
            title: 'Conta de Luz Home',
            status: 'pending',
            subtitle: 'Pendente',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-09'));
    const card = screen.getByTestId('month-sheet-item-sheet-pending');
    expect(within(screen.getByTestId('month-sheet-meta-sheet-pending')).getByText('Pendente')).toBeTruthy();
    expect(screen.queryByTestId('month-sheet-details-sheet-pending')).toBeNull();
    expect(within(card).getAllByText('Pendente')).toHaveLength(1);
  });

  it('renders a separate details row with bottom spacing when subtitle adds extra context', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'sheet-detail',
            title: 'Correr',
            status: 'pending',
            subtitle: 'fdfd',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-09'));
    const card = screen.getByTestId('month-sheet-item-sheet-detail');
    const details = screen.getByTestId('month-sheet-details-sheet-detail');
    expect(card.className).toContain('min-h-[8.5rem]');
    expect(card.className).toContain('pb-5');
    expect(details.className).toContain('pt-3');
    expect(within(details).getByText('fdfd')).toBeTruthy();
  });
});
