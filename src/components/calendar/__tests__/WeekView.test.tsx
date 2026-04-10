/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeekView } from '../WeekView';
import type { AgendaItem } from '@/types/calendar.types';
import { calculateEventPosition } from '../calendar-utils';

const ROW_HEIGHT_REM = 3.5;

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

/** Anchor Thursday 2026-04-09; week starts Sunday 2026-04-05 (weekStartsOn: 0). */
const ANCHOR = new Date(2026, 3, 9);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('WeekView', () => {
  it('renders all-day items in the top row, not in the timed column', () => {
    const allDay = baseItem({
      dedup_key: 'all-day-1',
      title: 'Whole day review',
      display_start_at: '2026-04-09T08:00:00',
      display_end_at: null,
      metadata: { all_day: false },
    });
    const timed = baseItem({
      dedup_key: 'timed-1',
      title: 'Morning standup',
      display_start_at: '2026-04-09T09:00:00',
      display_end_at: '2026-04-09T09:30:00',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[allDay, timed]} isLoading={false} onItemClick={() => {}} />,
    );

    const topRow = screen.getByTestId('week-all-day-section');
    expect(topRow).toBeTruthy();
    expect(within(topRow).getByRole('button', { name: /Whole day review/i })).toBeTruthy();

    const timedCol = container.querySelector('[data-week-timed-column="2026-04-09"]');
    expect(timedCol).toBeTruthy();
    expect(within(timedCol as HTMLElement).queryByRole('button', { name: /Whole day review/i })).toBeNull();
    const timedButton = within(timedCol as HTMLElement).getByRole('button', { name: /09:00 Morning standup/i });
    expect(timedButton).toBeTruthy();
    expect(timedButton.getAttribute('data-agenda-chrome')).toBe('semantic-border-left');
    expect(timedButton.getAttribute('data-agenda-accent')).toBe('left');
    expect(timedButton.className).toContain('rounded-md');
    expect(timedButton.className).not.toContain('rounded-lg');
  });

  it('renders financial day-long projections at 09:00 in the timed grid', () => {
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
      <WeekView anchor={ANCHOR} items={[allDayRange]} isLoading={false} onItemClick={() => {}} />,
    );

    const timedCol = container.querySelector('[data-week-timed-column="2026-04-09"]');
    expect(timedCol).toBeTruthy();
    expect(screen.queryByTestId('week-all-day-section')).toBeNull();
    expect(within(timedCol as HTMLElement).getByRole('button', { name: /09:00 Conta de Luz Home/i })).toBeTruthy();
  });

  it('renders derived week entries with solid borders', () => {
    const item = baseItem({
      dedup_key: 'derived-week',
      title: 'Conta derivada',
      agenda_item_type: 'derived_projection',
      origin_type: 'payable_bill',
      badge: 'financial',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[item]} isLoading={false} onItemClick={() => {}} />,
    );

    const timedCol = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    const timedButton = within(timedCol).getByRole('button', { name: /09:00 Conta derivada/i });
    expect(timedButton.className).not.toContain('border-dashed');
  });

  it('positions timed events with height proportional to duration (calculateEventPosition)', () => {
    const shortEv = baseItem({
      dedup_key: 'short',
      title: 'Short',
      display_start_at: '2026-04-09T09:00:00',
      display_end_at: '2026-04-09T10:00:00',
      badge: 'work',
    });
    const longEv = baseItem({
      dedup_key: 'long',
      title: 'Long',
      display_start_at: '2026-04-09T11:00:00',
      display_end_at: '2026-04-09T12:30:00',
      badge: 'work',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[shortEv, longEv]} isLoading={false} onItemClick={() => {}} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    const shortBtn = within(col).getByRole('button', { name: /09:00 Short/i });
    const longBtn = within(col).getByRole('button', { name: /11:00 Long/i });

    const posShort = calculateEventPosition(shortEv.display_start_at, shortEv.display_end_at, 6, false, {
      dayEndHour: 24,
      minHeightSlots: 0.5,
    });
    const posLong = calculateEventPosition(longEv.display_start_at, longEv.display_end_at, 6, false, {
      dayEndHour: 24,
      minHeightSlots: 0.5,
    });

    expect(shortBtn.style.height).toBe(`${posShort.heightSlots * ROW_HEIGHT_REM}rem`);
    expect(longBtn.style.height).toBe(`${posLong.heightSlots * ROW_HEIGHT_REM}rem`);
    expect(posLong.heightSlots).toBeGreaterThan(posShort.heightSlots);
  });

  it('offsets overlapping timed events so they do not fully cover each other (lane layout)', () => {
    const a = baseItem({
      dedup_key: 'overlap-a',
      title: 'Overlap A',
      display_start_at: '2026-04-09T09:00:00',
      display_end_at: '2026-04-09T10:00:00',
    });
    const b = baseItem({
      dedup_key: 'overlap-b',
      title: 'Overlap B',
      display_start_at: '2026-04-09T09:15:00',
      display_end_at: '2026-04-09T10:15:00',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[a, b]} isLoading={false} onItemClick={() => {}} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    const btnA = within(col).getByRole('button', { name: /09:00 Overlap A/i });
    const btnB = within(col).getByRole('button', { name: /09:15 Overlap B/i });

    expect(btnA.dataset.weekLaneCount).toBe('2');
    expect(btnB.dataset.weekLaneCount).toBe('2');
    expect(btnA.dataset.weekLane).not.toBe(btnB.dataset.weekLane);
    expect(btnA.style.width).toMatch(/calc\(/);
    expect(btnB.style.width).toMatch(/calc\(/);
  });

  it('summarizes dense same-slot timed clusters with four visible items and +N mais', () => {
    const items = Array.from({ length: 7 }, (_, index) =>
      baseItem({
        dedup_key: `dense-${index + 1}`,
        title: `Denso ${index + 1}`,
        display_start_at: '2026-04-09T09:00:00',
        display_end_at: '2026-04-09T10:00:00',
      }),
    );

    const { container } = render(
      <WeekView anchor={ANCHOR} items={items} isLoading={false} onItemClick={() => {}} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    expect(within(col).getByRole('button', { name: /09:00 Denso 1/i })).toBeTruthy();
    expect(within(col).getByRole('button', { name: /09:00 Denso 4/i })).toBeTruthy();
    expect(within(col).queryByRole('button', { name: /09:00 Denso 5/i })).toBeNull();
    expect(within(col).getByTestId('week-timed-overflow-more-2026-04-09-09:00').textContent?.trim()).toBe('+3 mais');
  });

  it('shows hidden timed cluster items in tooltip and opens sheet from +N mais', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const items = Array.from({ length: 7 }, (_, index) =>
      baseItem({
        dedup_key: `dense-open-${index + 1}`,
        title: `Abrir ${index + 1}`,
        display_start_at: '2026-04-09T09:00:00',
        display_end_at: '2026-04-09T10:00:00',
      }),
    );

    render(<WeekView anchor={ANCHOR} items={items} isLoading={false} onItemClick={onItemClick} />);

    const moreButton = screen.getByTestId('week-timed-overflow-more-2026-04-09-09:00');
    await user.hover(moreButton);
    expect((await screen.findAllByText('Abrir 5')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Abrir 6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Abrir 7').length).toBeGreaterThan(0);

    await user.click(moreButton);
    const body = await screen.findByTestId('week-day-list-sheet-body');
    expect(within(body).getByTestId('week-sheet-item-dense-open-1')).toBeTruthy();
    expect(within(body).getByTestId('week-sheet-item-dense-open-7')).toBeTruthy();

    await user.click(within(body).getByText('Abrir 3'));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'dense-open-3' }));
  });

  it('restores full width for a later standalone event after an overlap cluster', () => {
    const a = baseItem({
      dedup_key: 'cluster-a',
      title: 'Cluster A',
      display_start_at: '2026-04-09T09:00:00',
      display_end_at: '2026-04-09T10:00:00',
    });
    const b = baseItem({
      dedup_key: 'cluster-b',
      title: 'Cluster B',
      display_start_at: '2026-04-09T09:15:00',
      display_end_at: '2026-04-09T10:15:00',
    });
    const c = baseItem({
      dedup_key: 'standalone-c',
      title: 'Standalone C',
      display_start_at: '2026-04-09T14:00:00',
      display_end_at: '2026-04-09T15:00:00',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[a, b, c]} isLoading={false} onItemClick={() => {}} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    const btnA = within(col).getByRole('button', { name: /09:00 Cluster A/i });
    const btnB = within(col).getByRole('button', { name: /09:15 Cluster B/i });
    const btnC = within(col).getByRole('button', { name: /14:00 Standalone C/i });

    expect(btnA.dataset.weekLaneCount).toBe('2');
    expect(btnB.dataset.weekLaneCount).toBe('2');
    expect(btnC.dataset.weekLaneCount).toBe('1');
    expect(btnC.dataset.weekLane).toBe('0');
  });

  it('treats overnight events as overlapping within the visible day window', () => {
    const lateA = baseItem({
      dedup_key: 'overnight-a',
      title: 'Overnight A',
      display_start_at: '2026-04-09T23:00:00',
      display_end_at: '2026-04-10T01:00:00',
    });
    const lateB = baseItem({
      dedup_key: 'overnight-b',
      title: 'Overnight B',
      display_start_at: '2026-04-09T23:30:00',
      display_end_at: '2026-04-10T00:30:00',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[lateA, lateB]} isLoading={false} onItemClick={() => {}} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    const btnA = within(col).getByRole('button', { name: /23:00 Overnight A/i });
    const btnB = within(col).getByRole('button', { name: /23:30 Overnight B/i });

    expect(btnA.dataset.weekLaneCount).toBe('2');
    expect(btnB.dataset.weekLaneCount).toBe('2');
    expect(btnA.dataset.weekLane).not.toBe(btnB.dataset.weekLane);
  });

  it('calls onItemClick when a timed event is clicked', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const item = baseItem({ dedup_key: 'click-me', title: 'Click target' });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[item]} isLoading={false} onItemClick={onItemClick} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    await user.click(within(col).getByRole('button', { name: /09:00 Click target/i }));

    expect(onItemClick).toHaveBeenCalledTimes(1);
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'click-me' }));
  });

  it('shows a hover tooltip with the hidden subtitle for timed week cards', async () => {
    const user = userEvent.setup();
    const item = baseItem({
      dedup_key: 'week-tooltip',
      title: 'Evento semanal',
      subtitle: 'Descrição escondida da semana',
    });

    const { container } = render(
      <WeekView anchor={ANCHOR} items={[item]} isLoading={false} onItemClick={() => {}} />,
    );

    const col = container.querySelector('[data-week-timed-column="2026-04-09"]') as HTMLElement;
    expect(screen.queryByText('Descrição escondida da semana')).toBeNull();
    await user.hover(within(col).getByRole('button', { name: /09:00 Evento semanal/i }));
    expect((await screen.findAllByText('Descrição escondida da semana')).length).toBeGreaterThan(0);
  });

  it('calls onItemClick when an all-day event is clicked', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const item = baseItem({
      dedup_key: 'ad-click',
      title: 'All day click',
      display_end_at: null,
    });

    render(<WeekView anchor={ANCHOR} items={[item]} isLoading={false} onItemClick={onItemClick} />);

    await user.click(screen.getByRole('button', { name: /All day click/i }));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'ad-click' }));
  });

  it('shows only four all-day items in a week cell and summarizes the rest with +N mais', () => {
    const items = Array.from({ length: 7 }, (_, index) =>
      baseItem({
        dedup_key: `ad-overflow-${index + 1}`,
        title: `Conta ${index + 1}`,
        display_end_at: null,
      }),
    );

    const { container } = render(
      <WeekView anchor={ANCHOR} items={items} isLoading={false} onItemClick={() => {}} />,
    );

    const cell = container.querySelector('[data-week-all-day-cell="2026-04-09"]') as HTMLElement;
    expect(cell).toBeTruthy();
    expect(within(cell).getByTestId('week-all-day-count-2026-04-09').textContent).toContain('7 itens');
    expect(within(cell).getAllByRole('button').length).toBe(6);
    expect(within(cell).getByRole('button', { name: /Conta 1/i })).toBeTruthy();
    expect(within(cell).getByRole('button', { name: /Conta 4/i })).toBeTruthy();
    expect(within(cell).queryByRole('button', { name: /Conta 5/i })).toBeNull();
    expect(within(cell).getByTestId('week-overflow-more-2026-04-09').textContent?.trim()).toBe('+3 mais');
  });

  it('shows hidden week all-day items inside a tooltip when hovering +N mais', async () => {
    const user = userEvent.setup();
    const items = Array.from({ length: 7 }, (_, index) =>
      baseItem({
        dedup_key: `ad-tooltip-${index + 1}`,
        title: `Conta ${index + 1}`,
        display_end_at: null,
      }),
    );

    render(<WeekView anchor={ANCHOR} items={items} isLoading={false} onItemClick={() => {}} />);

    await user.hover(screen.getByTestId('week-overflow-more-2026-04-09'));

    expect((await screen.findAllByText('Conta 5')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conta 6').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conta 7').length).toBeGreaterThan(0);
  });

  it('opens a day sheet with all week all-day items when clicking the item count', async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    const items = Array.from({ length: 7 }, (_, index) =>
      baseItem({
        dedup_key: `ad-sheet-${index + 1}`,
        title: `Conta ${index + 1}`,
        display_end_at: null,
      }),
    );

    render(<WeekView anchor={ANCHOR} items={items} isLoading={false} onItemClick={onItemClick} />);

    await user.click(screen.getByTestId('week-all-day-count-2026-04-09'));

    const body = await screen.findByTestId('week-day-list-sheet-body');
    expect(within(body).getAllByRole('button').length).toBe(7);
    expect(within(body).getByTestId('week-sheet-item-ad-sheet-1')).toBeTruthy();
    expect(within(body).getByTestId('week-sheet-item-ad-sheet-7')).toBeTruthy();

    await user.click(within(body).getByText('Conta 3'));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'ad-sheet-3' }));
  });

  it('renders the same rich card content as month view inside the weekly side sheet', async () => {
    const user = userEvent.setup();
    render(
      <WeekView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'week-rich-sheet',
            title: 'Colégio Isaac',
            subtitle: 'Não esquecer',
            display_end_at: null,
            badge: 'external',
            metadata: {
              event_kind: 'personal',
              priority: 'high',
              sync_provider: 'ticktick',
              sync_status: 'synced',
              ticktick_tags: ['escola', 'importante'],
            },
          }),
        ]}
        isLoading={false}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('week-all-day-count-2026-04-09'));

    const card = screen.getByTestId('week-sheet-item-week-rich-sheet');
    expect(card.className).toContain('rounded-xl');
    expect(screen.getByTestId('week-sheet-description-week-rich-sheet').textContent).toContain('Não esquecer');
    expect(screen.getByTestId('week-sheet-chips-week-rich-sheet').textContent).toContain('Pessoal');
    expect(screen.getByTestId('week-sheet-chips-week-rich-sheet').textContent).toContain('Prioridade: Alta');
    expect(screen.getByTestId('week-sheet-chips-week-rich-sheet').textContent).toContain('TickTick - Sincronizado');
    expect(screen.getByTestId('week-sheet-meta-week-rich-sheet').textContent).toContain('Dia inteiro');
    expect(screen.getByTestId('week-sheet-details-week-rich-sheet').textContent).toContain('escola');
    expect(screen.getByTestId('week-sheet-details-week-rich-sheet').textContent).toContain('importante');
  });

  it('Task 10: calls onEmptySlotClick with date and hour for an empty hour cell', async () => {
    const user = userEvent.setup();
    const onEmptySlotClick = vi.fn();
    const { container } = render(
      <WeekView
        anchor={ANCHOR}
        items={[]}
        isLoading={false}
        onItemClick={() => {}}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );
    const slot = container.querySelector('[data-week-empty-slot="2026-04-09"][data-hour="14"]') as HTMLElement;
    expect(slot).toBeTruthy();
    await user.click(slot);
    expect(onEmptySlotClick).toHaveBeenCalledTimes(1);
    const [d, h] = onEmptySlotClick.mock.calls[0];
    expect(d).toBeInstanceOf(Date);
    expect(h).toBe(14);
  });
});
