/* @vitest-environment jsdom */

import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DEFAULT_RECURRENCE_CONFIG,
  RecurrenceSelector,
  type RecurrenceConfig,
} from '../RecurrenceSelector';
import { ReminderList, type ReminderEntry } from '../ReminderList';

beforeEach(() => {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
  Element.prototype.setPointerCapture = function () {};
  Element.prototype.releasePointerCapture = function () {};
  Element.prototype.scrollIntoView = function () {};
});

afterEach(() => {
  cleanup();
});

describe('RecurrenceSelector', () => {
  it('offers yearly recurrence as an available option', async () => {
    const user = userEvent.setup();
    render(
      <RecurrenceSelector value={{ ...DEFAULT_RECURRENCE_CONFIG }} onChange={() => {}} />,
    );

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));

    expect(await waitFor(() => screen.getByRole('option', { name: /^anual$/i }))).toBeTruthy();
  });

  it('updates config when frequency changes to weekly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecurrenceSelector value={{ ...DEFAULT_RECURRENCE_CONFIG }} onChange={onChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(
      await waitFor(() => screen.getByRole('option', { name: /^semanal$/i })),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: 'weekly',
        interval: 1,
      }),
    );
  });

  it('monthly: choosing fixed day-of-month sets byMonthday', async () => {
    const user = userEvent.setup();

    function MonthlyHarness() {
      const [cfg, setCfg] = useState<RecurrenceConfig>({
        ...DEFAULT_RECURRENCE_CONFIG,
        frequency: 'monthly',
        interval: 1,
      });
      return (
        <RecurrenceSelector
          value={cfg}
          onChange={(next) => {
            setCfg(next);
          }}
        />
      );
    }

    render(<MonthlyHarness />);

    await user.click(screen.getByLabelText(/no dia fixo do mês/i));
    const dayInput = await waitFor(() => screen.getByDisplayValue('15'));

    fireEvent.change(dayInput, { target: { value: '22' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('22')).toBeTruthy();
    });
  });

  it('monthly radio options share the same native name', () => {
    render(
      <RecurrenceSelector
        value={{
          ...DEFAULT_RECURRENCE_CONFIG,
          frequency: 'monthly',
          interval: 1,
        }}
        onChange={() => {}}
      />,
    );

    const monthlyRadios = screen.getAllByRole('radio');
    expect(monthlyRadios).toHaveLength(2);

    const firstName = monthlyRadios[0]?.getAttribute('name');
    const secondName = monthlyRadios[1]?.getAttribute('name');

    expect(firstName).toBeTruthy();
    expect(firstName).toBe(secondName);
  });

  it('clears stale recurrence and end-state fields when frequency changes to none', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecurrenceSelector
        value={{
          frequency: 'monthly',
          interval: 2,
          byWeekday: ['MO'],
          byMonthday: [22],
          endType: 'date',
          endDate: '2026-05-10',
          endCount: 8,
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: /recorrência/i }));
    await user.click(await waitFor(() => screen.getByRole('option', { name: /^nenhuma$/i })));

    expect(onChange).toHaveBeenCalledWith({
      frequency: 'none',
      interval: 1,
      byWeekday: [],
      byMonthday: [],
      endType: 'never',
      endDate: undefined,
      endCount: undefined,
    });
  });

  it('clears stale end fields when end type changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecurrenceSelector
        value={{
          frequency: 'weekly',
          interval: 1,
          byWeekday: ['MO'],
          byMonthday: [],
          endType: 'date',
          endDate: '2026-06-01',
          endCount: 3,
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: /término da repetição/i }));
    await user.click(await waitFor(() => screen.getByRole('option', { name: /após n vezes/i })));

    expect(onChange).toHaveBeenCalledWith({
      frequency: 'weekly',
      interval: 1,
      byWeekday: ['MO'],
      byMonthday: [],
      endType: 'count',
      endDate: undefined,
      endCount: 10,
    });
  });

  it('heals stale incoming state upstream on mount', async () => {
    const onChange = vi.fn();

    render(
      <RecurrenceSelector
        value={{
          frequency: 'none',
          interval: 7,
          byWeekday: ['MO'],
          byMonthday: [22],
          endType: 'count',
          endDate: '2026-06-01',
          endCount: 4,
        }}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        frequency: 'none',
        interval: 1,
        byWeekday: [],
        byMonthday: [],
        endType: 'never',
        endDate: undefined,
        endCount: undefined,
      });
    });
  });
});

describe('ReminderList', () => {
  it('shows honest helper copy about V1 relative reminders and TickTick parity', () => {
    const reminders: ReminderEntry[] = [{ id: 'r1', offsetMinutes: 15 }];
    render(<ReminderList reminders={reminders} onChange={() => {}} />);

    expect(screen.getByTestId('reminder-parity-notice').textContent).toMatch(/ticktick/i);
    expect(screen.getByTestId('reminder-parity-notice').textContent).toMatch(/relativ/i);
    expect(screen.getByTestId('reminder-parity-notice').textContent).toMatch(/absolut/i);
  });

  it('adds a new reminder with the default offset', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReminderList reminders={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /adicionar lembrete/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as ReminderEntry[];
    expect(next).toHaveLength(1);
    expect(next[0]?.offsetMinutes).toBe(30);
    expect(next[0]?.id).toBeTruthy();
  });

  it('removes a reminder by id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReminderList
        reminders={[
          { id: 'r1', offsetMinutes: 15 },
          { id: 'r2', offsetMinutes: 30 },
        ]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /remover lembrete 1/i }));

    expect(onChange).toHaveBeenCalledWith([{ id: 'r2', offsetMinutes: 30 }]);
  });

  it('updates an existing reminder offset', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReminderList
        reminders={[{ id: 'r1', offsetMinutes: 15 }]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: /lembrete 1/i }));
    await user.click(await waitFor(() => screen.getByRole('option', { name: /^1 hora antes$/i })));

    expect(onChange).toHaveBeenCalledWith([{ id: 'r1', offsetMinutes: 60 }]);
  });
});
