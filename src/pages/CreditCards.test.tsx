/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { CreditCards } from './CreditCards';

const { useInvoicesMock, statCardCalls } = vi.hoisted(() => ({
  useInvoicesMock: vi.fn(() => ({
    invoices: [{ id: 'inv-1', credit_card_id: 'card-1' }],
    invoicesDetailed: [],
    getCurrentMonthInvoicesTotal: () => ({ total: 245, count: 1, monthName: 'Abril' }),
  })),
  statCardCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
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

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useCreditCards', () => ({
  useCreditCards: () => ({
    cardsSummary: [
      {
        id: 'card-1',
        name: 'Nubank',
        credit_limit: 1000,
        available_limit: 800,
        current_invoice_id: 'inv-1',
      },
    ],
    loading: false,
    deleteCard: vi.fn(),
    getTotalLimit: () => 1000,
    getTotalUsed: () => 200,
    getTotalAvailable: () => 800,
    fetchCards: vi.fn(),
    fetchCardsSummary: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: useInvoicesMock,
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/dashboard/StatCard', () => ({
  StatCard: ({
    title,
    value,
    subtitle,
    valueClassName,
    iconBoxClassName,
    iconClassName,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    valueClassName?: string;
    iconBoxClassName?: string;
    iconClassName?: string;
  }) => {
    statCardCalls.push({ title, valueClassName, iconBoxClassName, iconClassName });

    return (
    <div
      data-testid={`stat-card-${title}`}
      data-value-class={valueClassName || ''}
      data-icon-box-class={iconBoxClassName || ''}
      data-icon-class={iconClassName || ''}
    >
      <div>{title}</div>
      <div>{value}</div>
      {subtitle ? <div>{subtitle}</div> : null}
    </div>
    );
  },
}));

vi.mock('@/components/credit-cards/CreditCardAlerts', () => ({
  CreditCardAlerts: () => <div>credit-card-alerts-mounted</div>,
}));

vi.mock('@/components/credit-cards/CreditCardList', () => ({
  CreditCardList: () => <div>credit-card-list-mounted</div>,
}));

vi.mock('@/components/invoices/InvoiceList', () => ({
  InvoiceList: () => <div>invoice-list-mounted</div>,
}));

vi.mock('@/components/analytics/AnalyticsTab', () => ({
  AnalyticsTab: () => <div>analytics-tab-mounted</div>,
}));

vi.mock('@/components/invoices/InvoiceHistory', () => ({
  InvoiceHistory: () => <div>invoice-history-mounted</div>,
}));

vi.mock('@/components/credit-cards/CreditCardDialog', () => ({
  CreditCardDialog: () => <div>credit-card-dialog-mounted</div>,
}));

vi.mock('@/components/credit-cards/PurchaseDialog', () => ({
  PurchaseDialog: () => <div>purchase-dialog-mounted</div>,
}));

vi.mock('@/components/credit-cards/CreditCardDetailsDialog', () => ({
  CreditCardDetailsDialog: () => <div>credit-card-details-mounted</div>,
}));

vi.mock('@/components/invoices/InvoiceDetailsDialog', () => ({
  InvoiceDetailsDialog: () => <div>invoice-details-mounted</div>,
}));

vi.mock('@/components/invoices/InvoicePaymentDialog', () => ({
  InvoicePaymentDialog: () => <div>invoice-payment-mounted</div>,
}));

vi.mock('@/components/invoices/DeleteInvoiceDialog', () => ({
  DeleteInvoiceDialog: () => <div>delete-invoice-mounted</div>,
}));

describe('CreditCards initial render', () => {
  afterEach(() => {
    cleanup();
    useInvoicesMock.mockClear();
    statCardCalls.length = 0;
  });

  it('does not mount closed heavy dialogs on initial render', () => {
    render(
      <MemoryRouter initialEntries={['/cartoes']}>
        <CreditCards />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cartões de Crédito')).not.toBeNull();
    expect(screen.getByText('Gerencie suas faturas e limites')).not.toBeNull();
    expect(screen.getByText('credit-card-list-mounted')).not.toBeNull();
    expect(screen.queryByText('credit-card-dialog-mounted')).toBeNull();
    expect(screen.queryByText('purchase-dialog-mounted')).toBeNull();
    expect(screen.queryByText('invoice-details-mounted')).toBeNull();
    expect(screen.queryByText('invoice-payment-mounted')).toBeNull();
    expect(screen.queryByText('delete-invoice-mounted')).toBeNull();
  });

  it('does not fetch invoices on the default cards overview render', () => {
    render(
      <MemoryRouter initialEntries={['/cartoes']}>
        <CreditCards />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fatura do Mês')).not.toBeNull();
    expect(screen.getByText('R$ 200.00')).not.toBeNull();
    expect(screen.getByText('Abril • 1 cartão')).not.toBeNull();
    expect(useInvoicesMock).not.toHaveBeenCalled();
  });
  it('renders the page shell with the premium tokenized surface', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/cartoes']}>
        <CreditCards />
      </MemoryRouter>,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain('bg-background');
    expect(root?.className).toContain('text-foreground');
  });

  it('keeps the top stat icons at the same semantic scale as the dashboard system', () => {
    render(
      <MemoryRouter initialEntries={['/cartoes']}>
        <CreditCards />
      </MemoryRouter>,
    );

    const totalLimitCard = screen.getByTestId('stat-card-Limite Total');
    expect(totalLimitCard.getAttribute('data-icon-box-class')).toBe('');
    expect(totalLimitCard.getAttribute('data-icon-class')).toBe('');
  });

  it('renders StatCard grid with grid-cols-2 class', () => {
    const { container } = render(
      <MemoryRouter><CreditCards /></MemoryRouter>
    );
    const grid = container.querySelector('.grid-cols-2');
    expect(grid).not.toBeNull();
  });

  it('renders compact padding class p-4', () => {
    const { container } = render(
      <MemoryRouter><CreditCards /></MemoryRouter>
    );
    const contentDiv = container.querySelector('.p-4');
    expect(contentDiv).not.toBeNull();
  });
});
