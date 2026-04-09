/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvoiceHistoryFilters } from './InvoiceHistoryFilters';

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ['', vi.fn()],
}));

vi.mock('@/hooks/useExportInvoices', () => ({
  useExportInvoices: () => ({
    exportToCSV: vi.fn(),
    exporting: false,
  }),
}));

vi.mock('@/components/ui/month-range-picker', () => ({
  MonthRangePicker: () => <div>month-range-picker-mounted</div>,
}));

describe('InvoiceHistoryFilters', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the history filters inside the premium tokenized shell', () => {
    render(
      <InvoiceHistoryFilters
        filters={{
          dateRange: {
            start: new Date('2025-10-01T00:00:00'),
            end: new Date('2026-04-30T00:00:00'),
          },
          cardIds: [],
          valueRange: { min: 0, max: 10000 },
          searchQuery: '',
          status: [],
        }}
        cards={[
          { id: 'card-1', name: 'Nubank', brand: 'mastercard' },
          { id: 'card-2', name: 'Itau', brand: 'visa' },
        ]}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        hasActiveFilters={false}
        invoices={[{ id: 'inv-1' }]}
      />,
    );

    const root = screen.getByTestId('invoice-history-filters');
    const searchInput = screen.getByTestId('invoice-history-search');
    const exportButton = screen.getByTestId('invoice-history-export');

    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(root.className).toContain('rounded-[28px]');

    expect(searchInput.className).toContain('bg-surface/80');
    expect(searchInput.className).toContain('border-border/70');

    expect(exportButton.className).toContain('bg-primary/12');
    expect(exportButton.className).toContain('text-primary');
  });
});
