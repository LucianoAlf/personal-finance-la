/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BillSummaryCards } from './BillSummaryCards';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('BillSummaryCards premium regression', () => {
  it('uses shared premium surfaces instead of old tinted summary cards', () => {
    render(
      <BillSummaryCards
        pendingAmount={1807}
        pendingCount={3}
        overdueAmount={99}
        overdueCount={1}
        paidAmount={0}
        paidCount={0}
      />,
    );

    const totalCard = screen.getByText('Total').closest('div[class*="rounded"]');
    const pendingCard = screen.getByText('A Vencer').closest('div[class*="rounded"]');

    expect(totalCard?.className).toContain('bg-surface');
    expect(totalCard?.className).toContain('border-border');
    expect(totalCard?.className).not.toContain('bg-blue-500/10');
    expect(pendingCard?.className).toContain('bg-surface');
    expect(pendingCard?.className).not.toContain('bg-yellow-500/10');
  });
});
