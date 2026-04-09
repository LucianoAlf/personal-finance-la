/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CardComparisonCard } from './CardComparisonCard';

vi.mock('@/hooks/useCardComparison', () => ({
  useCardComparison: () => ({
    loading: false,
    recommendation: 'Use o cartao Itau - melhor eficiencia!',
    cards: [
      {
        cardId: 'card-1',
        cardName: 'Itau',
        cardBrand: 'visa',
        limitUsed: 645,
        limitTotal: 25000,
        limitPercentage: 2.58,
        averageSpending: 161.25,
        topCategory: 'Esportes',
        topCategoryColor: '#10B981',
        transactionCount: 4,
        efficiencyScore: 97,
      },
    ],
  }),
}));

describe('CardComparisonCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders premium comparison cards with semantic recommendation treatment', () => {
    render(<CardComparisonCard />);

    const root = screen.getByTestId('analytics-card-comparison-card');
    const content = screen.getByTestId('analytics-card-comparison-content');
    const recommendation = screen.getByTestId('analytics-card-comparison-recommendation');
    const row = screen.getByTestId('analytics-card-comparison-row-card-1');

    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(content.className).toContain('pt-5');
    expect(recommendation.className).toContain('bg-success-subtle/80');
    expect(row.className).toContain('bg-surface-elevated/45');
  });
});
