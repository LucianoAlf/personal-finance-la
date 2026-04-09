/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MonthlyComparison } from './MonthlyComparison';

vi.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({
    pieData: [],
    timelineData: [],
    comparisonData: [
      {
        month: 'Abr 2026',
        total: 645,
        cards: {
          Nubank: 645,
        },
      },
      {
        month: 'Mar 2026',
        total: 500,
        cards: {
          Nubank: 500,
        },
      },
    ],
  }),
}));

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-responsive-container">{children}</div>
  );

  const MockBarChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-bar-chart">{children}</div>
  );

  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    BarChart: MockBarChart,
    Bar: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    Tooltip: passthrough,
    Legend: passthrough,
  };
});

describe('MonthlyComparison', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the monthly comparison in the premium analytics shell', () => {
    render(<MonthlyComparison analyticsData={{} as any} loading={false} />);

    const shell = screen.getByTestId('analytics-monthly-comparison-shell');
    const summary = screen.getByTestId('analytics-monthly-comparison-summary');

    expect(shell.className).toContain('bg-card/95');
    expect(shell.className).toContain('border-border/70');
    expect(summary.className).toContain('bg-surface-elevated/45');
  });
});
