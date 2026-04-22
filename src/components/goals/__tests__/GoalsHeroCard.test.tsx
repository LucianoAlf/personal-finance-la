/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GoalsHeroCard } from '../GoalsHeroCard';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const baseProps = {
  monthLabel: 'Janeiro 2026',
  savingsCurrent: 7500,
  savingsTarget: 25000,
  spendingLimitsOk: 3,
  spendingLimitsTotal: 5,
  investmentsCurrent: 50000,
  investmentsTarget: 100000,
  streakDays: 14,
  formatCurrency: format,
};

describe('GoalsHeroCard', () => {
  afterEach(() => cleanup());

  it('renders the month label', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/janeiro 2026/i)).toBeTruthy();
  });

  it('renders the 4 summary rows: Economia, Limites, Investimentos, Streak', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/economia/i)).toBeTruthy();
    expect(screen.getByText(/limites/i)).toBeTruthy();
    expect(screen.getByText(/investimentos/i)).toBeTruthy();
    expect(screen.getByText(/streak/i)).toBeTruthy();
  });

  it('formats savings and investments with formatCurrency', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/R\$ 7500,00/)).toBeTruthy();
    expect(screen.getByText(/R\$ 50000,00/)).toBeTruthy();
  });

  it('shows spending limits as "X / Y OK"', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/3 \/ 5/i)).toBeTruthy();
  });

  it('shows streak in days', () => {
    render(<GoalsHeroCard {...baseProps} />);
    expect(screen.getByText(/14 dias/i)).toBeTruthy();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<GoalsHeroCard {...baseProps} />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
