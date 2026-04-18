/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Reconciliation } from './Reconciliation';

const { workspaceQueryState } = vi.hoisted(() => ({
  workspaceQueryState: {
    data: {
      cases: [
        {
          id: 'case-1',
          user_id: 'u-1',
          bank_transaction_id: 'bt-1',
          divergence_type: 'pending_bill_paid_in_bank',
          matched_record_type: 'payable_bill',
          matched_record_id: 'pb-1',
          confidence: 0.92,
          confidence_reasoning: {},
          hypotheses: [],
          status: 'open',
          priority: 'urgent',
          auto_close_reason: null,
          resolved_at: null,
          resolved_by: null,
          created_at: '2026-04-14T10:00:00Z',
          updated_at: '2026-04-14T10:00:00Z',
        },
      ],
      connections: [],
      bankTransactions: [],
      summary: {
        pendingUnmatchedValue: 0,
        pendingUnmatchedCount: 0,
        openCases: 1,
        highConfidenceCount: 1,
        unmatchedCount: 0,
        staleConnections: 0,
        activeSources: ['manual', 'pluggy'],
        priorityBreakdown: { urgent: 1, high: 0, medium: 0, low: 0, infra: 0 },
        ingestionHealth: {
          totalIngested: 10,
          inScopeCount: 8,
          outOfScopeCount: 2,
          pendingInScope: 1,
          reconciledInScope: 5,
          archivedInScope: 2,
          lastPluggySyncAt: '2026-04-14T09:00:00Z',
          staleConnections: 0,
        },
        window: {
          presetId: 'window_default',
          startDate: '2026-04-01',
          endDate: null,
          label: '01/04/2026 em diante',
        },
      },
      selectedCase: null,
      auditEntries: [],
    },
    isPending: false,
    isError: false,
    error: null as Error | null,
  },
}));

vi.mock('@/components/layout/Header', () => ({
  Header: ({
    title,
    subtitle,
    actions,
  }: {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="header">
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {actions ? <div>{actions}</div> : null}
    </div>
  ),
}));

vi.mock('@/hooks/useReconciliationWorkspaceQuery', () => ({
  useReconciliationWorkspaceQuery: () => workspaceQueryState,
}));

vi.mock('@/hooks/useReconciliationWindow', () => ({
  useReconciliationWindow: () => ({
    window: {
      presetId: 'window_default' as const,
      startDate: '2026-04-01',
      endDate: null,
      label: '01/04/2026 em diante',
    },
    presetId: 'window_default' as const,
    setPresetId: vi.fn(),
    persistUserWindowStart: vi.fn(),
    userWindowStart: '2026-04-01',
    isLoading: false,
    presets: [
      { id: 'window_default' as const, label: 'Abril/26 em diante', helper: '' },
      { id: 'last_30d' as const, label: 'Últimos 30 dias', helper: '' },
      { id: 'last_90d' as const, label: 'Últimos 90 dias', helper: '' },
      { id: 'all_time' as const, label: 'Tudo (histórico)', helper: '', historical: true },
    ],
  }),
  RECONCILIATION_WINDOW_PRESETS: [
    { id: 'window_default' as const, label: 'Abril/26 em diante', helper: '' },
    { id: 'last_30d' as const, label: 'Últimos 30 dias', helper: '' },
    { id: 'last_90d' as const, label: 'Últimos 90 dias', helper: '' },
    { id: 'all_time' as const, label: 'Tudo (histórico)', helper: '', historical: true },
  ],
}));

vi.mock('@/hooks/useAccountsQuery', () => ({
  useAccountsQuery: () => ({
    accounts: [],
    loading: false,
  }),
}));

vi.mock('@/hooks/usePayableBillsQuery', () => ({
  usePayableBillsQuery: () => ({
    bills: [],
    loading: false,
  }),
}));

vi.mock('@/hooks/useReconciliationMutations', () => ({
  useReconciliationMutations: () => ({
    applyDecision: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
    syncPluggy: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
    importTransactions: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
  }),
}));

vi.mock('@/hooks/useReconciliationImport', () => ({
  useReconciliationImport: () => ({
    mode: 'paste',
    setMode: vi.fn(),
    pasteText: '',
    setPasteText: vi.fn(),
    pasteCount: 0,
    selectedFileName: null,
    preview: null,
    manualDraft: { description: '', amount: '', date: '', accountName: '' },
    setManualDraft: vi.fn(),
    handlePasteAnalyze: vi.fn(),
    handleCsvSelected: vi.fn(),
    handleManualPreview: vi.fn(),
    handleImport: vi.fn(),
    importPending: false,
    canImport: false,
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
    formatDate: (value: string) => value,
    formatDateTime: (value: string) => value,
  }),
}));

afterEach(() => {
  cleanup();
  workspaceQueryState.data = {
    cases: [
      {
        id: 'case-1',
        user_id: 'u-1',
        bank_transaction_id: 'bt-1',
        divergence_type: 'pending_bill_paid_in_bank',
        matched_record_type: 'payable_bill',
        matched_record_id: 'pb-1',
        confidence: 0.92,
        confidence_reasoning: {},
        hypotheses: [],
        status: 'open',
        priority: 'urgent',
        auto_close_reason: null,
        resolved_at: null,
        resolved_by: null,
        created_at: '2026-04-14T10:00:00Z',
        updated_at: '2026-04-14T10:00:00Z',
      },
    ],
    connections: [],
    bankTransactions: [],
    summary: {
      pendingUnmatchedValue: 0,
      pendingUnmatchedCount: 0,
      openCases: 1,
      highConfidenceCount: 1,
      unmatchedCount: 0,
      staleConnections: 0,
      activeSources: ['manual', 'pluggy'],
      priorityBreakdown: { urgent: 1, high: 0, medium: 0, low: 0, infra: 0 },
      ingestionHealth: {
        totalIngested: 10,
        inScopeCount: 8,
        outOfScopeCount: 2,
        pendingInScope: 1,
        reconciledInScope: 5,
        archivedInScope: 2,
        lastPluggySyncAt: '2026-04-14T09:00:00Z',
        staleConnections: 0,
      },
      window: {
        presetId: 'window_default',
        startDate: '2026-04-01',
        endDate: null,
        label: '01/04/2026 em diante',
      },
    },
    selectedCase: null,
    auditEntries: [],
  };
  workspaceQueryState.isPending = false;
  workspaceQueryState.isError = false;
  workspaceQueryState.error = null;
});

describe('Reconciliation page shell', () => {
  it('renders all structural sections from the approved mockup', () => {
    render(
      <MemoryRouter initialEntries={['/conciliacao']}>
        <Reconciliation />
      </MemoryRouter>,
    );

    // Header title
    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByText(/Central de Concili/i)).toBeTruthy();

    // Section nav pills
    expect(screen.getByRole('tab', { name: /Resumo/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Inbox/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Hist/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Conex/i })).toBeTruthy();

    // 3 ingestion action buttons
    expect(screen.getByText('Colar extrato')).toBeTruthy();
    expect(screen.getByText('Upload CSV')).toBeTruthy();
    expect(screen.getByText('Sincronizar Pluggy')).toBeTruthy();

    // Summary deck after H2 hierarchy refactor: hero + 2 secondary cards,
    // "Conexoes em risco" moved to the context ribbon badge, "Fonte ativa"
    // retired entirely because the ribbon already shows connection source.
    expect(screen.getByText(/Valor sem correspondencia/i)).toBeTruthy();
    expect(screen.getByText(/abertas/i)).toBeTruthy();
    expect(screen.getByText(/Alta conf/i)).toBeTruthy();
    expect(screen.queryByText(/Fonte ativa/i)).toBeNull();

    // Inbox panel with header + filter chips
    expect(screen.getByText('Inbox priorizada')).toBeTruthy();
    expect(screen.getByText(/na fila/i)).toBeTruthy();
    expect(screen.getAllByText('fonte').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('tipo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('prioridade').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/confi/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('conta').length).toBeGreaterThanOrEqual(1);

    // Case rendered in inbox with priority grouping + divergence badge
    expect(screen.getAllByText('Urgente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('pago no banco')).toBeTruthy();

    // Case workspace
    expect(screen.getByText(/Caso aberto/i)).toBeTruthy();
    expect(screen.getByText(/Ana Clara/i)).toBeTruthy();

    // Right rail panels. After H4 (aside condicional), the connection status
    // panel only renders when there's an actual stale-connection warning or
    // the active case itself is infra-flavored. For the happy path fixture
    // (staleConnections: 0 and no infra case active) we expect it to be hidden.
    expect(screen.getByText('Contexto do caso')).toBeTruthy();
    expect(screen.getByText('Timeline / audit trail')).toBeTruthy();
    expect(screen.queryByText(/Status de conex/i)).toBeNull();
  });

  it('shows explicit infrastructure error instead of an empty workspace', () => {
    workspaceQueryState.data = null;
    workspaceQueryState.isError = true;
    workspaceQueryState.error = new Error(
      'Infraestrutura da conciliacao indisponivel: public.reconciliation_cases nao existe no ambiente remoto.',
    );

    render(
      <MemoryRouter initialEntries={['/conciliacao']}>
        <Reconciliation />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Infraestrutura da conciliacao indisponivel/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/reconciliation_cases/i)).toBeTruthy();
    expect(screen.queryByText(/Nenhum caso na fila/i)).toBeNull();
  });
});
