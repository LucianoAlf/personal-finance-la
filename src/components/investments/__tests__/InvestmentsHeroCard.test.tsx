/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InvestmentsHeroCard } from '../InvestmentsHeroCard';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

describe('InvestmentsHeroCard', () => {
  afterEach(() => cleanup());

  it('renders the formatted current patrimônio value', () => {
    render(
      <InvestmentsHeroCard
        currentValue={127450}
        totalInvested={113300}
        totalReturn={14150}
        totalReturnPct={12.4}
        monthlyYield={980}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText('R$ 127450,00')).toBeTruthy();
  });

  it('renders the positive delta with an up arrow', () => {
    render(
      <InvestmentsHeroCard
        currentValue={127450}
        totalInvested={113300}
        totalReturn={14150}
        totalReturnPct={12.4}
        monthlyYield={980}
        formatCurrency={format}
      />,
    );
    const delta = screen.getByTestId('hero-delta');
    expect(delta.textContent).toMatch(/12[.,]4%/);
    expect(delta.textContent).toContain('▲');
    expect(delta.className).toContain('text-emerald');
  });

  it('renders the negative delta with a down arrow and red color', () => {
    render(
      <InvestmentsHeroCard
        currentValue={90000}
        totalInvested={100000}
        totalReturn={-10000}
        totalReturnPct={-10}
        monthlyYield={0}
        formatCurrency={format}
      />,
    );
    const delta = screen.getByTestId('hero-delta');
    expect(delta.textContent).toContain('▼');
    expect(delta.className).toContain('text-red');
  });

  it('renders investido comparison and yield/mês row', () => {
    render(
      <InvestmentsHeroCard
        currentValue={127450}
        totalInvested={113300}
        totalReturn={14150}
        totalReturnPct={12.4}
        monthlyYield={980}
        formatCurrency={format}
      />,
    );
    expect(screen.getByText(/investido/i)).toBeTruthy();
    expect(screen.getByText(/R\$ 113300,00/i)).toBeTruthy();
    expect(screen.getByText(/yield/i)).toBeTruthy();
    expect(screen.getByText('R$ 980,00')).toBeTruthy();
  });

  it('is hidden on desktop via lg:hidden class', () => {
    const { container } = render(
      <InvestmentsHeroCard
        currentValue={1}
        totalInvested={1}
        totalReturn={0}
        totalReturnPct={0}
        monthlyYield={0}
        formatCurrency={format}
      />,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('lg:hidden');
  });
});
