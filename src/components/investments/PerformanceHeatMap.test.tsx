/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PerformanceHeatMap } from './PerformanceHeatMap';

vi.mock('@/hooks/useMonthlyReturns', () => ({
  useMonthlyReturns: () => [
    { date: new Date('2026-01-01'), month: 'jan/2026', return: 1.2, value: 1000 },
    { date: new Date('2026-02-01'), month: 'fev/2026', return: -0.5, value: 980 },
    { date: new Date('2026-03-01'), month: 'mar/2026', return: 4.7, value: 1100 },
  ],
}));

vi.mock('framer-motion', () => ({
  motion: {
    button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
      ({ children, ...props }, ref) => (
        <button ref={ref} type="button" {...props}>
          {children}
        </button>
      )
    ),
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, ...props }, ref) => (
        <div ref={ref} {...props}>
          {children}
        </div>
      )
    ),
  },
}));

describe('PerformanceHeatMap premium polish', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders premium support blocks and legend shell instead of flat heatmap framing', () => {
    render(<PerformanceHeatMap />);

    expect(screen.getByText(/Leitura de intensidade/i)).not.toBeNull();
    expect(screen.getByText(/Retorno médio/i)).not.toBeNull();
    expect(screen.getByText(/Melhor janela/i)).not.toBeNull();
    expect(screen.getByText(/Mês de menor retorno/i)).not.toBeNull();
    expect(screen.getByText(/estimativa operacional baseada no histórico/i)).not.toBeNull();
  });
});
