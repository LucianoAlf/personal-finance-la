/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReportsOverviewCards } from './ReportsOverviewCards';
import { ReportsPeriodFilter } from './ReportsPeriodFilter';
import { createEmptyReportContext } from '@/utils/reports/intelligence-contract';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className = '' }: { className?: string }) => <div className={className} />,
}));

describe('Reports premium top components', () => {
  it('renders the period filter as a premium analytics control bar with corrected copy', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ReportsPeriodFilter
        value="last_12_months"
        onChange={onChange}
        periodLabel="Últimos 12 meses"
      />,
    );

    const shell = container.firstElementChild as HTMLElement | null;

    expect(shell?.className).toContain('bg-card/95');
    expect(shell?.className).toContain('rounded-[28px]');
    expect(screen.getByText('Período do relatório')).not.toBeNull();
    expect(screen.getByText('Últimos 12 meses')).not.toBeNull();
    fireEvent.click(screen.getByText('30 dias'));
    expect(onChange).toHaveBeenCalledWith('last_30_days');
  });

  it('renders overview cards in the semantic premium family instead of old light pastel cards', () => {
    const context = createEmptyReportContext();
    context.overview = {
      financialScore: 48,
      savingsRate: null,
      netWorth: 14875,
      goalsReached: 0,
      activeGoals: 2,
      hasSufficientData: true,
    };
    context.quality.overview = { source: 'internal_calculation', completeness: 'complete' };
    context.quality.cashflow = { source: 'unavailable', completeness: 'unavailable' };
    context.quality.balanceSheet = { source: 'internal_calculation', completeness: 'partial' };
    context.quality.goals = { source: 'database_state', completeness: 'complete' };

    render(<ReportsOverviewCards context={context} />);

    const scoreCard = screen.getByText('Score Financeiro').closest('div[class*="rounded"]');
    const goalsCard = screen.getByText('Metas Alcançadas').closest('div[class*="rounded"]');

    expect(scoreCard?.className).toContain('bg-surface/92');
    expect(scoreCard?.className).toContain('shadow-[');
    expect(scoreCard?.className).not.toContain('bg-blue-50');
    expect(goalsCard?.className).toContain('bg-surface/92');
    expect(screen.getByText('Patrimônio Líquido')).not.toBeNull();
    expect(screen.getByText('Sem cálculo')).not.toBeNull();
    expect(screen.getByText('2 metas ativas')).not.toBeNull();
  });
});
