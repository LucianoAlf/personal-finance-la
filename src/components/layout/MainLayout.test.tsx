/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">sidebar</aside>,
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

describe('MainLayout dark shell', () => {
  it('uses background tokens instead of gray-50 shell surfaces', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-shell').className).toContain('bg-background');
    expect(screen.getByTestId('app-shell').className).not.toContain('bg-gray-50');
  });
});
