/* @vitest-environment jsdom */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransactionItem } from './TransactionItem';

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    getCategoryById: () => ({ id: 'c1', name: 'Test', icon: 'Wallet', color: '#000' }),
  }),
}));

describe('TransactionItem', () => {
  it('renders tag chips when tags are provided', () => {
    render(
      <TransactionItem
        type="expense"
        description="Compra"
        category_id="c1"
        date="2026-04-01"
        amount={42}
        tags={[
          { id: 't1', name: 'Mercado', color: '#ff00aa' },
          { id: 't2', name: 'Essencial', color: null },
        ]}
      />,
    );

    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByText('Essencial')).toBeTruthy();
  });
});
