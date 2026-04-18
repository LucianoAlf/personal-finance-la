/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ReconciliationInbox } from '../ReconciliationInbox';

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`,
    formatDate: (value: string) => {
      if (!value || value.length < 10) return value;
      const [y, m, d] = value.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    },
    formatDateTime: (value: string) => value,
  }),
}));

afterEach(() => {
  cleanup();
});

const cases = [
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
    created_at: '',
    updated_at: '',
  },
  {
    id: 'case-2',
    user_id: 'u-1',
    bank_transaction_id: 'bt-2',
    divergence_type: 'unmatched_bank_transaction',
    matched_record_type: null,
    matched_record_id: null,
    confidence: 0.38,
    confidence_reasoning: {},
    hypotheses: [],
    status: 'open',
    priority: 'high',
    auto_close_reason: null,
    resolved_at: null,
    resolved_by: null,
    created_at: '',
    updated_at: '',
  },
] as const;

const bankTransactions = [
  {
    id: 'bt-1',
    user_id: 'u-1',
    source: 'pluggy',
    source_item_id: 'item-itau',
    external_id: 'tx-1',
    account_name: 'Itau corrente',
    external_account_id: 'acc-1',
    internal_account_id: null,
    amount: -320,
    date: '2026-04-11',
    description: 'DEBITO AUTOMATICO AMIL',
    raw_description: 'DEBITO AUTOMATICO AMIL',
  },
  {
    id: 'bt-2',
    user_id: 'u-1',
    source: 'manual_paste',
    source_item_id: 'paste-1',
    external_id: null,
    account_name: 'Nubank',
    external_account_id: null,
    internal_account_id: null,
    amount: -85,
    date: '2026-04-09',
    description: 'PIX ENVIADO JOAO S',
    raw_description: 'PIX ENVIADO JOAO S',
  },
] as const;

describe('ReconciliationInbox', () => {
  it('groups cases by severity, shows operational subtitles, and notifies selection', () => {
    const onSelectCase = vi.fn();

    render(
      <ReconciliationInbox
        cases={[...cases] as any}
        bankTransactions={[...bankTransactions] as any}
        activeCaseId="case-1"
        onSelectCase={onSelectCase}
      />,
    );

    expect(screen.getAllByText(/Urgente/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Alta/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/pago no banco/i)).toBeTruthy();
    expect(screen.getByText(/sem match/i)).toBeTruthy();
    expect(screen.getByText(/pluggy .* Itau corrente .* 11\/04\/2026/i)).toBeTruthy();
    expect(screen.getByText(/manual .* Nubank .* 09\/04\/2026/i)).toBeTruthy();

    fireEvent.click(screen.getByText(/PIX enviado sem par no sistema/i));
    expect(onSelectCase).toHaveBeenCalledWith('case-2');
  });

  it('humanizes the case title per divergence type and bank description (no more Unmatched bank transaction wall)', () => {
    render(
      <ReconciliationInbox
        cases={[...cases] as any}
        bankTransactions={[...bankTransactions] as any}
        activeCaseId={null}
        onSelectCase={() => undefined}
      />,
    );

    expect(screen.queryByText(/Unmatched bank transaction/i)).toBeNull();
    expect(screen.getByText(/PIX enviado sem par no sistema/i)).toBeTruthy();
    expect(screen.getByText(/Pagamento refletido no banco/i)).toBeTruthy();
  });
});
