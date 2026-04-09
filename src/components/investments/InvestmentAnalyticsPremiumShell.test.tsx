/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AssetAllocationChart } from './AssetAllocationChart';
import { PortfolioEvolutionChart } from './PortfolioEvolutionChart';
import { BenchmarkComparison } from './BenchmarkComparison';
import { PerformanceHeatMap } from './PerformanceHeatMap';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('@/hooks/usePortfolioHistory', () => ({
  usePortfolioHistory: () => ({
    history: [
      { snapshot_date: '2026-01-01', total_invested: 1000, current_value: 1100 },
      { snapshot_date: '2026-02-01', total_invested: 1500, current_value: 1625 },
    ],
    loading: false,
  }),
}));

vi.mock('@/hooks/useBenchmarks', () => ({
  useBenchmarks: () => [
    { name: 'CDI', return: 8.2 },
    { name: 'IPCA', return: 4.75 },
  ],
  getBenchmarkDescription: (name: string) => `Descrição de ${name}`,
}));

vi.mock('@/hooks/useMonthlyReturns', () => ({
  usePortfolioReturn: () => 5.5,
  useMonthlyReturns: () => [
    { date: new Date('2026-01-01'), month: 'jan/2026', return: 1.2, value: 1000 },
    { date: new Date('2026-02-01'), month: 'fev/2026', return: -0.5, value: 980 },
  ],
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Investment analytics premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the chart family with premium shells and no white tooltip wrappers', () => {
    const { container: allocationContainer } = render(
      <AssetAllocationChart
        data={[
          { category: 'stocks', value: 6000, percentage: 60, count: 3 },
          { category: 'cash', value: 4000, percentage: 40, count: 1 },
        ]}
      />,
    );
    const allocationRoot = allocationContainer.firstElementChild as HTMLElement | null;
    expect(allocationRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Alocação por Categoria')).not.toBeNull();

    const { container: evolutionContainer } = render(
      <PortfolioEvolutionChart totalInvested={10000} currentValue={11000} />,
    );
    const evolutionRoot = evolutionContainer.firstElementChild as HTMLElement | null;
    expect(evolutionRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Evolução do Portfólio')).not.toBeNull();

    const { container: benchmarkContainer } = render(<BenchmarkComparison />);
    const benchmarkRoot = benchmarkContainer.firstElementChild as HTMLElement | null;
    expect(benchmarkRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Comparação com benchmarks')).not.toBeNull();

    const { container: heatmapContainer } = render(<PerformanceHeatMap />);
    const heatmapRoot = heatmapContainer.firstElementChild as HTMLElement | null;
    expect(heatmapRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Performance Mensal Estimada (12 meses)')).not.toBeNull();
  });
});
