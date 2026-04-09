/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BillReportsDashboard } from './BillReportsDashboard';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/hooks/useBillReports', () => ({
  useBillReports: () => ({
    data: {
      totals: {
        total_amount: 349,
        total_bills: 2,
        paid_count: 0,
      },
      comparison: {
        variation_percent: 0,
        trend: 'stable',
        difference: 349,
      },
      forecast: {
        next_month_prediction: 99,
        based_on_months: 1,
      },
      performance: {
        on_time_payment_rate: 100,
        paid_on_time_count: 0,
      },
      potential_savings: {
        total_potential_savings: 0,
      },
      top_increases: [],
      biggest_expense: {
        description: 'Conta de Luz',
      },
      by_type: {},
      monthly_totals: [],
      top_providers: [],
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
    periodPreset: 'this_month',
    setPeriodPreset: vi.fn(),
    customDateRange: null,
    setCustomDateRange: vi.fn(),
    periodLabel: 'abril de 2026',
  }),
  formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
}));

vi.mock('./ReportsPeriodFilter', () => ({
  ReportsPeriodFilter: () => <div>reports-period-filter-mounted</div>,
}));

vi.mock('./ReportsSummaryCards', () => ({
  ReportsSummaryCards: () => <div>reports-summary-cards-mounted</div>,
}));

vi.mock('./BehaviorAlerts', () => ({
  BehaviorAlerts: () => <div>behavior-alerts-mounted</div>,
}));

vi.mock('./CategoryDistributionChart', () => ({
  CategoryDistributionChart: () => <div>category-distribution-chart-mounted</div>,
}));

vi.mock('./TopIncreases', () => ({
  TopIncreases: () => <div>top-increases-mounted</div>,
}));

vi.mock('./TopProviders', () => ({
  TopProviders: () => <div>top-providers-mounted</div>,
}));

vi.mock('./PotentialSavings', () => ({
  PotentialSavings: () => <div>potential-savings-mounted</div>,
}));

vi.mock('./MonthlyEvolutionChart', () => ({
  MonthlyEvolutionChart: () => <div>monthly-evolution-chart-mounted</div>,
}));

vi.mock('../ExportButton', () => ({
  ExportButton: () => <button type="button">Exportar CSV</button>,
}));

describe('BillReportsDashboard premium regression', () => {
  it('uses a readable premium dashboard shell for reports', () => {
    const { container } = render(<BillReportsDashboard bills={[]} />);

    expect(screen.getByText('Relatórios e Análises')).not.toBeNull();
    expect(
      screen.getByText('Visão completa dos seus gastos e comportamento financeiro'),
    ).not.toBeNull();
    expect(screen.getByText('reports-period-filter-mounted')).not.toBeNull();
    expect(screen.getByText('reports-summary-cards-mounted')).not.toBeNull();
    expect(screen.getByText('Sobre os Relatórios')).not.toBeNull();
    expect(screen.getByText(/Os dados são atualizados em tempo real/)).not.toBeNull();

    expect(container.firstElementChild?.className).toContain('space-y-8');
    expect(container.querySelector('.rounded-\\[1\\.75rem\\]')?.className).toContain('bg-surface/75');
  });
});
