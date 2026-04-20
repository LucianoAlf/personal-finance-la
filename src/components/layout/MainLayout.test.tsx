/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">sidebar</aside>,
}));

vi.mock('./BottomNav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}));

vi.mock('./MoreSheet', () => ({
  MoreSheet: () => <div data-testid="more-sheet" />,
}));

vi.mock('./QuickCreateFab', () => ({
  QuickCreateFab: () => <div data-testid="fab" />,
}));

vi.mock('@/components/ana-clara/AnaClaraStubScreen', () => ({
  AnaClaraStubScreen: () => <div data-testid="ana-stub" />,
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    activeQuickCreate: null,
    closeQuickCreate: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">page</div>,
  };
});

import { MainLayout } from './MainLayout';

describe('MainLayout shell', () => {
  afterEach(() => cleanup());

  function renderShell() {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    );
  }

  it('uses background tokens instead of gray-50 shell surfaces', () => {
    renderShell();
    expect(screen.getByTestId('app-shell').className).toContain('bg-background');
    expect(screen.getByTestId('app-shell').className).not.toContain('bg-gray-50');
  });

  it('renders sidebar, bottom nav, fab, more sheet, and ana-clara stub', () => {
    renderShell();
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
    expect(screen.getByTestId('fab')).toBeTruthy();
    expect(screen.getByTestId('more-sheet')).toBeTruthy();
    expect(screen.getByTestId('ana-stub')).toBeTruthy();
  });

  it('adds mobile bottom padding to main (pb-[...]) so content clears the bottom nav', () => {
    renderShell();
    const main = screen.getByTestId('app-main');
    expect(main.className).toMatch(/pb-\[/);
    expect(main.className).toContain('lg:pb-0');
  });

  it('caps mobile width to prevent horizontal scroll (min-w-0 + overflow-x-hidden)', () => {
    renderShell();
    const main = screen.getByTestId('app-main');
    expect(main.className).toContain('min-w-0');
    expect(main.className).toContain('overflow-x-hidden');
    expect(main.className).toContain('lg:overflow-x-visible');
  });
});
