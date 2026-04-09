/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Contas } from './Contas';

const {
  navigateMock,
  useAccountsMock,
  useTransactionsMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useAccountsMock: vi.fn(() => ({
    accounts: [
      {
        id: 'acc-1',
        name: 'Nubank',
        type: 'checking',
        bank_name: 'Nubank',
        current_balance: 599,
        initial_balance: 599,
        color: '#8A05BE',
        icon: 'checking',
        is_shared: false,
        is_active: true,
      },
    ],
    loading: false,
    error: null,
    fetchAccounts: vi.fn(),
    getTotalBalance: () => 599,
    getBalanceByType: (types: string[]) => (types.includes('checking') ? 599 : 0),
    addAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
  })),
  useTransactionsMock: vi.fn(() => ({
    addTransaction: vi.fn(),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({
    title,
    subtitle,
    actions,
  }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {actions ? <div>{actions}</div> : null}
    </div>
  ),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: useAccountsMock,
}));

vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: useTransactionsMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('Contas premium page regression', () => {
  afterEach(() => {
    cleanup();
    navigateMock.mockReset();
    useAccountsMock.mockClear();
    useTransactionsMock.mockClear();
  });

  it('uses premium page and card surfaces instead of hardcoded light wrappers', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/contas']}>
        <Contas />
      </MemoryRouter>,
    );

    const root = container.querySelector('.min-h-screen');
    const bankSummary = screen.getByText(/^Contas Bancárias$/i).closest('div[class*="rounded"]');
    const createCard = screen.getByText(/Criar Nova Conta/i).closest('div[class*="border"]');
    const accountName = screen.getByText('Nubank');
    const accountCard = accountName.closest('div[class*="rounded"]');

    expect(root?.className).toContain('bg-background');
    expect(root?.className).toContain('text-foreground');
    expect(bankSummary?.className).toContain('bg-card');
    expect(bankSummary?.className).not.toContain('bg-white');
    expect(accountCard?.className).toContain('bg-card');
    expect(accountCard?.className).toContain('border-border');
    expect(createCard?.className).toContain('border-dashed');
    expect(createCard?.className).toContain('bg-card');
  });
});
