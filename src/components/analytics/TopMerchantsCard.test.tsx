/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TopMerchantsCard } from './TopMerchantsCard';

vi.mock('@/hooks/useTopSpending', () => ({
  useTopSpending: () => ({
    loading: false,
    totalSpent: 645,
    topCategories: [],
    topMerchants: [
      {
        merchantName: 'Tenis Nike',
        totalAmount: 600,
        transactionCount: 3,
        averageTicket: 200,
        lastPurchaseDate: '2026-04-03',
        categoryName: 'Esportes',
        categoryColor: '#10B981',
      },
    ],
  }),
}));

describe('TopMerchantsCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders merchants in the same premium analytics card family', () => {
    render(<TopMerchantsCard />);

    const root = screen.getByTestId('analytics-top-merchants-card');
    const content = screen.getByTestId('analytics-top-merchants-content');
    const row = screen.getByTestId('analytics-top-merchant-row-Tenis Nike');

    expect(root.className).toContain('bg-card/95');
    expect(root.className).toContain('border-border/70');
    expect(root.className).toContain('rounded-[30px]');
    expect(content.className).toContain('pt-5');
    expect(row.className).toContain('bg-surface-elevated/45');
  });
});
