/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TemporalAnalysisCard } from './TemporalAnalysisCard';

vi.mock('@/hooks/useSpendingPatterns', () => ({
  useSpendingPatterns: () => ({
    loading: false,
    transactionCount: 4,
    insight: '',
    patterns: {
      dayOfWeek: 'Sabado',
      dayOfWeekCount: 4,
      preferredTime: '6h - 12h',
      preferredTimeCount: 4,
      installmentPercentage: 75,
      averageTicket: 161.25,
    },
    temporalData: {
      heatmap: [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [80, 0, 0],
      ],
      maxValue: 80,
    },
    daysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
  }),
}));

describe('TemporalAnalysisCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the temporal heatmap inside the premium analytics card family', () => {
    render(<TemporalAnalysisCard />);

    const root = screen.getByTestId('analytics-temporal-card');
    const content = screen.getByTestId('analytics-temporal-content');
    const cell = screen.getByTestId('analytics-temporal-cell-6-0');

    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(root.className).toContain('rounded-[30px]');
    expect(content.className).toContain('pt-5');
    expect(cell.className).toContain('rounded-xl');
  });
});
