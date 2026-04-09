/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { InvestmentPlanningCalculator } from './InvestmentPlanningCalculator';

vi.mock('@/hooks/useBenchmarks', () => ({
  useBenchmark: () => 4.75,
}));

describe('InvestmentPlanningCalculator', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the planning shell tokenized and readable', () => {
    const { container } = render(
      <InvestmentPlanningCalculator
        title="Planejamento patrimonial"
        description="Projete seu patrimônio futuro."
        initialCurrentAmount={10000}
        initialMonthlyContribution={500}
        initialTargetAmount={200000}
        initialYearsToGoal={15}
        initialAnnualReturnRate={8}
        initialDesiredMonthlyIncome={3000}
      />,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain('bg-card/95');
    expect(root?.className).toContain('border-border/70');
    expect(screen.getByText('Planejamento patrimonial')).not.toBeNull();
    expect(screen.getByText('Projete seu patrimônio futuro.')).not.toBeNull();
    expect(screen.getByText('Meta nominal futura')).not.toBeNull();
  });
});
