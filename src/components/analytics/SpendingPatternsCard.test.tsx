/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SpendingPatternsCard } from './SpendingPatternsCard';

vi.mock('@/hooks/useSpendingPatterns', () => ({
  useSpendingPatterns: () => ({
    loading: false,
    transactionCount: 4,
    insight: '75% das suas compras sao parceladas.',
    patterns: {
      dayOfWeek: 'Sabado',
      dayOfWeekCount: 4,
      preferredTime: '6h - 12h',
      preferredTimeCount: 4,
      installmentPercentage: 75,
      averageTicket: 161.25,
    },
    temporalData: {
      heatmap: [],
      maxValue: 0,
    },
    daysShort: [],
  }),
}));

describe('SpendingPatternsCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders pattern cards and insight shell with the premium analytics style', () => {
    render(<SpendingPatternsCard />);

    const root = screen.getByTestId('analytics-spending-patterns-card');
    const content = screen.getByTestId('analytics-spending-patterns-content');
    const patternItem = screen.getByTestId('analytics-spending-pattern-item-day');
    const insight = screen.getByTestId('analytics-spending-patterns-insight');

    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(content.className).toContain('pt-5');
    expect(patternItem.className).toContain('bg-surface-elevated/45');
    expect(insight.className).toContain('bg-info-subtle/80');
  });
});
