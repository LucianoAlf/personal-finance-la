/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { OpportunityFeed } from './OpportunityFeed';
import { OpportunityCard } from './OpportunityCard';
import { SmartRebalanceWidget } from './SmartRebalanceWidget';

const dismissOpportunityMock = vi.fn();
const generateOpportunitiesMock = vi.fn();
const setDefaultTargetsMock = vi.fn();

vi.mock('@/hooks/useMarketOpportunities', () => ({
  useMarketOpportunities: () => ({
    opportunities: [
      {
        id: 'opp-1',
        title: 'Rebalancear ações nacionais',
        description: 'Sua carteira concentra demais em uma única classe.',
        risk_level: 'medium',
        confidence_score: 88,
        expected_return: 12.5,
        asset_class: 'stocks',
        expires_at: '2026-04-20T12:00:00.000Z',
      },
    ],
    loading: false,
    generating: false,
    generateOpportunities: generateOpportunitiesMock,
    dismissOpportunity: dismissOpportunityMock,
  }),
}));

vi.mock('@/hooks/useAllocationTargets', () => ({
  useAllocationTargets: () => ({
    targets: [
      { assetClass: 'stocks', targetPercentage: 70 },
      { assetClass: 'fixed_income', targetPercentage: 30 },
    ],
    loading: false,
    setDefaultTargets: setDefaultTargetsMock,
    totalAllocated: 100,
  }),
}));

vi.mock('@/hooks/usePortfolioMetrics', () => ({
  usePortfolioMetrics: () => ({
    currentValue: 10000,
    allocation: {
      stocks: { percentage: 82, value: 8200 },
      fixed_income: { percentage: 18, value: 1800 },
    },
  }),
}));

vi.mock('@/utils/smartRebalance', () => ({
  calculateRebalancing: () => [
    {
      assetClass: 'stocks',
      action: 'SELL',
      reason: 'Reduzir exposição em ações.',
      currentPercentage: 82,
      targetPercentage: 70,
      amount: 1200,
      percentage: 12,
    },
  ],
  isPortfolioBalanced: () => false,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('OpportunityFeed and SmartRebalanceWidget', () => {
  afterEach(() => {
    cleanup();
    dismissOpportunityMock.mockClear();
    generateOpportunitiesMock.mockClear();
    setDefaultTargetsMock.mockClear();
  });

  it('renders premium shells and preserved semantics', () => {
    const { container: opportunitiesContainer } = render(<OpportunityFeed />);
    const opportunitiesRoot = opportunitiesContainer.querySelector('[class*="bg-card/95"]') as HTMLElement | null;
    expect(opportunitiesRoot?.className).toContain('border-border/70');
    expect(screen.getByText('Radar de Oportunidades')).not.toBeNull();
    expect(screen.getByText('Rebalancear ações nacionais')).not.toBeNull();

    const { container: rebalanceContainer } = render(<SmartRebalanceWidget investments={[]} />);
    const rebalanceRoot = rebalanceContainer.querySelector('[class*="bg-card/95"]') as HTMLElement | null;
    expect(rebalanceRoot?.className).toContain('border-border/70');
    expect(screen.getByText('Rebalanceamento Sugerido')).not.toBeNull();
    expect(screen.getByText('Reduzir exposição em ações.')).not.toBeNull();
  });

  it('renders the opportunity card with the premium card shell', () => {
    const { container } = render(
      <OpportunityCard
        opportunity={{
          id: 'opp-1',
          user_id: 'user-1',
          title: 'Rebalancear ações nacionais',
          description: 'Sua carteira concentra demais em uma única classe.',
          type: 'rebalance',
          risk_level: 'medium',
          confidence_score: 88,
          expected_return: 12.5,
          asset_class: 'stocks',
          expires_at: '2026-04-20T12:00:00.000Z',
          created_at: '2026-04-09T12:00:00.000Z',
        }}
        onDismiss={vi.fn()}
      />,
    );

    const shell = container.querySelector('[class*="bg-card/95"]') as HTMLElement | null;
    expect(shell).not.toBeNull();
    expect(shell?.className).toContain('rounded-[30px]');
  });
});
