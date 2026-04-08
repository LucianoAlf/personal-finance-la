/* @vitest-environment jsdom */

import React from 'react';
import { useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeHarness() {
  const { theme, resolvedTheme, setTheme, hydrateTheme } = useTheme();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button type="button" onClick={() => setTheme('light')}>
        set-light
      </button>
      <button type="button" onClick={() => hydrateTheme('dark')}>
        hydrate-dark
      </button>
    </div>
  );
}

function ThemeBridgeHarness() {
  const { theme, setTheme, hydrateTheme } = useTheme();

  useEffect(() => {
    hydrateTheme('dark');
  }, [hydrateTheme]);

  return (
    <div>
      <div data-testid="bridge-theme">{theme}</div>
      <button type="button" onClick={() => setTheme('light')}>
        set-light
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('applies backend-hydrated theme to state, storage, and document root', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: /hydrate-dark/i }));

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
    expect(localStorage.getItem('test-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('keeps a manual theme change even when hydration effect depends on hydrateTheme', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeBridgeHarness />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('bridge-theme').textContent).toBe('dark');

    await user.click(screen.getByRole('button', { name: /set-light/i }));

    expect(screen.getByTestId('bridge-theme').textContent).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
});
