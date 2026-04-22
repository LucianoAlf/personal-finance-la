/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SavingsGoalCardList } from '../SavingsGoalCardList';
import type { FinancialGoalWithCategory } from '@/types/database.types';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeGoal(overrides: Partial<FinancialGoalWithCategory> = {}): FinancialGoalWithCategory {
  return {
    id: 'g1',
    user_id: 'u1',
    goal_type: 'savings',
    name: 'Viagem Europa',
    icon: '✈️',
    target_amount: 10000,
    current_amount: 4200,
    deadline: new Date('2026-12-31'),
    category_id: null,
    period_type: null,
    status: 'active',
    streak_count: 0,
    best_streak: 0,
    category_name: null,
    percentage: 42,
    remaining: 5800,
    days_left: 180,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  } as FinancialGoalWithCategory;
}

describe('SavingsGoalCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no goals', () => {
    render(
      <SavingsGoalCardList
        goals={[]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/nenhuma meta/i)).toBeTruthy();
  });

  it('renders one card per goal', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal(), makeGoal({ id: 'g2', name: 'Notebook' })]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('Viagem Europa')).toBeTruthy();
    expect(screen.getByText('Notebook')).toBeTruthy();
  });

  it('shows percentage badge', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal()]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('renders progressbar with correct aria-valuenow', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal()]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('fires onCardTap when card is tapped', () => {
    const onCardTap = vi.fn();
    const goal = makeGoal();
    render(
      <SavingsGoalCardList
        goals={[goal]}
        onCardTap={onCardTap}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Viagem Europa' }));
    expect(onCardTap).toHaveBeenCalledWith(goal);
  });

  it('shows "Adicionar valor" button only on active goals and fires onAddValue', () => {
    const onAddValue = vi.fn();
    const goal = makeGoal({ status: 'active' });
    render(
      <SavingsGoalCardList
        goals={[goal]}
        onCardTap={vi.fn()}
        onAddValue={onAddValue}
        formatCurrency={format}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /adicionar valor/i }));
    expect(onAddValue).toHaveBeenCalledWith(goal);
  });

  it('hides "Adicionar valor" on completed goals', () => {
    render(
      <SavingsGoalCardList
        goals={[makeGoal({ status: 'completed' })]}
        onCardTap={vi.fn()}
        onAddValue={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.queryByRole('button', { name: /adicionar valor/i })).toBeNull();
  });
});
