/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import type { Category } from '@/types/categories';

const mocks = vi.hoisted(() => {
  const deleteCategoryMock = vi.fn();
  const getUserMock = vi.fn();
  const secondEq = vi.fn();
  const firstEq = vi.fn();
  const updateFn = vi.fn();

  firstEq.mockImplementation(() => ({ eq: secondEq }));
  updateFn.mockImplementation(() => ({ eq: firstEq }));
  secondEq.mockResolvedValue({ error: null });

  const fromMock = vi.fn(() => ({
    update: updateFn,
  }));

  return { deleteCategoryMock, getUserMock, secondEq, firstEq, updateFn, fromMock };
});

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: 'cat-old', name: 'Antiga', type: 'expense', is_default: false },
      { id: 'cat-new', name: 'Outra', type: 'expense', is_default: true },
    ],
    deleteCategory: mocks.deleteCategoryMock,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mocks.getUserMock(),
    },
    from: mocks.fromMock,
  },
}));

describe('DeleteCategoryDialog', () => {
  const category: Category = {
    id: 'cat-old',
    user_id: 'u1',
    name: 'Antiga',
    type: 'expense',
    parent_id: null,
    color: '#000',
    icon: 'Tag',
    is_default: false,
    created_at: '2026-04-01T00:00:00.000Z',
    keywords: [],
  };

  beforeEach(() => {
    Element.prototype.hasPointerCapture = function () {
      return false;
    };
    Element.prototype.setPointerCapture = function () {};
    Element.prototype.releasePointerCapture = function () {};
    Element.prototype.scrollIntoView = function () {};

    mocks.deleteCategoryMock.mockReset();
    mocks.getUserMock.mockReset();
    mocks.fromMock.mockClear();
    mocks.updateFn.mockClear();
    mocks.firstEq.mockClear();
    mocks.secondEq.mockClear();
    mocks.firstEq.mockImplementation(() => ({ eq: mocks.secondEq }));
    mocks.secondEq.mockResolvedValue({ error: null });
    mocks.getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mocks.deleteCategoryMock.mockResolvedValue(undefined);
  });

  it('lists payable bills and goals in the dependency summary', () => {
    render(
      <DeleteCategoryDialog
        open
        onOpenChange={() => {}}
        category={category}
        dependencies={{
          ledgerTransactionCount: 1,
          payableBillsCount: 2,
          financialGoalsCount: 1,
          legacyBudgetsCount: 0,
        }}
      />,
    );

    expect(screen.getByText(/lançamento.*extrato.*conta ou cartão/i)).toBeTruthy();
    expect(screen.getByText(/2.*contas a pagar/i)).toBeTruthy();
    expect(screen.getByText(/1.*meta financeira/i)).toBeTruthy();
  });

  it('reassigns dependents then deletes when confirmed', async () => {
    const user = userEvent.setup();

    render(
      <DeleteCategoryDialog
        open
        onOpenChange={() => {}}
        category={category}
        dependencies={{
          ledgerTransactionCount: 1,
          payableBillsCount: 0,
          financialGoalsCount: 0,
          legacyBudgetsCount: 0,
        }}
      />,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Outra' }));

    await user.click(screen.getByRole('button', { name: /Deletar Categoria/i }));

    await waitFor(() => expect(mocks.deleteCategoryMock).toHaveBeenCalledWith('cat-old'));
    expect(mocks.fromMock).toHaveBeenCalledWith('transactions');
    expect(mocks.fromMock).toHaveBeenCalledWith('credit_card_transactions');
    expect(mocks.fromMock).toHaveBeenCalledWith('payable_bills');
    expect(mocks.fromMock).toHaveBeenCalledWith('financial_goals');
    expect(mocks.fromMock).toHaveBeenCalledWith('budgets');
  });
});
