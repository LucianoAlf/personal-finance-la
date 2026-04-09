/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { TransactionTimeline } from './TransactionTimeline';
import { DividendCalendar } from './DividendCalendar';
import { DividendHistoryTable } from './DividendHistoryTable';
import { DiversificationScoreCard } from './DiversificationScoreCard';
import { PerformanceBarChart } from './PerformanceBarChart';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    li: ({ children, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Investment supporting premium shell', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps timeline and dividend sections tokenized and readable in pt-BR', () => {
    const { container: timelineContainer } = render(<TransactionTimeline transactions={[]} />);
    const timelineRoot = timelineContainer.firstElementChild as HTMLElement | null;
    expect(timelineRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Nenhuma transação registrada')).not.toBeNull();

    const { container: calendarContainer } = render(
      <DividendCalendar monthlyBreakdown={[]} totalEstimated={0} next30Days={0} next90Days={0} />,
    );
    const calendarRoot = calendarContainer.firstElementChild as HTMLElement | null;
    expect(calendarRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Calendário de dividendos')).not.toBeNull();

    const { container: historyContainer } = render(
      <DividendHistoryTable transactions={[]} totalReceived={0} yearlyTotals={[]} count={0} />,
    );
    const historyRoot = historyContainer.firstElementChild as HTMLElement | null;
    expect(historyRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Histórico de dividendos')).not.toBeNull();
  });

  it('modernizes diversification and performance blocks into the premium shell', () => {
    const investments = [
      {
        id: 'inv-1',
        name: 'Tesouro IPCA 2029',
        ticker: 'IPCA2029',
        type: 'treasury',
        category: 'fixed_income',
        quantity: 10,
        purchase_price: 1000,
        total_invested: 10000,
        current_value: 10800,
      },
      {
        id: 'inv-2',
        name: 'ETF Internacional',
        ticker: 'IVVB11',
        type: 'stock',
        category: 'stocks',
        quantity: 20,
        purchase_price: 200,
        total_invested: 4000,
        current_value: 4200,
      },
    ] as any;

    const { container: diversificationContainer } = render(
      <DiversificationScoreCard investments={investments} />,
    );
    const diversificationRoot = diversificationContainer.firstElementChild as HTMLElement | null;
    expect(diversificationRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Pontuação de Diversificação')).not.toBeNull();

    const { container: performanceContainer } = render(
      <PerformanceBarChart investments={investments} />,
    );
    const performanceRoot = performanceContainer.firstElementChild as HTMLElement | null;
    expect(performanceRoot?.className).toContain('bg-card/95');
    expect(screen.getByText('Performance por Ativo (Top 10)')).not.toBeNull();
  });
});
