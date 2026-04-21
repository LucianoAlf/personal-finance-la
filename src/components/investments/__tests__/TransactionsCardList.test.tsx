/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransactionsCardList, type TransactionItem } from '../TransactionsCardList';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function today() { return new Date().toISOString(); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeTx(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id: 't1',
    ticker: 'PETR4',
    transaction_type: 'buy',
    quantity: 100,
    price: 35,
    total_amount: 3500,
    transaction_date: today(),
    ...overrides,
  };
}

describe('TransactionsCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no transactions', () => {
    render(
      <TransactionsCardList transactions={[]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    expect(screen.getByText(/nenhuma transação/i)).toBeTruthy();
  });

  it('groups transactions by date with "Hoje" and "Ontem" labels', () => {
    render(
      <TransactionsCardList
        transactions={[
          makeTx({ id: 't1' }),
          makeTx({ id: 't2', transaction_date: daysAgo(1) }),
        ]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/^hoje$/i)).toBeTruthy();
    expect(screen.getByText(/^ontem$/i)).toBeTruthy();
  });

  it('applies green border-left for buy transactions', () => {
    const { container } = render(
      <TransactionsCardList
        transactions={[makeTx({ transaction_type: 'buy' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(container.querySelector('[data-testid="tx-card"]')?.className).toContain('border-l-blue-500');
  });

  it('applies red border-left for sell transactions', () => {
    const { container } = render(
      <TransactionsCardList
        transactions={[makeTx({ transaction_type: 'sell' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(container.querySelector('[data-testid="tx-card"]')?.className).toContain('border-l-red-500');
  });

  it('applies emerald border-left for dividend transactions', () => {
    const { container } = render(
      <TransactionsCardList
        transactions={[makeTx({ transaction_type: 'dividend' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(container.querySelector('[data-testid="tx-card"]')?.className).toContain('border-l-emerald-500');
  });

  it('fires onCardTap with the transaction when tapped', () => {
    const onCardTap = vi.fn();
    const tx = makeTx();
    render(
      <TransactionsCardList transactions={[tx]} onCardTap={onCardTap} formatCurrency={format} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /PETR4/i }));
    expect(onCardTap).toHaveBeenCalledWith(tx);
  });
});
