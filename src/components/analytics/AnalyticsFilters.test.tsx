/* @vitest-environment jsdom */

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsFilters } from './AnalyticsFilters';

vi.mock('@/hooks/useCreditCards', () => ({
  useCreditCards: () => ({
    cardsSummary: [
      { id: 'card-1', name: 'Nubank', color: '#8A05BE' },
      { id: 'card-2', name: 'C6 Bank', color: '#1F1F1F' },
    ],
  }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <button data-testid="analytics-filter-trigger" type="button" className={className}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('AnalyticsFilters', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the analytics filter shell with premium tokenized styling', () => {
    const { container } = render(
      <AnalyticsFilters
        selectedCardId={null}
        selectedPeriod="3m"
        onCardChange={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    const root = container.firstElementChild as HTMLElement | null;
    expect(root?.className).toContain('bg-card/95');
    expect(root?.className).toContain('border-border/70');
    expect(root?.className).toContain('rounded-[28px]');

    const triggers = screen.getAllByTestId('analytics-filter-trigger');
    expect(triggers[0].className).toContain('bg-surface/80');
    expect(triggers[0].className).toContain('text-foreground');
    expect(triggers[1].className).toContain('bg-surface/80');

    const periodHint = screen.getByText(/Exibindo dados de/i);
    expect(periodHint.className).toContain('text-muted-foreground');
  });
});
