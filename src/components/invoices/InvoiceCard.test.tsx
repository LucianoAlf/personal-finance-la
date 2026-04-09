/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvoiceCard } from './InvoiceCard';

vi.mock('./InvoiceStatusBadge', () => ({
  InvoiceStatusBadge: () => <div>invoice-status-badge</div>,
}));

describe('InvoiceCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the invoice hero with moderated value scale and structured metric hierarchy', () => {
    render(
      <InvoiceCard
        invoice={{
          id: 'inv-1',
          credit_card_id: 'card-1',
          status: 'open',
          total_amount: 245,
          paid_amount: 0,
          remaining_amount: 245,
          due_date: '2026-04-22',
          closing_date: '2026-04-14',
          reference_month: '2026-04-01',
        } as any}
        card={{
          id: 'card-1',
          name: 'Nubank',
          last_four_digits: '6316',
          credit_limit: 25000,
        } as any}
        onViewDetails={vi.fn()}
        onPayInvoice={vi.fn()}
      />,
    );

    const heroValue = screen.getByText('R$ 245,00');
    expect(heroValue.className).toContain('text-[1.72rem]');

    expect(screen.queryByTestId('invoice-due-icon')).toBeNull();
    expect(screen.queryByTestId('invoice-limit-icon')).toBeNull();
    expect(screen.getByTestId('invoice-due-value').className).toContain('whitespace-nowrap');
    expect(screen.getByTestId('invoice-limit-label').textContent).toContain('Uso do limite');

    const valuePanel = screen.getByTestId('invoice-value-panel');
    const usagePanel = screen.getByTestId('invoice-usage-panel');
    const exploreTitle = screen.getByTestId('invoice-explore-title');
    const exploreCopy = screen.getByTestId('invoice-explore-copy');

    expect(valuePanel.className).toContain('bg-gradient-to-br');
    expect(usagePanel.className).toContain('bg-gradient-to-br');
    expect(exploreTitle.className).toContain('font-semibold');
    expect(exploreTitle.className).toContain('text-foreground');
    expect(exploreCopy.className).toContain('text-[0.84rem]');
    expect(exploreCopy.className).toContain('text-muted-foreground');
  });
});
