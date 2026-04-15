/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Reconciliation } from './Reconciliation';

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
  useReconciliationWorkspaceQuery: () => ({
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
      summary: {
        balanceDelta: 0,
        openCases: 1,
        highConfidenceCount: 1,
        staleConnections: 0,
        activeSources: ['manual', 'pluggy'],
      },
      selectedCase: null,
      auditEntries: [],
    },
    isPending: false,
    isError: false,
  }),
}));

afterEach(() => {
  cleanup();
});

describe('Reconciliation page shell', () => {
  it('renders all structural sections from the approved mockup', () => {
    render(
      <MemoryRouter initialEntries={['/conciliacao']}>
        <Reconciliation />
      </MemoryRouter>,
    );

    // Header title
    expect(screen.getByText('Central de Conciliação')).toBeTruthy();

    // Section nav pills
    expect(screen.getByText('Resumo')).toBeTruthy();
    expect(screen.getByText('Inbox')).toBeTruthy();
    expect(screen.getByText('Histórico')).toBeTruthy();
    expect(screen.getByText('Conexões')).toBeTruthy();

    // 3 ingestion action buttons
    expect(screen.getByText('Colar extrato')).toBeTruthy();
    expect(screen.getByText('Upload CSV')).toBeTruthy();
    expect(screen.getByText('Sincronizar Pluggy')).toBeTruthy();

    // 5 KPI cards
    expect(screen.getByText('Saldo sistema vs banco')).toBeTruthy();
    expect(screen.getByText('Pendências abertas')).toBeTruthy();
    expect(screen.getByText('Alta confiança')).toBeTruthy();
    expect(screen.getByText('Contas stale')).toBeTruthy();
    expect(screen.getByText('Fonte')).toBeTruthy();

    // Inbox panel with header + filter chips
    expect(screen.getByText('Inbox priorizada')).toBeTruthy();
    expect(screen.getByText('fila operacional')).toBeTruthy();
    expect(screen.getByText('fonte')).toBeTruthy();
    expect(screen.getByText('tipo')).toBeTruthy();
    expect(screen.getByText('prioridade')).toBeTruthy();
    expect(screen.getByText('confiança')).toBeTruthy();
    expect(screen.getByText('conta')).toBeTruthy();

    // Case rendered in inbox with priority grouping + divergence badge
    expect(screen.getAllByText('Urgente').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('pago no banco')).toBeTruthy();

    // Case workspace (empty state — no case selected yet)
    expect(screen.getByText('Caso aberto')).toBeTruthy();
    expect(screen.getByText('Selecione um item na inbox para comparar banco vs sistema.')).toBeTruthy();

    // Right rail panels
    expect(screen.getByText('Contexto do caso')).toBeTruthy();
    expect(screen.getByText('Timeline / audit trail')).toBeTruthy();
    expect(screen.getByText('Status de conexão')).toBeTruthy();
  });
});
