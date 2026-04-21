/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarFiltersSheet } from '../CalendarFiltersSheet';

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode }) =>
    open ? (
      <div data-testid="rd-root">
        <button type="button" aria-label="close-rd" onClick={() => onOpenChange(false)}>x</button>
        {children}
      </div>
    ) : null,
  ResponsiveDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../CalendarFilters', () => ({
  CalendarFilters: () => <div data-testid="calendar-filters-inline">filters</div>,
}));

describe('CalendarFiltersSheet', () => {
  afterEach(() => cleanup());

  it('renders nothing when closed', () => {
    const { container } = render(
      <CalendarFiltersSheet
        open={false}
        onOpenChange={vi.fn()}
        enabledCategories={new Set()}
        onToggleCategory={vi.fn()}
        advancedFilters={{ source: 'all', interactivity: 'all', actionableOnly: false }}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    expect(container.textContent).toBe('');
  });

  it('renders CalendarFilters when open', () => {
    render(
      <CalendarFiltersSheet
        open={true}
        onOpenChange={vi.fn()}
        enabledCategories={new Set()}
        onToggleCategory={vi.fn()}
        advancedFilters={{ source: 'all', interactivity: 'all', actionableOnly: false }}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('calendar-filters-inline')).toBeTruthy();
  });

  it('forwards close to onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(
      <CalendarFiltersSheet
        open={true}
        onOpenChange={onOpenChange}
        enabledCategories={new Set()}
        onToggleCategory={vi.fn()}
        advancedFilters={{ source: 'all', interactivity: 'all', actionableOnly: false }}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('close-rd'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
