/* @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CategoryCard } from './CategoryCard';

const categoryTransactionsDialogMock = vi.fn();

vi.mock('./CreateCategoryDialog', () => ({
  CreateCategoryDialog: () => null,
}));

vi.mock('./DeleteCategoryDialog', () => ({
  DeleteCategoryDialog: () => null,
}));

vi.mock('./CategoryTransactionsDialog', () => ({
  CategoryTransactionsDialog: (props: unknown) => {
    categoryTransactionsDialogMock(props);
    const typed = props as {
      open: boolean;
    };

    return typed.open ? <div>Dialog aberto</div> : null;
  },
}));

describe('CategoryCard', () => {
  beforeEach(() => {
    categoryTransactionsDialogMock.mockClear();
  });

  it('renders category metadata in a compact manager layout', () => {
    render(
      <CategoryCard
        category={{
          id: 'cat-1',
          user_id: 'user-1',
          name: 'Alimentação',
          type: 'expense',
          parent_id: null,
          color: '#ef4444',
          icon: 'Utensils',
          is_default: false,
          created_at: '2026-04-01T00:00:00.000Z',
          keywords: ['mercado', 'restaurante'],
        }}
        stats={{
          transactionCount: 1,
          totalAmount: 100,
          payableBillsCount: 0,
          financialGoalsCount: 0,
          legacyBudgetsCount: 0,
        }}
        isDefault={false}
      />,
    );

    expect(screen.getByText('1 lançamento • R$ 100,00')).toBeTruthy();
    expect(screen.getByText(/Palavras-chave: mercado, restaurante/i)).toBeTruthy();
  });

  it('opens the category transactions dialog from the view action', async () => {
    const user = userEvent.setup();

    render(
      <CategoryCard
        category={{
          id: 'cat-1',
          user_id: 'user-1',
          name: 'Alimentação',
          type: 'expense',
          parent_id: null,
          color: '#ef4444',
          icon: 'Utensils',
          is_default: false,
          created_at: '2026-04-01T00:00:00.000Z',
          keywords: [],
        }}
        stats={{
          transactionCount: 1,
          totalAmount: 100,
          payableBillsCount: 0,
          financialGoalsCount: 0,
          legacyBudgetsCount: 0,
        }}
        isDefault={false}
      />,
    );

    await user.click(screen.getAllByRole('button', { name: 'Ver' })[0]);

    expect(categoryTransactionsDialogMock).toHaveBeenCalled();
    expect(categoryTransactionsDialogMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        open: true,
        category: expect.objectContaining({
          id: 'cat-1',
          name: 'Alimentação',
        }),
      }),
    );
    expect(screen.getByText('Dialog aberto')).toBeTruthy();
  });
});
