/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReminderConfigDialog } from './ReminderConfigDialog';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      whileHover: _whileHover,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { whileHover?: unknown }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'luciano@example.com',
      phone: '+55 31 99999-9999',
    },
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ReminderConfigDialog premium regression', () => {
  it('renders readable portuguese labels in a premium dialog shell', () => {
    render(
      <ReminderConfigDialog
        open={true}
        onOpenChange={vi.fn()}
        bill={{
          id: 'bill-1',
          user_id: 'user-1',
          description: 'Conta de Luz',
          amount: 250,
          due_date: '2026-04-15',
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

    expect(screen.getByText('Configurar Lembretes')).not.toBeNull();
    expect(screen.getByText('Configure quando e como deseja ser lembrado sobre esta conta')).not.toBeNull();
    expect(screen.getByText('Quando lembrar?')).not.toBeNull();
    expect(screen.getByText('Como enviar?')).not.toBeNull();
    expect(screen.getByText('Notificação Push (Celular)')).not.toBeNull();
    expect(screen.getByText('Salvar Lembretes')).not.toBeNull();

    expect(document.querySelector('[role="dialog"]')?.className).toContain('rounded-[1.75rem]');
  });
});
