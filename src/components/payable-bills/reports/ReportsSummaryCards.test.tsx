/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReportsSummaryCards } from './ReportsSummaryCards';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('ReportsSummaryCards premium regression', () => {
  it('uses the secondary analytics metric shell instead of the hero stat cards from the page top', () => {
    render(
      <ReportsSummaryCards
        totalAmount={349}
        totalBills={2}
        comparison={{
          previous_total: 0,
          current_total: 349,
          difference: 349,
          variation_percent: 0,
          trend: 'stable',
        }}
        forecastAmount={99}
        forecastMonths={1}
        onTimeRate={100}
        paidCount={0}
        totalPaid={0}
      />,
    );

    const totalCard = screen.getByText('Total do Período').closest('div[class*="rounded"]');
    const forecastCard = screen.getByText('Previsão Próx. Mês').closest('div[class*="rounded"]');

    expect(totalCard?.className).toContain('bg-card/95');
    expect(totalCard?.className).toContain('shadow-[');
    expect(totalCard?.className).not.toContain('bg-surface/92');
    expect(forecastCard?.className).toContain('bg-card/95');
    expect(forecastCard?.className).not.toContain('bg-purple-50');
  });
});
