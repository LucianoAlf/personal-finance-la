/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrendingUp } from 'lucide-react';

import { InsightsPanel } from './InsightsPanel';

vi.mock('@/hooks/useInsights', () => ({
  useInsights: () => [
    {
      id: 'insight-1',
      type: 'info',
      title: 'Esportes em alta',
      description: 'Categoria Esportes representa 93% dos seus gastos.',
      icon: TrendingUp,
      action: {
        label: 'Criar Meta',
        onClick: vi.fn(),
      },
    },
  ],
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

describe('InsightsPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders insight cards with premium hierarchy and tokenized surfaces', () => {
    render(<InsightsPanel analyticsData={{} as any} loading={false} />);

    const insightCard = screen.getAllByTestId('analytics-insight-card-insight-1')[0];
    const insightTitle = screen.getAllByTestId('analytics-insight-title-insight-1')[0];
    const insightCopy = screen.getAllByTestId('analytics-insight-copy-insight-1')[0];

    expect(insightCard.className).toContain('rounded-[28px]');
    expect(insightTitle.className).toContain('text-foreground');
    expect(insightTitle.className).toContain('font-semibold');
    expect(insightCopy.className).toContain('text-muted-foreground');
  });
});
