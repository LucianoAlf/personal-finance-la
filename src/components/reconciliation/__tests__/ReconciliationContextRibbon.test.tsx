/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';

import { ReconciliationContextRibbon } from '../ReconciliationContextRibbon';
import type {
  PluggyConnectionRow,
  ReconciliationWindow,
  ReconciliationWorkspaceSummary,
} from '@/types/reconciliation';

afterEach(() => {
  cleanup();
});

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));

const baseWindow: ReconciliationWindow = {
  presetId: 'window_default',
  label: '01/04/2026 em diante',
  startDate: '2026-04-01',
  endDate: null,
};

const baseSummary: ReconciliationWorkspaceSummary = {
  pendingUnmatchedValue: 0,
  pendingUnmatchedCount: 0,
  openCases: 0,
  highConfidenceCount: 0,
  unmatchedCount: 0,
  staleConnections: 0,
  activeSources: ['pluggy'],
  priorityBreakdown: { urgent: 0, high: 0, medium: 0, low: 0, infra: 0 },
  ingestionHealth: {
    totalIngested: 2508,
    inScopeCount: 241,
    outOfScopeCount: 2267,
    pendingInScope: 222,
    reconciledInScope: 15,
    archivedInScope: 0,
    lastPluggySyncAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    staleConnections: 0,
  },
  window: baseWindow,
};

const pluggyConnection: PluggyConnectionRow = {
  id: 'conn-1',
  user_id: 'user-1',
  item_id: 'item-1',
  institution_name: 'Nubank',
  status: 'updated',
  last_synced_at: new Date().toISOString(),
  staleness_threshold_hours: 48,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ReconciliationContextRibbon', () => {
  it('renders the window chip and preset radios without duplicating "Janela aplicada"', () => {
    render(
      <ReconciliationContextRibbon
        window={baseWindow}
        activePresetId="window_default"
        onChangePreset={() => {}}
        summary={baseSummary}
        connections={[pluggyConnection]}
      />,
    );

    expect(screen.getByText(/01\/04\/2026 em diante/i)).toBeTruthy();
    const janelaMatches = screen.getAllByText(/Janela/i);
    expect(janelaMatches.length).toBeLessThanOrEqual(2);
    expect(screen.getByRole('radiogroup', { name: /Presets de janela/i })).toBeTruthy();
  });

  it('shows inline health stats (sync age, ingestion, pending, conexoes) in one block', () => {
    render(
      <ReconciliationContextRibbon
        window={baseWindow}
        activePresetId="window_default"
        onChangePreset={() => {}}
        summary={baseSummary}
        connections={[pluggyConnection]}
      />,
    );

    expect(screen.getByText(/Sync util/i)).toBeTruthy();
    expect(screen.getByText(/Ingestao/i)).toBeTruthy();
    expect(screen.getByText(/Pendentes/i)).toBeTruthy();
    expect(screen.getByText(/todas saudaveis/i)).toBeTruthy();
    expect(screen.getByText(/241 \/ 2508/)).toBeTruthy();
    expect(screen.getByText(/222/)).toBeTruthy();
  });

  it('surfaces stale connections as an inline amber badge (not a full card)', () => {
    render(
      <ReconciliationContextRibbon
        window={baseWindow}
        activePresetId="window_default"
        onChangePreset={() => {}}
        summary={{ ...baseSummary, staleConnections: 2 }}
        connections={[pluggyConnection]}
      />,
    );

    const badge = screen.getByRole('status');
    expect(badge.textContent ?? '').toMatch(/2 conexao(oes)? em risco/i);
    expect(screen.getAllByText(/em risco/i).length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onChangePreset when a preset radio is clicked', () => {
    const spy = vi.fn();
    render(
      <ReconciliationContextRibbon
        window={baseWindow}
        activePresetId="window_default"
        onChangePreset={spy}
        summary={baseSummary}
        connections={[pluggyConnection]}
      />,
    );

    const buttons = screen.getAllByRole('radio');
    const allTime = buttons.find((btn) => /historico|tudo/i.test(btn.textContent ?? ''));
    if (!allTime) throw new Error('expected an all-time preset radio');
    fireEvent.click(allTime);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('shows the historical warning chip when the all-time preset is active', () => {
    render(
      <ReconciliationContextRibbon
        window={{ presetId: 'all_time', label: 'Tudo (historico)', startDate: null, endDate: null }}
        activePresetId="all_time"
        onChangePreset={() => {}}
        summary={baseSummary}
        connections={[pluggyConnection]}
      />,
    );

    expect(screen.getByRole('note').textContent ?? '').toMatch(/modo historico/i);
  });

  it('calls onSyncNow when the sync button is clicked and shows lock text while pending', () => {
    const syncSpy = vi.fn();
    const { rerender } = render(
      <ReconciliationContextRibbon
        window={baseWindow}
        activePresetId="window_default"
        onChangePreset={() => {}}
        summary={baseSummary}
        connections={[pluggyConnection]}
        onSyncNow={syncSpy}
      />,
    );

    fireEvent.click(screen.getByText(/Sincronizar agora/i));
    expect(syncSpy).toHaveBeenCalled();

    rerender(
      <ReconciliationContextRibbon
        window={baseWindow}
        activePresetId="window_default"
        onChangePreset={() => {}}
        summary={baseSummary}
        connections={[pluggyConnection]}
        onSyncNow={syncSpy}
        isSyncPending
      />,
    );

    expect(screen.getByText(/Sincronizando/i)).toBeTruthy();
    expect(screen.getByText(/lock ativo/i)).toBeTruthy();
  });
});
