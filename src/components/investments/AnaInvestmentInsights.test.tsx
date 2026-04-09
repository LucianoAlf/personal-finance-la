/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { AnaInvestmentInsights } from './AnaInvestmentInsights';

const { useAnaInsightsMock } = vi.hoisted(() => ({
  useAnaInsightsMock: vi.fn(() => ({
    healthScore: 85,
    breakdown: {
      diversification: 18,
      concentration: 8,
      returns: 17,
      risk: 12,
    },
    insight: {
      level: 'excellent',
    },
    gptInsights: {
      mainInsight: 'Portfólio bem distribuído.\n\nAportes consistentes sustentam o avanço.',
      strengths: ['Diversificação saudável'],
      warnings: ['Atenção à concentração'],
      recommendations: [
        {
          title: 'Reforçar aportes',
          description: 'Mantenha a cadência de aportes mensais.',
          priority: 'high',
        },
      ],
      nextSteps: ['Revisar metas trimestrais'],
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useAnaInsights', () => ({
  useAnaInsights: useAnaInsightsMock,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AnaInvestmentInsights', () => {
  afterEach(() => {
    cleanup();
    useAnaInsightsMock.mockClear();
  });

  it('renders a premium analytical shell without legacy light wrappers', () => {
    const { container } = render(<AnaInvestmentInsights investments={[]} />);

    const shell = container.querySelector('[class*="bg-card/95"]') as HTMLElement | null;
    expect(shell?.className).toContain('border-border/70');
    expect(screen.getByText('Ana Clara diz:')).not.toBeNull();
    expect(screen.getByText('Saúde do Portfólio')).not.toBeNull();
  });
});
