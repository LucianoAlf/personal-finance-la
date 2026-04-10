/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Reports } from './Reports';

const reportsIntelligenceState = {
  context: null,
  loading: false,
  fetching: false,
  error: null as Error | null,
};

const reportsAnaState = {
  data: null,
  loading: false,
};

vi.mock('@/components/layout/Header', () => ({
  Header: ({
    title,
    subtitle,
    actions,
  }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {actions ? <div>{actions}</div> : null}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useReportsIntelligence', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useReportsIntelligence')>(
    '@/hooks/useReportsIntelligence',
  );

  return {
    ...actual,
    useReportsIntelligence: () => ({
      data: reportsIntelligenceState.context,
      error: reportsIntelligenceState.error,
      isLoading: reportsIntelligenceState.loading,
      isFetching: reportsIntelligenceState.fetching,
      refetch: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/useReportAnaInsights', () => ({
  useReportAnaInsights: () => ({
    data: reportsAnaState.data,
    isLoading: reportsAnaState.loading,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/reports/ReportsPeriodFilter', () => ({
  ReportsPeriodFilter: () => <div>reports-period-filter-mounted</div>,
}));

vi.mock('@/components/reports/ReportsOverviewCards', () => ({
  ReportsOverviewCards: () => <div>reports-overview-cards-mounted</div>,
}));

vi.mock('@/components/reports/ReportsSpendingSection', () => ({
  ReportsSpendingSection: () => <div>reports-spending-mounted</div>,
}));

vi.mock('@/components/reports/ReportsTrendSection', () => ({
  ReportsTrendSection: () => <div>reports-trend-mounted</div>,
}));

vi.mock('@/components/reports/ReportsBalanceSheetSection', () => ({
  ReportsBalanceSheetSection: () => <div>reports-balance-mounted</div>,
}));

vi.mock('@/components/reports/ReportsObligationsSection', () => ({
  ReportsObligationsSection: () => <div>reports-obligations-mounted</div>,
}));

vi.mock('@/components/reports/ReportsGoalsSection', () => ({
  ReportsGoalsSection: () => <div>reports-goals-mounted</div>,
}));

vi.mock('@/components/reports/ReportsInvestmentsSection', () => ({
  ReportsInvestmentsSection: () => <div>reports-investments-mounted</div>,
}));

vi.mock('@/components/reports/ReportsAnaSection', () => ({
  ReportsAnaSection: () => <div>reports-ana-mounted</div>,
}));

vi.mock('@/components/reports/ReportsEmptyState', () => ({
  ReportsEmptyState: () => <div>reports-empty-mounted</div>,
}));

vi.mock('@/components/reports/ReportsExportButton', () => ({
  ReportsExportButton: () => <button type="button">Exportar PDF</button>,
}));

describe('Reports premium shell regression', () => {
  afterEach(() => {
    cleanup();
    reportsIntelligenceState.context = null;
    reportsIntelligenceState.loading = false;
    reportsIntelligenceState.fetching = false;
    reportsIntelligenceState.error = null;
    reportsAnaState.data = null;
    reportsAnaState.loading = false;
  });

  it('renders the reports page inside the premium shell with corrected portuguese copy', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/relatorios']}>
        <Reports />
      </MemoryRouter>,
    );

    const root = container.querySelector('.min-h-screen');

    expect(root?.className).toContain('bg-background');
    expect(root?.className).toContain('text-foreground');
    expect(screen.getByText('Relatórios')).not.toBeNull();
    expect(screen.getByText('Análises detalhadas da sua vida financeira')).not.toBeNull();
    expect(screen.getByText('reports-period-filter-mounted')).not.toBeNull();
    expect(screen.getByText('Exportar PDF')).not.toBeNull();
  });

  it('keeps the page shell visible while the report intelligence is loading', () => {
    reportsIntelligenceState.loading = true;

    render(
      <MemoryRouter initialEntries={['/relatorios']}>
        <Reports />
      </MemoryRouter>,
    );

    expect(screen.getByText('Relatórios')).not.toBeNull();
    expect(screen.getByText('reports-period-filter-mounted')).not.toBeNull();
    expect(screen.getByText('reports-overview-cards-mounted')).not.toBeNull();
  });
});
