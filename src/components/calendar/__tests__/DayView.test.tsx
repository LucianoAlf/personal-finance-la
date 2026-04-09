/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayView } from '../DayView';
import type { AgendaItem } from '@/types/calendar.types';

const ANCHOR = new Date(2026, 3, 9);

function baseItem(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'e1',
    dedup_key: 'k1',
    display_start_at: '2026-04-09T09:00:00',
    display_end_at: '2026-04-09T10:00:00',
    title: 'Event',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
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

describe('DayView', () => {
  it('Task 10: calls onEmptySlotClick with anchor date and hour for an empty hour row', async () => {
    const user = userEvent.setup();
    const onEmptySlotClick = vi.fn();
    const item = baseItem({
      dedup_key: 'at-9',
      display_start_at: '2026-04-09T09:00:00',
      display_end_at: '2026-04-09T10:00:00',
    });

    const { container } = render(
      <DayView
        anchor={ANCHOR}
        items={[item]}
        isLoading={false}
        onItemClick={() => {}}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );

    const slot = container.querySelector('[data-day-empty-slot="2026-04-09"][data-hour="14"]') as HTMLElement;
    expect(slot).toBeTruthy();
    await user.click(slot);

    expect(onEmptySlotClick).toHaveBeenCalledTimes(1);
    const [d, h] = onEmptySlotClick.mock.calls[0];
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(9);
    expect(h).toBe(14);
  });

  it('Task 10: empty day shows Criar evento and calls onEmptySlotClick with default hour', async () => {
    const user = userEvent.setup();
    const onEmptySlotClick = vi.fn();

    const { container } = render(
      <DayView
        anchor={ANCHOR}
        items={[]}
        isLoading={false}
        onItemClick={() => {}}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );

    expect(container.querySelector('[data-day-empty-slot]')).toBeNull();

    const createBtn = screen.getByRole('button', { name: /criar evento/i });
    expect(createBtn.getAttribute('data-day-empty-create')).toBe('2026-04-09');

    await user.click(createBtn);
    expect(onEmptySlotClick).toHaveBeenCalledTimes(1);
    const [d, h] = onEmptySlotClick.mock.calls[0];
    expect(d).toBeInstanceOf(Date);
    expect(h).toBe(9);
  });

  it('calls onItemClick when a timed event is clicked (empty-slot layer does not block)', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const onEmptySlotClick = vi.fn();
    const item = baseItem({ dedup_key: 'click-me', title: 'Click target' });

    render(
      <DayView
        anchor={ANCHOR}
        items={[item]}
        isLoading={false}
        onItemClick={onItemClick}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: /click target/i }));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'click-me' }));
    expect(onEmptySlotClick).not.toHaveBeenCalled();
  });

  it('Task 10: does not expose an empty-slot affordance for an hour occupied by an overlapping event', () => {
    const onEmptySlotClick = vi.fn();
    const spanning = baseItem({
      dedup_key: 'spanning',
      title: 'Long block',
      display_start_at: '2026-04-09T09:30:00',
      display_end_at: '2026-04-09T11:00:00',
    });

    const { container } = render(
      <DayView
        anchor={ANCHOR}
        items={[spanning]}
        isLoading={false}
        onItemClick={() => {}}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );

    const occupiedSlot = container.querySelector('[data-day-empty-slot="2026-04-09"][data-hour="10"]');
    expect(occupiedSlot).toBeNull();

    const emptySlot = container.querySelector('[data-day-empty-slot="2026-04-09"][data-hour="11"]');
    expect(emptySlot).toBeTruthy();
  });

  it('renders a continuation affordance in later occupied rows for multi-hour events', () => {
    const spanning = baseItem({
      dedup_key: 'spanning-visual',
      title: 'Deep work block',
      display_start_at: '2026-04-09T09:30:00',
      display_end_at: '2026-04-09T11:00:00',
    });

    const { container } = render(
      <DayView
        anchor={ANCHOR}
        items={[spanning]}
        isLoading={false}
        onItemClick={() => {}}
      />,
    );

    const startRow = container.querySelector('[data-day-hour-row="9"]') as HTMLElement;
    const continuationRow = container.querySelector('[data-day-hour-row="10"]') as HTMLElement;

    expect(within(startRow).getByRole('button', { name: /deep work block/i })).toBeTruthy();
    expect(within(continuationRow).getByRole('button', { name: /continuação deep work block/i })).toBeTruthy();
    expect(within(continuationRow).getByText(/continua/i)).toBeTruthy();
    expect(within(continuationRow).getByText(/até 11:00/i)).toBeTruthy();
  });

  it('renders financial day-long projections at 09:00 instead of Dia Inteiro', () => {
    const allDayRange = baseItem({
      dedup_key: 'all-day-range',
      title: 'Conta de Luz Home',
      origin_type: 'payable_bill',
      badge: 'financial',
      display_start_at: '2026-04-09T00:00:00',
      display_end_at: '2026-04-09T23:59:59',
      metadata: null,
    });

    const { container } = render(
      <DayView
        anchor={ANCHOR}
        items={[allDayRange]}
        isLoading={false}
        onItemClick={() => {}}
      />,
    );

    expect(screen.queryByText(/dia inteiro/i)).toBeNull();

    const hourRow = container.querySelector('[data-day-hour-row="9"]') as HTMLElement;
    expect(within(hourRow).getByRole('button', { name: /conta de luz home/i })).toBeTruthy();
    expect(within(hourRow).getByText('09:00')).toBeTruthy();
  });

  it('renders derived day entries with solid borders', () => {
    const item = baseItem({
      dedup_key: 'derived-day',
      title: 'Conta derivada',
      agenda_item_type: 'derived_projection',
      origin_type: 'payable_bill',
      badge: 'financial',
    });

    render(
      <DayView
        anchor={ANCHOR}
        items={[item]}
        isLoading={false}
        onItemClick={() => {}}
      />,
    );

    const card = screen.getByRole('button', { name: /conta derivada/i });
    expect(card.className).not.toContain('border-dashed');
  });
});
