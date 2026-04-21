/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvoiceList } from './InvoiceList';

vi.mock('@/hooks/useCreditCards', () => ({
  useCreditCards: () => ({
    cards: [
      {
        id: 'card-1',
        name: 'Nubank',
        last_four_digits: '6316',
        credit_limit: 25000,
      },
      {
        id: 'card-2',
        name: 'C6 Bank',
        last_four_digits: '1705',
        credit_limit: 4000,
      },
    ],
  }),
}));

vi.mock('@/hooks/useInvoices', () => ({
  useInvoices: () => ({
    loading: false,
    invoices: [
      {
        id: 'inv-open',
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

vi.mock('./InvoiceCard', () => ({
  InvoiceCard: () => <div>invoice-card-mounted</div>,
}));

describe('InvoiceList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the invoices filter shell with premium tokenized styling', () => {
    const { container } = render(<InvoiceList />);

    expect(screen.getByText('invoice-card-mounted')).not.toBeNull();

    // Both desktop filter card and mobile pills render in jsdom.
    // Find the one whose ancestor has the desktop card classes.
    const openTabs = screen.getAllByRole('button', { name: /Abertas/i });
    const openTab = openTabs.find(btn => {
      let el: HTMLElement | null = btn;
      while (el) {
        if (el.className?.includes('bg-card/95')) return true;
        el = el.parentElement;
      }
      return false;
    })!;
    const filterShell = openTab.closest('[class*="bg-card"]');

    expect(filterShell?.className).toContain('bg-card/95');
    expect(filterShell?.className).toContain('border-border/70');

    const allCardsTrigger = screen.getByText('Todos os Cartões').closest('button');
    expect(allCardsTrigger?.className).toContain('bg-surface');

    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain('space-y-6');
  });
});
