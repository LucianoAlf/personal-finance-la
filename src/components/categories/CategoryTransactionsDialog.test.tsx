/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { CategoryTransactionsDialog } from './CategoryTransactionsDialog';

const { fromMock, getUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserMock: vi.fn(() =>
    Promise.resolve({
      data: { user: { id: 'user-1' } },
    }),
  ),
}));

function createQueryResult<T>(data: T) {
  return Promise.resolve({ data, error: null });
}

function createEqChain<T>(result: T) {
  const secondEq = vi.fn(() => createQueryResult(result));
  const firstEq = vi.fn(() => ({
    eq: secondEq,
  }));

  return {
    select: vi.fn(() => ({
      eq: firstEq,
    })),
    firstEq,
    secondEq,
  };
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  },
}));

vi.mock('./RecategorizeDialog', () => ({
  RecategorizeDialog: () => null,
}));

describe('CategoryTransactionsDialog', () => {
  beforeEach(() => {
    fromMock.mockReset();

    const bankQuery = createEqChain([
      {
        id: 'tx-1',
        description: 'Supermercado do bairro',
        amount: 125.5,
        transaction_date: '2026-04-01T00:00:00.000Z',
        created_at: '2026-04-01T00:00:00.000Z',
      },
    ]);

    const cardQuery = createEqChain([
      {
        id: 'card-1',
        description: 'Restaurante cartão',
        amount: 89.9,
        purchase_date: '2026-04-02T00:00:00.000Z',
        created_at: '2026-04-02T00:00:00.000Z',
      },
    ]);

    fromMock.mockImplementation((table: string) => {
      if (table === 'transactions') return bankQuery;
      if (table === 'credit_card_transactions') return cardQuery;
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('loads and renders bank and card rows with source labels', async () => {
    render(
      <CategoryTransactionsDialog
        open
        onOpenChange={vi.fn()}
        category={{
          id: 'cat-1',
          user_id: 'user-1',
          name: 'Alimentacao',
          type: 'expense',
          parent_id: null,
          color: '#ef4444',
          icon: 'Utensils',
          is_default: false,
          created_at: '2026-04-01T00:00:00.000Z',
          keywords: [],
        }}
      />,
    );

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledWith('transactions');
      expect(fromMock).toHaveBeenCalledWith('credit_card_transactions');
    });

    expect(await screen.findByText('Supermercado do bairro')).toBeTruthy();
    expect(await screen.findByText('Restaurante cartão')).toBeTruthy();
    expect(await screen.findByText('Conta')).toBeTruthy();
    expect(await screen.findByText('Cartão')).toBeTruthy();
  });
});
