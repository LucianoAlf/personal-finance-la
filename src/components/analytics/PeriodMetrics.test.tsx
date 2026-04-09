/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PeriodMetrics } from './PeriodMetrics';

describe('PeriodMetrics', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders premium metric cards with semantic value scale', () => {
    render(
      <PeriodMetrics
        loading={false}
        selectedPeriod="3m"
        analyticsData={{
          currentMonth: {
            totalSpent: 645,
            transactionCount: 4,
            averageTicket: 161.25,
            transactions: [],
            categoryBreakdown: [],
            merchantBreakdown: [],
          },
          previousMonth: {
            totalSpent: 645,
            transactionCount: 4,
          },
          last6Months: [],
          limitUsage: {
            totalLimit: 25000,
            totalUsed: 645,
            percentage: 2.58,
          },
          invoiceStats: {
            totalInvoices: 3,
            paidOnTime: 3,
            overdue: 0,
          },
        }}
      />,
    );

    const totalSpentCard = screen.getByTestId('analytics-metric-card-Total Gasto');
    const totalSpentValue = screen.getByTestId('analytics-metric-value-Total Gasto');

    expect(totalSpentCard.className).toContain('bg-card/95');
    expect(totalSpentCard.className).toContain('border-border/70');
    expect(totalSpentValue.className).toContain('text-[1.52rem]');
  });
});
