/* @vitest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { CreditCardCard } from './CreditCardCard';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: { full_name: 'Test User' } }),
}));

const mockCard = {
  id: 'card-1',
  user_id: 'user-1',
  name: 'Nubank',
  brand: 'visa' as const,
  last_four_digits: '4291',
  credit_limit: 5000,
  available_limit: 3750,
  used_limit: 1250,
  current_invoice_amount: 1250,
  due_day: 10,
  closing_day: 3,
  color: '#7c3aed',
  is_archived: false,
  is_active: true,
  icon: '',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  usage_percentage: 25,
  total_transactions: 0,
  paid_invoices_count: 0,
};

function getMobileRow(container: HTMLElement): HTMLElement {
  // lg:hidden class contains a colon — use attribute-contains selector to avoid CSS escaping issues
  const el = container.querySelector('[class*="lg:hidden"]') as HTMLElement | null;
  if (!el) throw new Error('Mobile row (lg:hidden) not found');
  return el;
}

describe('CreditCardCard', () => {
  it('renders mobile Editar and Arquivar buttons with lg:hidden', () => {
    const { container } = render(<CreditCardCard card={mockCard as any} />);
    const mobileRow = getMobileRow(container);
    expect(within(mobileRow).getByText('Editar')).toBeTruthy();
    expect(within(mobileRow).getByText('Arquivar')).toBeTruthy();
  });

  it('calls onEdit when Editar button is clicked', () => {
    const onEdit = vi.fn();
    const { container } = render(<CreditCardCard card={mockCard as any} onEdit={onEdit} />);
    fireEvent.click(within(getMobileRow(container)).getByText('Editar'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onArchive when Arquivar button is clicked', () => {
    const onArchive = vi.fn();
    const { container } = render(<CreditCardCard card={mockCard as any} onArchive={onArchive} />);
    fireEvent.click(within(getMobileRow(container)).getByText('Arquivar'));
    expect(onArchive).toHaveBeenCalledTimes(1);
  });
});
