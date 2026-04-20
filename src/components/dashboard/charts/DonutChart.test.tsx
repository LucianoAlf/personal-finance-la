/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);
import { DonutChart } from './DonutChart';

const sampleData = [
  { name: 'Alimentação', value: 2239, color: '#f97316', percentage: 76 },
  { name: 'Transporte', value: 324, color: '#3b82f6', percentage: 11 },
  { name: 'Esportes', value: 200, color: '#10b981', percentage: 7 },
  { name: 'Consumo', value: 185, color: '#f59e0b', percentage: 6 },
];

describe('DonutChart', () => {
  afterEach(() => cleanup());

  it('renders the total center label', () => {
    render(<DonutChart data={sampleData} total={2948} />);
    expect(screen.getByTestId('donut-total').textContent).toMatch(/R\$\s?2\.948/);
    expect(screen.getByText(/TOTAL/i)).toBeTruthy();
  });

  it('renders legend chips for each item with label and formatted value', () => {
    render(<DonutChart data={sampleData} total={2948} />);
    const chips = screen.getAllByTestId('donut-chip');
    expect(chips).toHaveLength(4);
    expect(chips[0].textContent).toContain('Alimentação');
    expect(chips[0].textContent).toMatch(/R\$\s?2\.239/);
  });

  it('renders an empty state when data is empty', () => {
    render(<DonutChart data={[]} total={0} />);
    expect(screen.getByText(/sem despesas/i)).toBeTruthy();
  });

  it('has aria-label describing the chart', () => {
    render(<DonutChart data={sampleData} total={2948} />);
    expect(screen.getByRole('img', { name: /despesas por categoria/i })).toBeTruthy();
  });
});
