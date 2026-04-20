/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockedSetAnaCoachOpen = vi.fn();
const mockedNavigate = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    anaCoachOpen: true,
    setAnaCoachOpen: mockedSetAnaCoachOpen,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

import { AnaClaraStubScreen } from './AnaClaraStubScreen';

describe('AnaClaraStubScreen', () => {
  beforeEach(() => {
    mockedSetAnaCoachOpen.mockClear();
    mockedNavigate.mockClear();
  });
  afterEach(() => cleanup());

  it('renders the avatar using the 512 variant', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    const img = screen.getByAltText(/ana clara/i) as HTMLImageElement;
    expect(img.src).toContain('/ana-clara-avatar-512');
  });

  it('renders the "em breve" heading', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    expect(screen.getByText(/em breve/i)).toBeTruthy();
  });

  it('renders the WhatsApp button', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeTruthy();
  });

  it('clicking the back arrow closes the screen', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockedSetAnaCoachOpen).toHaveBeenCalledWith(false);
  });

  it('clicking the WhatsApp button closes + navigates to settings anchor', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(mockedSetAnaCoachOpen).toHaveBeenCalledWith(false);
    expect(mockedNavigate).toHaveBeenCalledWith('/configuracoes#integrations-whatsapp');
  });

  it('renders nothing when anaCoachOpen is false', async () => {
    vi.resetModules();
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: false,
        setAnaCoachOpen: vi.fn(),
      }),
    }));
    const { AnaClaraStubScreen: Fresh } = await import('./AnaClaraStubScreen');
    const { container } = render(<MemoryRouter><Fresh /></MemoryRouter>);
    expect(container.querySelector('[data-testid="ana-clara-stub-root"]')).toBeNull();
  });

  it('is hidden at lg breakpoint', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    expect(screen.getByTestId('ana-clara-stub-root').className).toContain('lg:hidden');
  });
});
