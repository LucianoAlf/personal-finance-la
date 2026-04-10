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

  it('shows a hover tooltip with the hidden subtitle for compact month chips', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'month-tooltip',
            title: 'Reunião curta',
            subtitle: 'Descrição escondida do mês',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    expect(screen.queryByText('Descrição escondida do mês')).toBeNull();
    await user.hover(screen.getByTestId('month-item-month-tooltip'));
    expect((await screen.findAllByText('Descrição escondida do mês')).length).toBeGreaterThan(0);
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
    expect(within(sheetBody).getByTestId('month-sheet-item-k1').className).toContain('shrink-0');
    await user.click(within(sheetBody).getByText('Item 3'));
    expect(onItemClick).toHaveBeenCalledWith(expect.objectContaining({ dedup_key: 'k3', title: 'Item 3' }));
  });

  it('keeps the opened day sheet in sync when items change after editing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'live-sync',
            title: 'Correr',
            subtitle: 'Antes de salvar',
            display_start_at: '2026-04-09T09:00:00',
            display_end_at: '2026-04-09T10:00:00',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-09'));
    expect(screen.getByTestId('month-sheet-description-live-sync').textContent).toContain('Antes de salvar');
    expect(screen.getByTestId('month-sheet-meta-live-sync').textContent).toContain('09:00');

    rerender(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'live-sync',
            title: 'Correr',
            subtitle: 'Depois de salvar',
            display_start_at: '2026-04-09T11:00:00',
            display_end_at: '2026-04-09T12:00:00',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    expect(screen.getByTestId('month-sheet-description-live-sync').textContent).toContain('Depois de salvar');
    expect(screen.getByTestId('month-sheet-meta-live-sync').textContent).toContain('11:00');
    expect(screen.getByTestId('month-sheet-meta-live-sync').textContent).not.toContain('09:00');
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

  it('renders description directly below title when subtitle has extra context', async () => {
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
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('py-3.5');
    const desc = screen.getByTestId('month-sheet-description-sheet-detail');
    expect(within(desc).getByText('fdfd')).toBeTruthy();
  });

  it('renders description, priority and ticktick tags in the month sheet card with rich context', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'sheet-rich',
            title: 'Correr',
            subtitle: 'Correr as 10h da manhã',
            status: 'scheduled',
            metadata: {
              priority: 'high',
              ticktick_tags: ['saude', 'manhã'],
            },
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-09'));

    const card = screen.getByTestId('month-sheet-item-sheet-rich');
    const chips = screen.getByTestId('month-sheet-chips-sheet-rich');
    const desc = screen.getByTestId('month-sheet-description-sheet-rich');
    const tags = screen.getByTestId('month-sheet-details-sheet-rich');

    expect(within(chips).getByText('Prioridade: Alta')).toBeTruthy();
    expect(within(desc).getByText('Correr as 10h da manhã')).toBeTruthy();
    expect(within(tags).getByText('saude')).toBeTruthy();
    expect(within(tags).getByText('manhã')).toBeTruthy();
  });

  it('treats external midnight-to-midnight events as all-day in the month sheet card', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'sheet-external-all-day',
            title: 'Correr',
            badge: 'external',
            display_start_at: '2026-04-10T00:00:00-03:00',
            display_end_at: '2026-04-10T00:00:00-03:00',
            subtitle: 'Correr as 10h da manhã',
            metadata: {
              priority: 'high',
              sync_provider: 'ticktick',
            },
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-10'));

    const card = screen.getByTestId('month-sheet-item-sheet-external-all-day');
    const meta = screen.getByTestId('month-sheet-meta-sheet-external-all-day');
    const desc = screen.getByTestId('month-sheet-description-sheet-external-all-day');
    const chips = screen.getByTestId('month-sheet-chips-sheet-external-all-day');

    expect(within(meta).getByText('Dia inteiro')).toBeTruthy();
    expect(within(meta).queryByText('00:00')).toBeNull();
    expect(within(chips).getByText('Prioridade: Alta')).toBeTruthy();
    expect(within(desc).getByText('Correr as 10h da manhã')).toBeTruthy();
  });

  it('surfaces category, priority and sync context in the outer month sheet card', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'sheet-rich-external',
            title: 'Correr',
            badge: 'external',
            status: 'scheduled',
            display_start_at: '2026-04-10T00:00:00-03:00',
            display_end_at: '2026-04-10T00:00:00-03:00',
            subtitle: 'Correr as 10h da manhã',
            metadata: {
              event_kind: 'personal',
              priority: 'high',
              sync_provider: 'ticktick',
              sync_status: 'synced',
              ticktick_tags: ['saude'],
            },
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-10'));

    const card = screen.getByTestId('month-sheet-item-sheet-rich-external');
    const chips = screen.getByTestId('month-sheet-chips-sheet-rich-external');
    const desc = screen.getByTestId('month-sheet-description-sheet-rich-external');
    const tags = screen.getByTestId('month-sheet-details-sheet-rich-external');

    expect(within(card).getByText('Pessoal')).toBeTruthy();
    expect(within(chips).getByText('TickTick - Sincronizado')).toBeTruthy();
    expect(within(chips).getByText('Prioridade: Alta')).toBeTruthy();
    expect(within(desc).getByText('Correr as 10h da manhã')).toBeTruthy();
    expect(within(tags).getByText('saude')).toBeTruthy();
  });

  it('shows "Vencimento" label and fallback time for derived financial items in sheet card', async () => {
    const user = userEvent.setup();
    render(
      <MonthView
        anchor={ANCHOR}
        items={[
          baseItem({
            dedup_key: 'sheet-bill',
            title: 'Aluguel',
            agenda_item_type: 'derived_projection',
            origin_type: 'payable_bill',
            badge: 'bill',
            status: 'pending',
            is_read_only: true,
            display_start_at: '2026-04-10T00:00:00-03:00',
            display_end_at: '2026-04-10T23:59:59-03:00',
          }),
        ]}
        isLoading={false}
        onDayClick={() => {}}
        onItemClick={() => {}}
      />,
    );

    await user.click(screen.getByTestId('month-day-count-2026-04-10'));
    const meta = screen.getByTestId('month-sheet-meta-sheet-bill');
    expect(within(meta).getByText('Vencimento')).toBeTruthy();
    expect(within(meta).getByText(/09:00/)).toBeTruthy();
    expect(within(meta).getByText(/10:00/)).toBeTruthy();
  });
});
