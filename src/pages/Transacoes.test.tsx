/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Transacoes } from './Transacoes';

const transactionsHookState = {
  transactions: [
    {
      id: 'tx-1',
      type: 'income',
      amount: 1000,
      description: 'Salario',
      created_at: '2026-04-01T10:00:00.000Z',
      transaction_date: '2026-04-01',
      is_paid: true,
      category_id: 'cat-1',
      account_id: 'acc-1',
      category: { id: 'cat-1', name: 'Salario', icon: 'Wallet', color: '#22c55e' },
      account: { id: 'acc-1', name: 'Conta Principal' },
      tags: [],
    },
  ],
  loading: false,
};

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

vi.mock('@/components/transactions/TransactionDialog', () => ({
  TransactionDialog: () => <div>transaction-dialog-mounted</div>,
}));

vi.mock('@/components/transactions/AdvancedFiltersModal', () => ({
  AdvancedFiltersModal: () => <div>advanced-filters-mounted</div>,
}));

vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: () => ({
    transactions: transactionsHookState.transactions,
    loading: transactionsHookState.loading,
    addTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    getTotalIncome: () => 1000,
    getTotalExpenses: () => 0,
    getBalance: () => 1000,
    fetchTransactions: vi.fn(),
    saveTagsForCanonicalEntity: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [{ id: 'acc-1', name: 'Conta Principal', type: 'checking', color: '#000000' }],
  }),
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    getCategoryById: () => ({ id: 'cat-1', name: 'Salario', icon: 'Wallet', color: '#22c55e' }),
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
    formatDate: () => '01/04/2026',
    formatRelativeDate: () => 'Hoje',
  }),
}));

describe('Transacoes premium page regression', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not mount heavy dialogs before user interaction', () => {
    transactionsHookState.loading = false;

    render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );

    expect(screen.queryByText('transaction-dialog-mounted')).toBeNull();
    expect(screen.queryByText('advanced-filters-mounted')).toBeNull();
    expect(screen.getByText(/Gerencie suas receitas, despesas e transfer/i)).not.toBeNull();
  });

  it('renders the page shell while transactions are loading', () => {
    transactionsHookState.loading = true;

    render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Gerencie suas receitas, despesas e transfer/i)).not.toBeNull();
    expect(screen.getByText(/Carregando transa/i)).not.toBeNull();
  });

  it('uses premium surfaces instead of hardcoded light wrappers', () => {
    transactionsHookState.loading = false;

    const { container } = render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );

    const root = container.querySelector('.min-h-screen');
    const searchInput = screen.getByPlaceholderText(/Pesquise por descr/i);
    const searchCard = searchInput.closest('div[class*="rounded"]');
    const listTitle = screen.getByText(/Todas as Transa/i);
    const listCard = listTitle.closest('div[class*="rounded"]');

    expect(root?.className).toContain('bg-background');
    expect(root?.className).toContain('text-foreground');
    expect(screen.getByTestId('app-page-content').className).not.toContain('max-w-7xl');
    expect(searchCard?.className).toContain('bg-card');
    expect(searchCard?.className).not.toContain('bg-white');
    expect(listCard?.className).toContain('bg-card');
  });

  it('renders the mobile filter bar with filter button (aria-label)', () => {
    render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );
    const mobileFilterBtn = screen.getByRole('button', { name: /abrir filtros avançados/i });
    expect(mobileFilterBtn).toBeTruthy();
  });

  it('summary grid uses grid-cols-2 mobile default and xl:grid-cols-4 on desktop', () => {
    render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );
    const grid = screen.getByTestId('transacoes-summary-grid');
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('xl:grid-cols-4');
  });
});
