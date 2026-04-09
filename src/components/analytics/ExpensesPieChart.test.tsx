/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExpensesPieChart } from './ExpensesPieChart';

vi.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({
    pieData: [
      {
        name: 'Esportes',
        value: 600,
        color: '#10B981',
        percentage: 93,
      },
    ],
    timelineData: [],
    comparisonData: [],
  }),
}));

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-responsive-container">{children}</div>
  );

  const MockPieChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pie-chart">{children}</div>
  );

  const MockPie = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-pie">{children}</div>
  );

  const MockCell = () => <div data-testid="mock-cell" />;
  const MockLegend = ({ content }: { content?: React.ReactNode }) => (
    <div data-testid="mock-legend">
      {React.isValidElement(content)
        ? React.cloneElement(content as React.ReactElement<any>, {
            payload: [
              {
                value: 'Esportes',
                color: '#10B981',
                payload: {
                  value: 600,
                },
              },
            ],
          })
        : null}
    </div>
  );
  const MockTooltip = () => <div data-testid="mock-tooltip" />;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    PieChart: MockPieChart,
    Pie: MockPie,
    Cell: MockCell,
    Legend: MockLegend,
    Tooltip: MockTooltip,
  };
});

describe('ExpensesPieChart', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the chart shell with the premium analytics family styles', () => {
    render(<ExpensesPieChart analyticsData={{} as any} loading={false} />);

    const shell = screen.getByTestId('analytics-pie-chart-shell');
    const legendItem = screen.getByTestId('analytics-pie-legend-Esportes');

    expect(shell.className).toContain('bg-card/95');
    expect(shell.className).toContain('border-border/70');
    expect(shell.className).toContain('rounded-[30px]');
    expect(legendItem.className).toContain('bg-surface-elevated/45');
  });
});
