/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import PayableBills from './PayableBills';

const {
  usePayableBillsMock,
  useRecurringTrendMock,
  useCategoriesMock,
  useAccountsMock,
  useUserPreferencesMock,
} = vi.hoisted(() => ({
  usePayableBillsMock: vi.fn(() => ({
    bills: [],
    paidBills: [],
    loading: false,
    filters: {},
    setFilters: vi.fn(),
    createBill: vi.fn(),
    createInstallmentBills: vi.fn(),
    updateBill: vi.fn(),
    deleteBill: vi.fn(),
    deleteInstallmentGroup: vi.fn(),
    markAsPaid: vi.fn(),
    revertPayment: vi.fn(),
  })),
  useRecurringTrendMock: vi.fn(() => ({ alerts: [] })),
  useCategoriesMock: vi.fn(() => ({ categories: [], loading: false })),
  useAccountsMock: vi.fn(() => ({ accounts: [] })),
  useUserPreferencesMock: vi.fn(() => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
    formatDate: (value: string) => value,
  })),
}));

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

vi.mock('@/hooks/usePayableBills', () => ({
  usePayableBills: usePayableBillsMock,
}));

vi.mock('@/hooks/useRecurringTrend', () => ({
  useRecurringTrend: useRecurringTrendMock,
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: useCategoriesMock,
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: useAccountsMock,
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: useUserPreferencesMock,
}));

vi.mock('@/components/payable-bills/BillSummaryCards', () => ({
  BillSummaryCards: () => <div>bill-summary-cards-mounted</div>,
}));

vi.mock('@/components/payable-bills/BillList', () => ({
  BillList: () => <div>bill-list-mounted</div>,
}));

vi.mock('@/components/payable-bills/BillTable', () => ({
  BillTable: () => <div>bill-table-mounted</div>,
}));

vi.mock('@/components/payable-bills/BillCalendar', () => ({
  BillCalendar: () => <div>bill-calendar-mounted</div>,
}));

vi.mock('@/components/payable-bills/BillHistoryTable', () => ({
  BillHistoryTable: () => <div>bill-history-mounted</div>,
}));

vi.mock('@/components/payable-bills/reports', () => ({
  BillReportsDashboard: () => <div>bill-reports-mounted</div>,
}));

vi.mock('@/components/payable-bills/ReminderConfigDialog', () => ({
  ReminderConfigDialog: () => <div>reminder-config-dialog-mounted</div>,
}));

vi.mock('@/components/payable-bills/RecurringBillVariationAlert', () => ({
  RecurringBillVariationAlert: () => <div>recurring-bill-variation-alert-mounted</div>,
}));

vi.mock('@/components/payable-bills/AttentionSection', () => ({
  AttentionSection: () => <div>attention-section-mounted</div>,
}));

vi.mock('@/components/payable-bills/BillSortSelect', () => ({
  BillSortSelect: () => <div>bill-sort-select-mounted</div>,
}));

vi.mock('@/components/payable-bills/BillCategoryFilter', () => ({
  BillCategoryFilter: () => <div>bill-category-filter-mounted</div>,
}));

vi.mock('@/components/payable-bills/PeriodFilter', () => ({
  PeriodFilter: () => <div>period-filter-mounted</div>,
}));

vi.mock('@/components/payable-bills/RecurrenceTypeFilter', () => ({
  RecurrenceTypeFilter: () => <div>recurrence-type-filter-mounted</div>,
}));

vi.mock('@/components/payable-bills/ViewToggle', () => ({
  ViewToggle: () => <div>Cards Tabela Calendário</div>,
}));

vi.mock('@/components/payable-bills/BillDialog', () => ({
  BillDialog: () => <div>bill-dialog-mounted</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PayableBills premium shell regression', () => {
  afterEach(() => {
    cleanup();
    usePayableBillsMock.mockClear();
    useRecurringTrendMock.mockClear();
    useCategoriesMock.mockClear();
    useAccountsMock.mockClear();
    useUserPreferencesMock.mockClear();
  });

  it('uses the premium page shell and readable portuguese labels in the shared surface', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/contas-pagar']}>
        <PayableBills />
      </MemoryRouter>,
    );

    const root = container.querySelector('.min-h-screen');

    expect(root?.className).toContain('bg-background');
    expect(root?.className).toContain('text-foreground');
    expect(screen.getByText('Contas a Pagar')).not.toBeNull();
    expect(screen.getByText('Gerencie suas contas e vencimentos')).not.toBeNull();
    expect(screen.getByText('Competência')).not.toBeNull();
    expect(screen.getAllByText('Histórico (0)')[0]).not.toBeNull();
    expect(screen.getAllByText('Relatórios')[0]).not.toBeNull();
    expect(screen.getByText('Cards Tabela Calendário')).not.toBeNull();
    expect(screen.getByText('bill-summary-cards-mounted')).not.toBeNull();
  });

  it('renders mobile filter button (aria-label)', () => {
    render(
      <MemoryRouter>
        <PayableBills />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /abrir filtros/i })).toBeTruthy();
  });

  it('renders mobile tab list with sliding pill indicator (3 equal-width tabs)', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableBills />
      </MemoryRouter>,
    );
    const mobileTabs = container.querySelector('[data-mobile-tabs="true"]');
    expect(mobileTabs).toBeTruthy();
  });

  it('summary section renders BillSummaryCards inside the page shell', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableBills />
      </MemoryRouter>,
    );
    const html = container.innerHTML;
    expect(html).toContain('bill-summary-cards-mounted');
    expect(container.querySelector('.min-h-screen')).toBeTruthy();
  });
});
