/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockedSetAnaCoachOpen = vi.fn();
const mockedSetMoreSheetOpen = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    anaCoachOpen: false,
    moreSheetOpen: false,
    setAnaCoachOpen: mockedSetAnaCoachOpen,
    setMoreSheetOpen: mockedSetMoreSheetOpen,
  }),
}));

vi.mock('@/hooks/usePayableBills', () => ({
  usePayableBills: () => ({ summary: { overdue_count: 0 } }),
}));

import { BottomNav } from './BottomNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  beforeEach(() => {
    mockedSetAnaCoachOpen.mockClear();
    mockedSetMoreSheetOpen.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders exactly 5 buttons', () => {
    renderAt('/');
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('marks the Dashboard tab as aria-current when on /', () => {
    renderAt('/');
    const active = screen.getByRole('button', { name: /início/i });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('marks Transações tab as aria-current when on /transacoes', () => {
    renderAt('/transacoes');
    const active = screen.getByRole('button', { name: /lanç/i });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('clicking the Ana Clara tab opens anaCoachOpen', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /ana/i }));
    expect(mockedSetAnaCoachOpen).toHaveBeenCalledWith(true);
  });

  it('clicking the Mais tab opens moreSheetOpen', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /mais/i }));
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(true);
  });

  it('is hidden at lg breakpoint (verified via class)', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: /navegação principal/i });
    expect(nav.className).toContain('lg:hidden');
  });

  it('renders the PayableBills badge when there are overdue bills and we are not on /contas-pagar', async () => {
    vi.resetModules();
    vi.doMock('@/hooks/usePayableBills', () => ({
      usePayableBills: () => ({ summary: { overdue_count: 2 } }),
    }));
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: false,
        moreSheetOpen: false,
        setAnaCoachOpen: vi.fn(),
        setMoreSheetOpen: vi.fn(),
      }),
    }));
    const { BottomNav: Fresh } = await import('./BottomNav');
    render(
      <MemoryRouter initialEntries={['/']}>
        <Fresh />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/2 contas vencidas/i)).toBeTruthy();
  });
});
