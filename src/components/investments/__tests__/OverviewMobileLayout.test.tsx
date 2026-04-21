/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../AssetAllocationChart', () => ({
  AssetAllocationChart: () => <div data-testid="asset-allocation-chart" />,
}));
vi.mock('../PortfolioEvolutionChart', () => ({
  PortfolioEvolutionChart: () => <div data-testid="portfolio-evolution-chart" />,
}));
vi.mock('../PerformanceBarChart', () => ({
  PerformanceBarChart: () => <div data-testid="performance-bar-chart" />,
}));
vi.mock('../AnaInvestmentInsights', () => ({
  AnaInvestmentInsights: () => <div data-testid="ana-insights" />,
}));

import { OverviewMobileLayout } from '../OverviewMobileLayout';

describe('OverviewMobileLayout', () => {
  afterEach(() => cleanup());

  it('renders the 3 charts stacked in order: Allocation, Evolution, Performance', () => {
    const { container } = render(<OverviewMobileLayout />);
    const testIds = Array.from(container.querySelectorAll('[data-testid]'))
      .map((el) => el.getAttribute('data-testid'))
      .filter((id): id is string =>
        id === 'asset-allocation-chart' ||
        id === 'portfolio-evolution-chart' ||
        id === 'performance-bar-chart',
      );
    expect(testIds).toEqual([
      'asset-allocation-chart',
      'portfolio-evolution-chart',
      'performance-bar-chart',
    ]);
  });

  it('renders AnaInvestmentInsights after the charts', () => {
    render(<OverviewMobileLayout />);
    expect(screen.getByTestId('ana-insights')).toBeTruthy();
  });

  it('does not render desktop-only widget placeholders on mobile', () => {
    render(<OverviewMobileLayout />);
    expect(screen.queryByText(/heatmap/i)).toBeNull();
    expect(screen.queryByText(/rebalance/i)).toBeNull();
    expect(screen.queryByText(/planejamento/i)).toBeNull();
    expect(screen.queryByText(/disponível no desktop/i)).toBeNull();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(<OverviewMobileLayout />);
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
