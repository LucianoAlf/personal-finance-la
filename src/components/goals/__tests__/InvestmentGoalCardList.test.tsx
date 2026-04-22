/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InvestmentGoalCardList, type InvestmentGoalItem } from '../InvestmentGoalCardList';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeGoal(overrides: Partial<InvestmentGoalItem> = {}): InvestmentGoalItem {
  return {
    id: 'ig1',
    name: 'Casa própria',
    icon: '🏠',
    target_amount: 100000,
    current_amount: 50000,
    percentage: 50,
    ...overrides,
  };
}

describe('InvestmentGoalCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no goals', () => {
    render(
      <InvestmentGoalCardList goals={[]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    expect(screen.getByText(/nenhuma meta/i)).toBeTruthy();
  });

  it('renders cards with blue border-left', () => {
    const { container } = render(
      <InvestmentGoalCardList goals={[makeGoal()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    const card = container.querySelector('[data-testid="invest-goal-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-blue-500');
  });

  it('shows percentage badge', () => {
    render(
      <InvestmentGoalCardList goals={[makeGoal()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('fires onCardTap with the goal when tapped', () => {
    const onCardTap = vi.fn();
    const goal = makeGoal();
    render(
      <InvestmentGoalCardList goals={[goal]} onCardTap={onCardTap} formatCurrency={format} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Casa própria' }));
    expect(onCardTap).toHaveBeenCalledWith(goal);
  });
});
