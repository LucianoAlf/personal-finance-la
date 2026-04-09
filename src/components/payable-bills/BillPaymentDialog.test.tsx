/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BillPaymentDialog } from './BillPaymentDialog';

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({
    accounts: [],
  }),
}));

describe('BillPaymentDialog portuguese labels regression', () => {
  it('renders readable payment labels without mojibake', () => {
    render(
      <BillPaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        bill={{
          id: 'bill-1',
          user_id: 'user-1',
          description: 'Conta de Luz',
          amount: 250,
          due_date: '2026-04-10',
          status: 'pending',
          bill_type: 'service',
          is_recurring: false,
          is_installment: false,
          reminder_enabled: false,
          reminder_days_before: 3,
          reminder_channels: ['email'],
          priority: 'medium',
          created_at: '2026-04-01T00:00:00',
          updated_at: '2026-04-01T00:00:00',
        }}
      />,
    );

    expect(screen.getByText('Registrar Pagamento')).not.toBeNull();
    expect(screen.getByText('Valor Total:')).not.toBeNull();
    expect(screen.getByText('Forma de Pagamento*')).not.toBeNull();
    expect(screen.getByText('Número de Confirmação')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar Pagamento' })).not.toBeNull();
  });
});
