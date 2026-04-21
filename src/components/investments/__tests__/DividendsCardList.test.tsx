/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  DividendsCardList,
  type DividendPaidItem,
  type DividendUpcomingItem,
} from '../DividendsCardList';

const format = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

describe('DividendsCardList', () => {
  afterEach(() => cleanup());

  it('renders empty state when both lists are empty', () => {
    render(
      <DividendsCardList
        paidThisMonth={[]}
        upcoming30Days={[]}
        formatCurrency={format}
        onOpenCalendar={vi.fn()}
      />,
    );
    expect(screen.getByText(/sem dividendos/i)).toBeTruthy();
  });

  it('renders "Este mês" section with paid items and their total', () => {
    const paid: DividendPaidItem[] = [
      { id: 'p1', ticker: 'HGLG11', subtitle: 'Rendimento jan/26', amount: 285, date: '15 jan' },
      { id: 'p2', ticker: 'BBAS3', subtitle: 'JCP', amount: 120, date: '12 jan' },
    ];
    render(
      <DividendsCardList
        paidThisMonth={paid}
        upcoming30Days={[]}
        formatCurrency={format}
        onOpenCalendar={vi.fn()}
      />,
    );
    expect(screen.getByText(/este mês/i)).toBeTruthy();
    expect(screen.getByText('HGLG11')).toBeTruthy();
    expect(screen.getByText('BBAS3')).toBeTruthy();
    expect(screen.getByText(/R\$ 405,00/i)).toBeTruthy();
  });

  it('renders "Próximos 30 dias" section with upcoming items', () => {
    const upcoming: DividendUpcomingItem[] = [
      { id: 'u1', ticker: 'MXRF11', subtitle: 'Distribuição prevista', amount: 340, date: '28 fev' },
    ];
    render(
      <DividendsCardList
        paidThisMonth={[]}
        upcoming30Days={upcoming}
        formatCurrency={format}
        onOpenCalendar={vi.fn()}
      />,
    );
    expect(screen.getByText(/próximos 30 dias/i)).toBeTruthy();
    expect(screen.getByText('MXRF11')).toBeTruthy();
  });

  it('fires onOpenCalendar when the "Abrir calendário" button is tapped', () => {
    const onOpenCalendar = vi.fn();
    render(
      <DividendsCardList
        paidThisMonth={[]}
        upcoming30Days={[]}
        formatCurrency={format}
        onOpenCalendar={onOpenCalendar}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /abrir calendário/i }));
    expect(onOpenCalendar).toHaveBeenCalled();
  });
});
