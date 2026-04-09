/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreditCardCard } from './CreditCardCard';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: {
      full_name: 'Luciano Alf',
    },
  }),
}));

vi.mock('./CreditCardMenu', () => ({
  CreditCardMenu: () => <button type="button">menu</button>,
}));

describe('CreditCardCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the invoice amount at the same visual scale as the available limit block', () => {
    render(
      <CreditCardCard
        card={{
          id: 'card-1',
          name: 'Nubank',
          brand: 'mastercard',
          color: '#8A05BE',
          last_four_digits: '6316',
          used_limit: 645,
          credit_limit: 25000,
          available_limit: 24355,
          current_invoice_amount: 245,
          current_due_date: '2026-04-22',
          current_invoice_id: 'inv-1',
          closing_day: 15,
          due_day: 22,
        } as any}
      />,
    );

    const invoiceValue = screen.getByText('R$ 245,00');
    const availableLimitValue = screen.getByText('R$ 24.355,00');

    expect(invoiceValue.className).toContain('text-[1.52rem]');
    expect(availableLimitValue.className).toContain('text-[1.52rem]');
  });
});
