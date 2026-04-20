/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockedOpenQuickCreate = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    anaCoachOpen: false,
    moreSheetOpen: false,
    openQuickCreate: mockedOpenQuickCreate,
  }),
}));

import { QuickCreateFab } from './QuickCreateFab';

describe('QuickCreateFab', () => {
  beforeEach(() => mockedOpenQuickCreate.mockClear());
  afterEach(() => cleanup());

  it('renders a primary FAB button with aria-label', () => {
    render(<QuickCreateFab />);
    expect(screen.getByRole('button', { name: /criar/i })).toBeTruthy();
  });

  it('is hidden at lg breakpoint', () => {
    render(<QuickCreateFab />);
    expect(screen.getByTestId('fab-root').className).toContain('lg:hidden');
  });

  it('toggles the menu open when clicked', () => {
    render(<QuickCreateFab />);
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(5);
  });

  it('fires openQuickCreate with the right action when a menu item is clicked', () => {
    render(<QuickCreateFab />);
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^despesa$/i }));
    expect(mockedOpenQuickCreate).toHaveBeenCalledWith('expense');
  });

  it('closes the menu after selecting an item', () => {
    render(<QuickCreateFab />);
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /receita/i }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('QuickCreateFab visibility', () => {
  afterEach(() => cleanup());

  it('does not render when anaCoachOpen is true', async () => {
    vi.resetModules();
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: true,
        moreSheetOpen: false,
        openQuickCreate: vi.fn(),
      }),
    }));
    const { QuickCreateFab: Fresh } = await import('./QuickCreateFab');
    render(<Fresh />);
    expect(screen.queryByTestId('fab-root')).toBeNull();
  });

  it('does not render when moreSheetOpen is true', async () => {
    vi.resetModules();
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: false,
        moreSheetOpen: true,
        openQuickCreate: vi.fn(),
      }),
    }));
    const { QuickCreateFab: Fresh } = await import('./QuickCreateFab');
    render(<Fresh />);
    expect(screen.queryByTestId('fab-root')).toBeNull();
  });
});
