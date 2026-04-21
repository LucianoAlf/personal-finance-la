/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PortfolioCardList } from '../PortfolioCardList';
import type { Investment } from '@/types/database.types';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'i1',
    user_id: 'u1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'stock',
    quantity: 700,
    purchase_price: 35,
    current_price: 35,
    current_value: 24500,
    total_invested: 24500,
    linked_investments: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  } as Investment;
}

describe('PortfolioCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when no investments', () => {
    render(<PortfolioCardList investments={[]} onCardTap={vi.fn()} formatCurrency={format} />);
    expect(screen.getByText(/nenhum ativo/i)).toBeTruthy();
  });

  it('renders one card per investment', () => {
    render(
      <PortfolioCardList
        investments={[
          makeInvestment(),
          makeInvestment({ id: 'i2', ticker: 'HGLG11', name: 'CSHG Log', type: 'fund' }),
        ]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('PETR4')).toBeTruthy();
    expect(screen.getByText('HGLG11')).toBeTruthy();
  });

  it('fires onCardTap with the investment when tapped', () => {
    const onCardTap = vi.fn();
    const inv = makeInvestment();
    render(<PortfolioCardList investments={[inv]} onCardTap={onCardTap} formatCurrency={format} />);
    fireEvent.click(screen.getByRole('button', { name: /PETR4/i }));
    expect(onCardTap).toHaveBeenCalledWith(inv);
  });

  it('applies a blue border-left for stocks', () => {
    const { container } = render(
      <PortfolioCardList investments={[makeInvestment()]} onCardTap={vi.fn()} formatCurrency={format} />,
    );
    const card = container.querySelector('[data-testid="portfolio-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-blue-500');
  });

  it('applies a purple border-left for funds', () => {
    const { container } = render(
      <PortfolioCardList
        investments={[makeInvestment({ type: 'fund' })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const card = container.querySelector('[data-testid="portfolio-card"]') as HTMLElement;
    expect(card.className).toContain('border-l-purple-500');
  });

  it('shows positive return in green with up arrow', () => {
    render(
      <PortfolioCardList
        investments={[makeInvestment({ current_value: 28000, total_invested: 25000 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const ret = screen.getByTestId('return-pct');
    expect(ret.textContent).toContain('▲');
    expect(ret.className).toContain('text-emerald');
  });

  it('shows negative return in red with down arrow', () => {
    render(
      <PortfolioCardList
        investments={[makeInvestment({ current_value: 22000, total_invested: 25000 })]}
        onCardTap={vi.fn()}
        formatCurrency={format}
      />,
    );
    const ret = screen.getByTestId('return-pct');
    expect(ret.textContent).toContain('▼');
    expect(ret.className).toContain('text-red');
  });
});
