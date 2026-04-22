/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SpendingMonthSelector } from '../SpendingMonthSelector';

describe('SpendingMonthSelector', () => {
  afterEach(() => cleanup());

  it('renders the month label in PT-BR', () => {
    render(
      <SpendingMonthSelector
        selectedMonth={new Date(2026, 0, 15)}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/janeiro 2026/i)).toBeTruthy();
  });

  it('navigates to previous month when prev is tapped', () => {
    const onChange = vi.fn();
    render(
      <SpendingMonthSelector
        selectedMonth={new Date(2026, 1, 15)}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /mês anterior/i }));
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(0);
    expect(arg.getFullYear()).toBe(2026);
  });

  it('navigates to next month when next is tapped', () => {
    const onChange = vi.fn();
    render(
      <SpendingMonthSelector
        selectedMonth={new Date(2026, 0, 15)}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /próximo mês/i }));
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(1);
    expect(arg.getFullYear()).toBe(2026);
  });
});
