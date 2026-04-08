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
      onRecategorizeSuccess?: () => void;
    };

    return typed.open ? (
      <button type="button" onClick={() => typed.onRecategorizeSuccess?.()}>
        Trigger transactions changed
      </button>
    ) : null;
  },
}));

describe('CategoryCard', () => {
  beforeEach(() => {
    categoryTransactionsDialogMock.mockClear();
  });

  it('forwards transaction-change callback into the category transactions dialog', async () => {
    const user = userEvent.setup();
    const onTransactionsChanged = vi.fn();

    render(
      <CategoryCard
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
        stats={{
          transactionCount: 1,
          totalAmount: 100,
          payableBillsCount: 0,
          financialGoalsCount: 0,
          legacyBudgetsCount: 0,
        }}
        isDefault={false}
        onTransactionsChanged={onTransactionsChanged}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver' }));
    await user.click(await screen.findByRole('button', { name: 'Trigger transactions changed' }));

    expect(onTransactionsChanged).toHaveBeenCalledTimes(1);
    expect(categoryTransactionsDialogMock).toHaveBeenCalled();
  });
});
