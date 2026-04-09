/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExpensesTimeline } from './ExpensesTimeline';

vi.mock('@/hooks/useChartData', () => ({
  useChartData: () => ({
    pieData: [],
    timelineData: [
      {
        date: '2026-04-03',
        amount: 200,
        accumulated: 200,
      },
    ],
    comparisonData: [],
  }),
}));

vi.mock('recharts', () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-responsive-container">{children}</div>
  );

  const MockAreaChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-area-chart">{children}</div>
  );

  const MockLineChart = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-line-chart">{children}</div>
  );

  const passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: MockAreaChart,
    LineChart: MockLineChart,
    Area: passthrough,
    Line: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    Tooltip: passthrough,
    Legend: passthrough,
  };
});

describe('ExpensesTimeline', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the timeline chart inside the premium analytics shell', () => {
    render(<ExpensesTimeline analyticsData={{} as any} loading={false} />);

    const shell = screen.getByTestId('analytics-timeline-shell');
    const toggle = screen.getByTestId('analytics-timeline-toggle-accumulated');

    expect(shell.className).toContain('bg-card/95');
    expect(shell.className).toContain('border-border/70');
    expect(toggle.className).toContain('bg-surface/70');
  });
});
