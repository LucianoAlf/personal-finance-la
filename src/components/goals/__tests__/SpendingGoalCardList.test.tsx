/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SpendingGoalCardList } from '../SpendingGoalCardList';
import type { FinancialGoalWithCategory } from '@/types/goals.types';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeGoal(overrides: Partial<FinancialGoalWithCategory> = {}): FinancialGoalWithCategory {
  return {
    id: 's1',
    user_id: 'u1',
    goal_type: 'spending_limit',
    name: 'Alimentação',
    icon: '🍔',
    target_amount: 600,
    current_amount: 290,
    deadline: null,
    category_id: 'c1',
    period_type: 'monthly',
    status: 'active',
    streak_count: 0,
    best_streak: 0,
    category_name: 'Alimentação',
    percentage: 48,
    remaining: 310,
    days_left: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as FinancialGoalWithCategory;
}

describe('SpendingGoalCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no goals', () => {
    render(<SpendingGoalCardList goals={[]} onCardTap={vi.fn()} formatCurrency={format} />);
    expect(screen.getByText(/nenhum limite/i)).toBeTruthy();
  });

  it('renders cards with orange border-left', () => {
    const { container } = render(
      <SpendingGoalCardList goals={[makeGoal()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    const card = container.querySelector('[data-testid="spending-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-orange-500');
  });

  it('shows green badge when usage < 80%', () => {
    render(
      <SpendingGoalCardList
        goals={[makeGoal({ percentage: 50 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const badge = screen.getByTestId('pct-badge');
    expect(badge.className).toContain('text-emerald');
  });

  it('shows orange badge when usage 80-100%', () => {
    render(
      <SpendingGoalCardList
        goals={[makeGoal({ percentage: 90 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const badge = screen.getByTestId('pct-badge');
    expect(badge.className).toContain('text-orange');
  });

  it('shows red badge and "+R$ X acima" when usage > 100%', () => {
    render(
      <SpendingGoalCardList
        goals={[makeGoal({ percentage: 112, current_amount: 670, target_amount: 600 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const badge = screen.getByTestId('pct-badge');
    expect(badge.className).toContain('text-red');
    expect(screen.getByText(/acima/i)).toBeTruthy();
  });

  it('fires onCardTap when card is tapped', () => {
    const onCardTap = vi.fn();
    const goal = makeGoal();
    render(
      <SpendingGoalCardList goals={[goal]} onCardTap={onCardTap} formatCurrency={format} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Alimentação' }));
    expect(onCardTap).toHaveBeenCalledWith(goal);
  });
});
