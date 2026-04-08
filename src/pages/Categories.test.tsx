/* @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import Categories from './Categories';

const categoryCardMock = vi.fn();
const refetchStatsMock = vi.fn();

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
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
        name: 'Alimentacao',
        type: 'expense',
        parent_id: null,
        color: '#ef4444',
        icon: 'Utensils',
        is_default: false,
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
  CreateCategoryDialog: () => null,
}));

describe('Categories page', () => {
  beforeEach(() => {
    categoryCardMock.mockClear();
    refetchStatsMock.mockClear();
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
});
