/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvoiceHistoryTable } from './InvoiceHistoryTable';

const { fromMock, selectMock, eqMock, orderMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  orderMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('InvoiceHistoryTable', () => {
  afterEach(() => {
    cleanup();
    fromMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    orderMock.mockReset();
  });

  it('renders the premium table shell and expanded row surface for invoice history', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          purchase_date: '2026-04-03',
          description: 'Netflix',
          amount: 57,
          categories: { name: 'Streaming' },
        },
      ],
    });
    eqMock.mockReturnValue({ order: orderMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });

    render(
      <InvoiceHistoryTable
        invoices={[
          {
            id: 'inv-1',
            reference_month: '2026-04-01',
            total_amount: 245,
            paid_amount: 0,
            status: 'open',
            credit_cards: { name: 'Nubank', brand: 'mastercard' },
          },
        ]}
        loading={false}
        pagination={{ page: 1, pageSize: 20, totalItems: 1 }}
        sorting={{ column: 'reference_month', direction: 'desc' }}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    );

    const root = screen.getByTestId('invoice-history-table');
    const head = screen.getByTestId('invoice-history-head');
    const pagination = screen.getByTestId('invoice-history-pagination');

    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(root.className).toContain('rounded-[30px]');
    expect(head.className).toContain('bg-surface/80');
    expect(pagination.className).toContain('bg-surface/55');

    fireEvent.click(screen.getByTestId('invoice-history-expand-inv-1'));

    await waitFor(() => {
      expect(screen.getByTestId('invoice-history-expanded-inv-1')).not.toBeNull();
    });

    const expanded = screen.getByTestId('invoice-history-expanded-inv-1');
    expect(expanded.className).toContain('bg-surface/45');
    expect(expanded.className).toContain('border-border/60');
  });
});
