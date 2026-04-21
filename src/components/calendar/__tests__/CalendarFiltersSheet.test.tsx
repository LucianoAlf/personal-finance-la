/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarFiltersSheet } from '../CalendarFiltersSheet';

vi.mock('../CalendarFilters', () => ({
  CalendarFilters: () => <div data-testid="calendar-filters-inline">filters</div>,
}));

function defaults(overrides: Partial<React.ComponentProps<typeof CalendarFiltersSheet>> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    enabledCategories: new Set<string>(),
    onToggleCategory: vi.fn(),
    advancedFilters: { source: 'all' as const, interactivity: 'all' as const, actionableOnly: false },
    onAdvancedFiltersChange: vi.fn(),
    ...overrides,
  };
}

describe('CalendarFiltersSheet', () => {
  afterEach(() => cleanup());

  it('is pointer-events-none and translated off-screen when closed', () => {
    const { container } = render(<CalendarFiltersSheet {...defaults({ open: false })} />);
    const root = container.querySelector('[data-testid="calendar-filters-sheet-root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('pointer-events-none');
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(sheet.className).toContain('translate-y-full');
  });

  it('slides in and renders CalendarFilters when open', () => {
    const { container } = render(<CalendarFiltersSheet {...defaults({ open: true })} />);
    expect(screen.getByTestId('calendar-filters-inline')).toBeTruthy();
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(sheet.className).toContain('translate-y-0');
  });

  it('closes when the backdrop is tapped', () => {
    const onOpenChange = vi.fn();
    render(<CalendarFiltersSheet {...defaults({ onOpenChange })} />);
    fireEvent.click(screen.getByLabelText('Fechar filtros'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when the X button is tapped', () => {
    const onOpenChange = vi.fn();
    render(<CalendarFiltersSheet {...defaults({ onOpenChange })} />);
    fireEvent.click(screen.getByRole('button', { name: /^fechar$/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes when Escape is pressed', () => {
    const onOpenChange = vi.fn();
    render(<CalendarFiltersSheet {...defaults({ onOpenChange })} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
