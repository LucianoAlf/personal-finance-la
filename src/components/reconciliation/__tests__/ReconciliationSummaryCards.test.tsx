/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ReconciliationSummaryCards } from '../ReconciliationSummaryCards';
import type {
  ReconciliationWindow,
  ReconciliationWorkspaceSummary,
} from '@/types/reconciliation';

afterEach(() => {
  cleanup();
});

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  }),
}));

const baseWindow: ReconciliationWindow = {
  presetId: 'window_default',
  label: '01/04/2026 em diante',
  startDate: '2026-04-01',
  endDate: null,
};

function summary(
  overrides: Partial<ReconciliationWorkspaceSummary> = {},
): ReconciliationWorkspaceSummary {
  return {
    pendingUnmatchedValue: 0,
    pendingUnmatchedCount: 0,
    openCases: 0,
    highConfidenceCount: 0,
    unmatchedCount: 0,
    staleConnections: 0,
    activeSources: ['pluggy'],
    priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0, infra: 0 },
    ingestionHealth: {
      totalIngested: 0,
      inScopeCount: 0,
      outOfScopeCount: 0,
      pendingInScope: 0,
      reconciledInScope: 0,
      archivedInScope: 0,
      lastPluggySyncAt: null,
      staleConnections: 0,
    },
    window: baseWindow,
    ...overrides,
  };
}

describe('ReconciliationSummaryCards', () => {
  it('surfaces the unmatched value as the hero card (large type, wide span)', () => {
    render(
      <ReconciliationSummaryCards
        summary={summary({
          pendingUnmatchedValue: 12480.55,
          pendingUnmatchedCount: 42,
          openCases: 180,
          highConfidenceCount: 9,
          unmatchedCount: 140,
          priorityBreakdown: { urgent: 3, high: 12, medium: 120, low: 40, infra: 5 },
        })}
      />,
    );

    expect(screen.getByText(/Valor sem correspondencia/i)).toBeTruthy();
    expect(screen.getByText(/R\$ 12480\.55/i)).toBeTruthy();
    expect(screen.getByText(/42 movimentos bancarios aguardando pareamento/i)).toBeTruthy();
  });

  it('keeps Alta confianca visible when unmatched items still exist', () => {
    render(
      <ReconciliationSummaryCards
        summary={summary({
          pendingUnmatchedValue: 1240,
          pendingUnmatchedCount: 4,
          openCases: 17,
          highConfidenceCount: 6,
          unmatchedCount: 2,
          staleConnections: 1,
          activeSources: ['manual', 'pluggy'],
          priorityBreakdown: { urgent: 0, high: 2, medium: 10, low: 5, infra: 0 },
        })}
      />,
    );

    expect(screen.getAllByText(/Alta confianca/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/6 sugestoes/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2 sem match/i).length).toBeGreaterThanOrEqual(1);
  });

  it('breaks down open cases by priority so "Urgente" stops being the universal label', () => {
    render(
      <ReconciliationSummaryCards
        summary={summary({
          openCases: 180,
          highConfidenceCount: 2,
          unmatchedCount: 140,
          priorityBreakdown: { urgent: 3, high: 12, medium: 120, low: 40, infra: 5 },
        })}
      />,
    );

    expect(screen.getByText(/3 urgentes/i)).toBeTruthy();
    expect(screen.getByText(/12 altas/i)).toBeTruthy();
    expect(screen.getByText(/120 medias/i)).toBeTruthy();
    expect(screen.getByText(/40 baixas/i)).toBeTruthy();
    expect(screen.getByText(/5 infra/i)).toBeTruthy();
  });

  it('does not render the old "Conexoes em risco" card anymore (moved to the context ribbon)', () => {
    render(
      <ReconciliationSummaryCards
        summary={summary({
          pendingUnmatchedValue: 1240,
          pendingUnmatchedCount: 4,
          openCases: 17,
          highConfidenceCount: 6,
          unmatchedCount: 2,
          staleConnections: 2,
          activeSources: ['manual', 'pluggy'],
          priorityBreakdown: { urgent: 0, high: 2, medium: 10, low: 5, infra: 0 },
        })}
      />,
    );

    expect(screen.queryByText(/Conexoes em risco/i)).toBeNull();
    expect(screen.queryByText(/2 conexoes em risco/i)).toBeNull();
    expect(screen.queryByText(/Fonte ativa/i)).toBeNull();
  });

  it('renders only three cards after the hierarchy refactor', () => {
    const { container } = render(
      <ReconciliationSummaryCards
        summary={summary({
          pendingUnmatchedValue: 1240,
          pendingUnmatchedCount: 4,
          openCases: 17,
          highConfidenceCount: 6,
          unmatchedCount: 2,
          priorityBreakdown: { urgent: 0, high: 2, medium: 10, low: 5, infra: 0 },
        })}
      />,
    );

    const root = container.querySelector('.grid');
    expect(root).not.toBeNull();
    const cards = root!.querySelectorAll(':scope > *');
    expect(cards.length).toBe(3);
  });
});
