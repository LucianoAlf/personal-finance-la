/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChartsSection } from './ChartsSection';

vi.mock('./ExpensesPieChart', () => ({
  ExpensesPieChart: () => <div>expenses-pie-chart-mounted</div>,
}));

vi.mock('./ExpensesTimeline', () => ({
  ExpensesTimeline: () => <div>expenses-timeline-mounted</div>,
}));

vi.mock('./MonthlyComparison', () => ({
  MonthlyComparison: () => <div>monthly-comparison-mounted</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="analytics-charts-tabs" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ChartsSection', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders premium chart tabs shell before the chart content', () => {
    render(<ChartsSection analyticsData={{} as any} loading={false} />);

    const tabs = screen.getByTestId('analytics-charts-tabs');
    expect(tabs.className).toContain('rounded-[1.4rem]');
    expect(tabs.className).toContain('border-border/70');
    expect(tabs.className).toContain('bg-card/95');
    expect(screen.getByText('expenses-pie-chart-mounted')).not.toBeNull();
  });
});
