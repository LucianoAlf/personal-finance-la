/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CategoryDistributionChart } from './CategoryDistributionChart';

vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="category-doughnut-chart" />,
}));

describe('CategoryDistributionChart null-safe regression', () => {
  it('renders safely when a category percentage comes back null from reports data', () => {
    render(
      <CategoryDistributionChart
        distribution={
          {
            housing: {
              count: 2,
              total: 1807,
              percentage: null,
            },
          } as unknown as Record<string, { count: number; total: number; percentage: number }>
        }
        totalAmount={1807}
      />,
    );

    expect(screen.getByText('Distribuição por Categoria')).not.toBeNull();
    expect(screen.getByTestId('category-doughnut-chart')).not.toBeNull();
    expect(screen.getByText('0.0% do total')).not.toBeNull();
  });
});
