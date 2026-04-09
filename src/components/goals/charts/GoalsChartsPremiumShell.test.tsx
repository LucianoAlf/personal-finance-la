/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import {
  GoalProgressTooltipContent,
} from './GoalProgressHistoryChart';
import {
  SpendingTrendTooltipContent,
} from './SpendingCategoryTrendChart';

describe('Goals charts premium shell', () => {
  it('renders the savings progress tooltip with tokenized dark surface styling', () => {
    render(
      <GoalProgressTooltipContent
        active
        payload={[{ value: 500, payload: { month: 'abr/2026' } }]}
      />,
    );

    const tooltip = screen.getByTestId('goal-progress-tooltip');
    expect(within(tooltip).getByText('abr/2026')).not.toBeNull();
    expect(within(tooltip).getByText('Acumulado')).not.toBeNull();
    expect(within(tooltip).getByText('R$ 500,00')).not.toBeNull();
    expect(tooltip.className).toContain('bg-card/95');
    expect(tooltip.className).toContain('border-border/70');
    expect(tooltip.className).not.toContain('bg-white');
  });

  it('renders the spending trend tooltip with tokenized dark surface styling', () => {
    render(
      <SpendingTrendTooltipContent
        active
        payload={[{ value: 275, payload: { month: 'abr/2026' } }]}
      />,
    );

    const tooltip = screen.getByTestId('spending-trend-tooltip');
    expect(within(tooltip).getByText('abr/2026')).not.toBeNull();
    expect(within(tooltip).getByText('Gastos')).not.toBeNull();
    expect(within(tooltip).getByText('R$ 275,00')).not.toBeNull();
    expect(tooltip.className).toContain('bg-card/95');
    expect(tooltip.className).toContain('border-border/70');
    expect(tooltip.className).not.toContain('bg-white');
  });
});
