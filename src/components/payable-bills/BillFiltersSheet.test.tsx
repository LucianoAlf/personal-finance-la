/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BillFiltersSheet } from './BillFiltersSheet';

vi.mock('@/components/payable-bills/PeriodFilter', () => ({
  PeriodFilter: () => <div data-testid="period-filter">period</div>,
}));
vi.mock('@/components/payable-bills/BillCategoryFilter', () => ({
  BillCategoryFilter: () => <div data-testid="category-filter">category</div>,
}));
vi.mock('@/components/payable-bills/RecurrenceTypeFilter', () => ({
  RecurrenceTypeFilter: () => <div data-testid="recurrence-filter">recurrence</div>,
}));
vi.mock('@/components/payable-bills/BillSortSelect', () => ({
  BillSortSelect: () => <div data-testid="sort-select">sort</div>,
}));

describe('BillFiltersSheet', () => {
  afterEach(() => cleanup());

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    periodFilter: 'this_month' as any,
    onPeriodChange: vi.fn(),
    categoryFilter: 'all' as any,
    onCategoryChange: vi.fn(),
    categories: [],
    recurrenceTypeFilter: 'all' as any,
    onRecurrenceTypeChange: vi.fn(),
    sortOption: 'due_soon' as any,
    onSortChange: vi.fn(),
  };

  it('renders the 4 filter components when open', () => {
    render(<BillFiltersSheet {...defaultProps} />);
    expect(screen.getAllByTestId('period-filter').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('category-filter').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('sort-select').length).toBeGreaterThan(0);
  });

  it('renders RecurrenceTypeFilter only when periodFilter === recurring', () => {
    const { rerender } = render(<BillFiltersSheet {...defaultProps} periodFilter={'this_month' as any} />);
    expect(screen.queryAllByTestId('recurrence-filter')).toHaveLength(0);

    rerender(<BillFiltersSheet {...defaultProps} periodFilter={'recurring' as any} />);
    expect(screen.getAllByTestId('recurrence-filter').length).toBeGreaterThan(0);
  });

  it('renders both responsive wrappers when open', () => {
    render(<BillFiltersSheet {...defaultProps} />);
    expect(screen.getByTestId('responsive-dialog-mobile')).toBeTruthy();
    expect(screen.getByTestId('responsive-dialog-desktop')).toBeTruthy();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<BillFiltersSheet {...defaultProps} open={false} />);
    expect(container.querySelector('[data-testid="responsive-dialog-mobile"]')).toBeNull();
  });
});
