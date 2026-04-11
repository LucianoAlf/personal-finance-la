/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from './Header';

const signOutMock = vi.fn();
let mockAuthState: any;
let mockSettingsState: any;

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => mockSettingsState,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) =>
    src ? <img src={src} alt={alt} /> : null,
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function buildHeaderTree() {
  return (
    <ThemeProvider defaultTheme="light">
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Header title="Teste" />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function renderHeader() {
  return render(buildHeaderTree());
}

describe('Header user menu', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue(undefined);
    mockAuthState = {
      user: { email: 'luciano@example.com' },
      profile: { full_name: 'Luciano Alf', avatar_url: null },
      signOut: signOutMock,
    };
    mockSettingsState = {
      userSettings: {
        display_name: 'Luciano Alf',
        avatar_url: null,
        updated_at: '2026-04-07T00:00:00.000Z',
      },
      setTheme: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates to perfil from the user menu', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: /abrir menu do usuario/i }));
    await user.click(screen.getByRole('menuitem', { name: /perfil/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/perfil');
    });
  });

  it('navigates to configuracoes from the user menu', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: /abrir menu do usuario/i }));
    await user.click(screen.getByRole('menuitem', { name: /configurações/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/configuracoes');
    });
  });

  it('logs out and redirects to login from the user menu', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: /abrir menu do usuario/i }));
    await user.click(screen.getByRole('menuitem', { name: /sair/i }));

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('location').textContent).toBe('/login');
    });
  });

  it('keeps shell controls on premium surfaces instead of white shell backgrounds', () => {
    renderHeader();

    expect(screen.getByRole('banner').className).toContain('bg-surface');
    expect(screen.getByRole('banner').className).not.toContain('bg-white');
    expect(screen.getByRole('button', { name: /ativar tema escuro/i }).className).not.toContain('bg-white');
    expect(screen.getByRole('button', { name: /abrir menu do usuario/i }).className).not.toContain('bg-white');
  });

  it('keeps the logout action readable on the neutral dropdown surface', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: /abrir menu do usuario/i }));

    const logoutItem = screen.getByRole('menuitem', { name: /sair/i });
    expect(logoutItem.className).toContain('text-danger');
    expect(logoutItem.className).toContain('focus:bg-danger-subtle');
    expect(logoutItem.className).not.toContain('text-danger-foreground');
  });

  it('renders the account email in lowercase without inherited uppercase label styling', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: /abrir menu do usuario/i }));

    const email = screen.getByText('luciano@example.com');
    const accountSummary = email.parentElement?.parentElement as HTMLElement | null;

    expect(accountSummary).not.toBeNull();
    expect(accountSummary?.className).not.toContain('uppercase');
    expect(accountSummary?.className).not.toContain('tracking-[0.18em]');
    expect(email.className).toContain('lowercase');
    expect(email.className).toContain('truncate');
  });

  it('keeps the avatar image src stable when unrelated settings metadata changes', () => {
    mockAuthState = {
      ...mockAuthState,
      profile: { full_name: 'Luciano Alf', avatar_url: 'https://example.com/avatar.png' },
    };
    mockSettingsState = {
      ...mockSettingsState,
      userSettings: {
        ...mockSettingsState.userSettings,
        avatar_url: 'https://example.com/avatar.png',
        updated_at: '2026-04-07T00:00:00.000Z',
      },
    };

    const { rerender } = renderHeader();
    const avatarBefore = screen.getByAltText('Avatar');

    expect(avatarBefore.getAttribute('src')).toBe('https://example.com/avatar.png');

    mockSettingsState = {
      ...mockSettingsState,
      userSettings: {
        ...mockSettingsState.userSettings,
        updated_at: '2026-04-08T00:00:00.000Z',
      },
    };

    rerender(buildHeaderTree());

    const avatarAfter = screen.getByAltText('Avatar');
    expect(avatarAfter.getAttribute('src')).toBe('https://example.com/avatar.png');
  });
});
