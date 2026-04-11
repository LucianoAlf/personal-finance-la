/* @vitest-environment jsdom */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RecategorizeDialog } from './RecategorizeDialog';
import type { Category } from '@/types/categories';

const categoriesMock = vi.fn();

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    categories: categoriesMock(),
  }),
}));

vi.mock('@/hooks/useRecategorize', () => ({
  useRecategorize: () => ({
    recategorizeTransaction: vi.fn(),
    recategorizeBulk: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
    id,
    className,
  }: {
    children: React.ReactNode;
    id?: string;
    className?: string;
  }) => (
    <button id={id} className={className} type="button">
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`option-${value}`}>{children}</div>
  ),
}));

const baseCategory: Omit<Category, 'id' | 'name' | 'type'> = {
  user_id: 'user-1',
  parent_id: null,
  color: '#ef4444',
  icon: 'Tag',
  is_default: false,
  created_at: '2026-04-07T00:00:00.000Z',
  keywords: [],
};

describe('RecategorizeDialog', () => {
  beforeEach(() => {
    cleanup();
    categoriesMock.mockReset();
    categoriesMock.mockReturnValue([
      { ...baseCategory, id: 'expense-current', name: 'Mercado', type: 'expense' },
      { ...baseCategory, id: 'expense-other', name: 'Transporte', type: 'expense' },
      { ...baseCategory, id: 'income-other', name: 'Salário', type: 'income' },
    ]);
  });

  it('offers only expense categories for credit card transactions', () => {
    render(
      <RecategorizeDialog
        open
        onOpenChange={vi.fn()}
        transaction={{
          id: 'card-1',
          description: 'Compra no cartão',
          ledgerEntity: 'credit_card_transaction',
        }}
        currentCategory={{ ...baseCategory, id: 'expense-current', name: 'Mercado', type: 'expense' }}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Transporte')).toBeTruthy();
    expect(screen.queryByText('Salário')).toBeNull();
  });

  it('offers only categories matching the current category type for bank transactions', () => {
    render(
      <RecategorizeDialog
        open
        onOpenChange={vi.fn()}
        transaction={{
          id: 'tx-1',
          description: 'Recebimento',
          ledgerEntity: 'transaction',
        }}
        currentCategory={{ ...baseCategory, id: 'income-current', name: 'Freelance', type: 'income' }}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Salário')).toBeTruthy();
    expect(screen.queryByText('Transporte')).toBeNull();
  });
});
