/* @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Categories from './Categories';

const categoryCardMock = vi.fn();
const refetchStatsMock = vi.fn();
const createDialogMock = vi.fn();

vi.mock('@/components/layout/Header', () => ({
  Header: () => <div>Header</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (value === 'expense' ? <div>{children}</div> : null),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>loading</div>,
}));

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      {
        id: 'cat-1',
        user_id: 'user-1',
        name: 'Alimentação',
        type: 'expense',
        parent_id: null,
        color: '#ef4444',
        icon: 'Utensils',
        is_default: true,
        created_at: '2026-04-01T00:00:00.000Z',
        keywords: [],
      },
      {
        id: 'cat-2',
        user_id: 'user-1',
        name: 'Salário',
        type: 'income',
        parent_id: null,
        color: '#22c55e',
        icon: 'Wallet',
        is_default: true,
        created_at: '2026-04-01T00:00:00.000Z',
        keywords: [],
      },
    ],
    loading: false,
  }),
}));

vi.mock('@/hooks/useCategoryStats', () => ({
  useCategoryStats: () => ({
    stats: [
      {
        categoryId: 'cat-1',
        transactionCount: 2,
        totalAmount: 100,
        payableBillsCount: 0,
        financialGoalsCount: 0,
        legacyBudgetsCount: 0,
      },
    ],
    loading: false,
    refetch: refetchStatsMock,
  }),
}));

vi.mock('@/components/categories/CategoryCard', () => ({
  CategoryCard: (props: unknown) => {
    categoryCardMock(props);
    return <div>CategoryCard</div>;
  },
}));

vi.mock('@/components/categories/CreateCategoryDialog', () => ({
  CreateCategoryDialog: (props: unknown) => {
    createDialogMock(props);
    return null;
  },
}));

describe('Categories page', () => {
  beforeEach(() => {
    categoryCardMock.mockClear();
    refetchStatsMock.mockClear();
    createDialogMock.mockClear();
  });

  it('passes category stats refetch down to category cards for drill-down updates', () => {
    render(<Categories />);

    expect(categoryCardMock).toHaveBeenCalled();
    expect(categoryCardMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        onTransactionsChanged: refetchStatsMock,
      }),
    );
  });

  it('keeps a local create action in the custom categories empty state', async () => {
    const user = userEvent.setup();

    render(<Categories />);

    expect(screen.getAllByText('Nenhuma categoria nesta seção').length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: 'Criar categoria agora' })[0]);

    expect(createDialogMock).toHaveBeenCalled();
    expect(createDialogMock.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        open: true,
      }),
    );
  });
});
