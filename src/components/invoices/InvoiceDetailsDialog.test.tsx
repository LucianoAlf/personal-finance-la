/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvoiceDetailsDialog } from './InvoiceDetailsDialog';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div data-testid="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => <div data-testid="tabs-list" className={className}>{children}</div>,
  TabsTrigger: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className}>skeleton</div>,
}));

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: () => ({
    loading: false,
    invoices: [
      {
        id: 'inv-1',
        credit_card_id: 'card-1',
        status: 'open',
        due_date: '2026-04-21',
        closing_date: '2026-04-14',
        reference_month: '2026-04-01',
        total_amount: 245,
        paid_amount: 0,
        remaining_amount: 245,
      },
    ],
  }),
}));

vi.mock('@/hooks/useCreditCards', () => ({
  useCreditCards: () => ({
    cards: [
      {
        id: 'card-1',
        name: 'Nubank',
        brand: 'mastercard',
        color: '#8A05BE',
        credit_limit: 25000,
        last_four_digits: '6316',
      },
    ],
  }),
}));

vi.mock('./InvoiceSummary', () => ({
  InvoiceSummary: () => <div>invoice-summary-mounted</div>,
}));

vi.mock('./InvoiceTransactionsList', () => ({
  InvoiceTransactionsList: () => <div>invoice-transactions-mounted</div>,
}));

vi.mock('./InvoicePaymentHistory', () => ({
  InvoicePaymentHistory: () => <div>invoice-payment-history-mounted</div>,
}));

vi.mock('./InvoiceComparison', () => ({
  InvoiceComparison: () => <div>invoice-comparison-mounted</div>,
}));

vi.mock('./InstallmentTimeline', () => ({
  InstallmentTimeline: () => <div>installment-timeline-mounted</div>,
}));

describe('InvoiceDetailsDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the details modal with premium tokenized shell styling', () => {
    render(
      <InvoiceDetailsDialog open onOpenChange={vi.fn()} invoiceId="inv-1" onPayInvoice={vi.fn()} />,
    );

    expect(screen.getByText(/Fatura de/i)).not.toBeNull();
    expect(screen.getByText('invoice-comparison-mounted')).not.toBeNull();

    // Component now uses ResponsiveDialog; on mobile (jsdom) content renders
    // inside responsive-dialog-body-mobile instead of the old Radix dialog-content
    const body = screen.getByTestId('responsive-dialog-body-mobile');
    expect(body).not.toBeNull();

    const tabsList = screen.getByTestId('tabs-list');
    expect(tabsList.className).toContain('bg-card/95');
    expect(tabsList.className).toContain('rounded-[1.3rem]');
  });
});
