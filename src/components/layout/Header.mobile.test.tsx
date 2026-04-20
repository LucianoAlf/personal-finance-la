/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from './Header';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { email: 'luciano@example.com' },
    profile: { full_name: 'Luciano Alf', avatar_url: null },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    userSettings: { display_name: 'Luciano Alf', avatar_url: null, updated_at: null },
    setTheme: vi.fn(),
  }),
}));

describe('Header responsive layout', () => {
  afterEach(() => cleanup());

  function renderHeader(props: { subtitle?: string; actions?: React.ReactNode } = {}) {
    return render(
      <ThemeProvider defaultTheme="light">
        <MemoryRouter>
          <Header title="Teste" {...props} />
        </MemoryRouter>
      </ThemeProvider>,
    );
  }

  it('wraps actions/subtitle in a mobile-only row 2 container', () => {
    renderHeader({ subtitle: 'Sub', actions: <button>Action</button> });
    const row2 = screen.getByTestId('header-row2');
    expect(row2).toBeTruthy();
    expect(row2.className).toContain('lg:hidden');
  });

  it('renders the subtitle in row 2 on mobile and in row 1 on desktop', () => {
    renderHeader({ subtitle: 'Bem-vindo' });
    expect(screen.getAllByText('Bem-vindo')).toHaveLength(2);
    const desktopSub = screen.getByTestId('header-subtitle-desktop');
    expect(desktopSub.className).toContain('hidden');
    expect(desktopSub.className).toContain('lg:block');
    const mobileSub = screen.getByTestId('header-subtitle-mobile');
    expect(mobileSub.className).toContain('lg:hidden');
  });

  it('keeps the avatar dropdown accessible (mobile + desktop)', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /abrir menu do usuario/i })).toBeTruthy();
  });

  it('keeps root header class sticky top-0', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
  });
});
