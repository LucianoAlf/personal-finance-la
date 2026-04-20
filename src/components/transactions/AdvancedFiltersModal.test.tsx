/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdvancedFiltersModal, type FilterConfig } from './AdvancedFiltersModal';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/hooks/useSavedFilters', () => ({
  useSavedFilters: () => ({
    savedFilters: [],
    createSavedFilter: vi.fn(),
    deleteSavedFilter: vi.fn(),
  }),
}));

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <>
      <div data-testid="responsive-dialog-desktop">{open ? children : null}</div>
      {open && <div data-testid="responsive-dialog-mobile">{children}</div>}
    </>
  ),
  ResponsiveDialogHeader: ({ title }: { title: string; description?: string; onClose?: () => void }) => (
    <div>{title}</div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props}>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div>calendar</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./CategoryMultiSelect', () => ({
  CategoryMultiSelect: () => <div>categories</div>,
}));

vi.mock('./AccountMultiSelect', () => ({
  AccountMultiSelect: () => <div>accounts</div>,
}));

vi.mock('./FilterSelects', () => ({
  TagMultiSelect: ({
    selectedTags,
    onSelectionChange,
  }: {
    selectedTags: string[];
    onSelectionChange: (tags: string[]) => void;
  }) => (
    <div>
      <div data-testid="selected-tags">{selectedTags.join(',')}</div>
      <button type="button" onClick={() => onSelectionChange(['edited-tag'])}>
        edit-tags
      </button>
    </div>
  ),
  StatusMultiSelect: () => <div>statuses</div>,
  TypeMultiSelect: ({
    selectedTypes,
  }: {
    selectedTypes: string[];
    onSelectionChange: (types: string[]) => void;
  }) => <div data-testid="selected-types">{selectedTypes.join(',')}</div>,
}));

function makeFilters(overrides: Partial<FilterConfig> = {}): FilterConfig {
  return {
    dateRange: { from: null, to: null },
    categories: [],
    accounts: [],
    tags: [],
    statuses: [],
    types: [],
    ...overrides,
  };
}

describe('AdvancedFiltersModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('discards unsaved edits when the modal is cancelled and reopened', () => {
    const onOpenChange = vi.fn();
    const currentFilters = makeFilters({ tags: ['saved-tag'] });
    const { rerender } = render(
      <AdvancedFiltersModal
        open
        currentFilters={currentFilters}
        onApplyFilters={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getAllByTestId('selected-tags')[0].textContent).toBe('saved-tag');

    fireEvent.click(screen.getAllByText('edit-tags')[0]);
    expect(screen.getAllByTestId('selected-tags')[0].textContent).toBe('edited-tag');

    fireEvent.click(screen.getAllByText('CANCELAR')[0]);

    rerender(
      <AdvancedFiltersModal
        open={false}
        currentFilters={currentFilters}
        onApplyFilters={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    rerender(
      <AdvancedFiltersModal
        open
        currentFilters={currentFilters}
        onApplyFilters={vi.fn()}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.getAllByTestId('selected-tags')[0].textContent).toBe('saved-tag');
  });

  it('resyncs local state when parent filters change', () => {
    const { rerender } = render(
      <AdvancedFiltersModal
        open
        currentFilters={makeFilters({ tags: ['tag-a'], types: ['expense'] })}
        onApplyFilters={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('selected-tags')[0].textContent).toBe('tag-a');
    expect(screen.getAllByTestId('selected-types')[0].textContent).toBe('expense');

    rerender(
      <AdvancedFiltersModal
        open
        currentFilters={makeFilters()}
        onApplyFilters={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getAllByTestId('selected-tags')[0].textContent).toBe('');
    expect(screen.getAllByTestId('selected-types')[0].textContent).toBe('');
  });

  it('renders both mobile and desktop responsive wrappers when open', () => {
    render(
      <AdvancedFiltersModal
        open={true}
        onOpenChange={() => {}}
        onApplyFilters={() => {}}
      />,
    );
    expect(screen.getByTestId('responsive-dialog-mobile')).toBeTruthy();
    expect(screen.getByTestId('responsive-dialog-desktop')).toBeTruthy();
  });
});
