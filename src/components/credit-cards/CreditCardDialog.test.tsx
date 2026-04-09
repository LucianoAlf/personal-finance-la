/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CreditCardDialog } from './CreditCardDialog';

vi.mock('./CreditCardForm', () => ({
  CreditCardForm: () => <div>credit-card-form-mounted</div>,
}));

vi.mock('@/hooks/useCreditCards', () => ({
  useCreditCards: () => ({
    createCard: vi.fn(),
    updateCard: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('CreditCardDialog', () => {
  it('renders a readable portuguese title without mojibake', () => {
    render(<CreditCardDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('Novo Cartão de Crédito')).not.toBeNull();
    expect(screen.getByText('credit-card-form-mounted')).not.toBeNull();
  });
});
