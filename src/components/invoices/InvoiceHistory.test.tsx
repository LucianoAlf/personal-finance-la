/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { InvoiceHistory } from './InvoiceHistory';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn((table: string) => {
    if (table === 'credit_cards') {
      return {
        select: () => ({
          eq: async () => ({ data: [] }),
        }),
      };
    }

    const query = {
      in: () => query,
      gte: () => query,
      lte: () => query,
      order: () => query,
      range: async () => ({ data: [], error: null, count: 0 }),
    };

    return {
      select: () => ({
        eq: () => query,
      }),
    };
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('./InvoiceHistoryFilters', () => ({
  InvoiceHistoryFilters: () => <div>invoice-history-filters-mounted</div>,
}));

vi.mock('./InvoiceHistoryTable', () => ({
  InvoiceHistoryTable: () => <div>invoice-history-table-mounted</div>,
}));

describe('InvoiceHistory', () => {
  it('renders the history heading with correct portuguese accents', () => {
    render(<InvoiceHistory />);

    expect(screen.getByText('Histórico de Faturas')).not.toBeNull();
    expect(screen.getByText('Consulte e exporte faturas de períodos anteriores')).not.toBeNull();
  });
});
