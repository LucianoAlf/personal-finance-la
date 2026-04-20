/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockedSetMoreSheetOpen = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    moreSheetOpen: true,
    setMoreSheetOpen: mockedSetMoreSheetOpen,
  }),
}));

import { MoreSheet } from './MoreSheet';

describe('MoreSheet', () => {
  beforeEach(() => {
    mockedSetMoreSheetOpen.mockClear();
  });
  afterEach(() => cleanup());

  it('renders all 11 overflow items (8 primary not in bottom nav + 3 more)', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    expect(screen.getByText('Contas')).toBeTruthy();
    expect(screen.getByText('Conciliação')).toBeTruthy();
    expect(screen.getByText('Cartões')).toBeTruthy();
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Metas')).toBeTruthy();
    expect(screen.getByText('Investimentos')).toBeTruthy();
    expect(screen.getByText('Relatórios')).toBeTruthy();
    expect(screen.getByText('Educação')).toBeTruthy();
    expect(screen.getByText('Tags')).toBeTruthy();
    expect(screen.getByText('Categorias')).toBeTruthy();
    expect(screen.getByText('Configurações')).toBeTruthy();
  });

  it('closes when backdrop is clicked', () => {
    render(<MemoryRouter><MoreSheet /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('more-sheet-backdrop'));
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(false);
  });

  it('closes when the close button is clicked', () => {
    render(<MemoryRouter><MoreSheet /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(false);
  });

  it('closes when Escape is pressed', () => {
    render(<MemoryRouter><MoreSheet /></MemoryRouter>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(false);
  });

  it('links each grid item to its path', () => {
    render(<MemoryRouter><MoreSheet /></MemoryRouter>);
    expect(
      screen.getByRole('link', { name: /conciliação/i }).getAttribute('href'),
    ).toBe('/conciliacao');
    expect(
      screen.getByRole('link', { name: /configurações/i }).getAttribute('href'),
    ).toBe('/configuracoes');
  });

  it('is hidden at lg breakpoint', () => {
    render(<MemoryRouter><MoreSheet /></MemoryRouter>);
    expect(screen.getByTestId('more-sheet-root').className).toContain('lg:hidden');
  });
});
