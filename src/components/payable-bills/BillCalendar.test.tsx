/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BillCalendar } from './BillCalendar';

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [],
  }),
}));

describe('BillCalendar portuguese labels regression', () => {
  it('renders readable weekday and summary labels without mojibake', () => {
    render(
      <BillCalendar
        bills={[]}
        currentMonth={new Date('2026-04-01T00:00:00')}
        onMonthChange={vi.fn()}
        onPay={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Sáb')).not.toBeNull();
    expect(screen.getByText('Total')).not.toBeNull();
    expect(screen.getByText('Pendente')).not.toBeNull();
    expect(screen.getByText('Vencido')).not.toBeNull();
    expect(screen.getByText('Pago')).not.toBeNull();
  });
});
