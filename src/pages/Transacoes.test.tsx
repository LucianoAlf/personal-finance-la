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
  Header: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div>
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
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

describe('Transacoes initial render', () => {
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
    expect(screen.getByText('Gerencie suas receitas, despesas e transferências')).not.toBeNull();
  });

  it('renders the page shell while transactions are loading', () => {
    transactionsHookState.loading = true;

    render(
      <MemoryRouter>
        <Transacoes />
      </MemoryRouter>,
    );

    expect(screen.getByText('Gerencie suas receitas, despesas e transferências')).not.toBeNull();
    expect(screen.getByText('Carregando transações...')).not.toBeNull();
  });
});
