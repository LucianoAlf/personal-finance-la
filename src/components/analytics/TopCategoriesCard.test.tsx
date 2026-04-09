/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TopCategoriesCard } from './TopCategoriesCard';

vi.mock('@/hooks/useTopSpending', () => ({
  useTopSpending: () => ({
    loading: false,
    totalSpent: 645,
    topCategories: [
      {
        categoryId: 'cat-1',
        categoryName: 'Esportes',
        categoryColor: '#10B981',
        categoryIcon: 'TrendingUp',
        totalAmount: 600,
        transactionCount: 3,
        percentageOfTotal: 93,
        changeFromLastMonth: 0,
      },
    ],
  }),
}));

describe('TopCategoriesCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders advanced analytics cards with the premium family shell', () => {
    render(<TopCategoriesCard />);

    const root = screen.getByTestId('analytics-top-categories-card');
    const content = screen.getByTestId('analytics-top-categories-content');
    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(root.className).toContain('rounded-[30px]');
    expect(content.className).toContain('pt-5');

    const row = screen.getByTestId('analytics-top-category-row-cat-1');
    expect(row.className).toContain('bg-surface-elevated/45');
  });
});
