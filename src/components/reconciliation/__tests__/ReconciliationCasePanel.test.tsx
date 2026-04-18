/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { ReconciliationCasePanel } from '../ReconciliationCasePanel';

afterEach(() => {
  cleanup();
});

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
    formatDate: (value: string) => value,
    formatDateTime: (value: string) => value,
  }),
}));

const strongCase = {
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
};

const bankTransaction = {
  id: 'bt-1',
  user_id: 'u-1',
  source: 'pluggy',
  source_item_id: 'item-itau',
  external_id: 'tx-1234',
  account_name: 'Itau corrente',
  external_account_id: 'acc-1',
  internal_account_id: 'acc-int',
  amount: -320,
  date: '2026-04-11',
  description: 'DEBITO AUTOMATICO AMIL',
  raw_description: 'DEBITO AUTOMATICO AMIL',
};

const matchedBill = {
  id: 'pb-1',
  user_id: 'u-1',
  description: 'Amil',
  amount: 320,
  due_date: '2026-04-10',
  status: 'pending',
} as any;

describe('ReconciliationCasePanel', () => {
  it('renders strong match actions for high confidence case', () => {
    const onConfirm = vi.fn();

    render(
      <ReconciliationCasePanel
        activeCase={strongCase as any}
        bankTransaction={bankTransaction as any}
        matchedPayableBill={matchedBill}
        matchedAccount={null}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/Ana Clara/i)).toBeTruthy();
    expect(screen.getByText(/Resolucao proposta/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Confirmar/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders ambiguity workflow for unmatched PIX', () => {
    render(
      <ReconciliationCasePanel
        activeCase={{
          ...strongCase,
          divergence_type: 'unmatched_bank_transaction',
          matched_record_type: null,
          matched_record_id: null,
          confidence: 0.38,
          hypotheses: [
            { label: 'parece transferencia \/ pessoa', confidence: 0.38 },
            { label: 'sem match ainda (precisa de contexto)', confidence: 0.35 },
          ],
        } as any}
        bankTransaction={{
          ...bankTransaction,
          amount: -85,
          description: 'PIX ENVIADO JOAO S',
        } as any}
        matchedPayableBill={null}
        matchedAccount={null}
      />,
    );

    expect(screen.getByText(/Hip/i)).toBeTruthy();
    expect(screen.getByText(/Pergunta contextual/i)).toBeTruthy();
    expect(screen.getByText(/Responder e continuar/i)).toBeTruthy();
  });

  it('opens the transfer dialog, selects a counterpart and fires mark_transfer callback', () => {
    const onMarkTransfer = vi.fn();

    render(
      <ReconciliationCasePanel
        activeCase={{
          ...strongCase,
          divergence_type: 'unmatched_bank_transaction',
          matched_record_type: null,
          matched_record_id: null,
          confidence: 0.4,
          hypotheses: [],
        } as any}
        bankTransaction={{ ...bankTransaction, amount: -500, description: 'TED para minha poupanca' } as any}
        matchedPayableBill={null}
        matchedAccount={null}
        transferCandidates={[
          {
            bankTransaction: {
              ...bankTransaction,
              id: 'bt-in',
              amount: 500,
              description: 'TED recebida conta poupanca',
              account_name: 'Poupanca Itau',
              date: '2026-04-11',
            } as any,
            dayDistance: 0,
            score: 100,
          },
        ]}
        onMarkTransfer={onMarkTransfer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Marcar como transferencia interna/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/transferencia interna/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /Parear transferencia/i }));

    expect(onMarkTransfer).toHaveBeenCalledWith('bt-in');
  });

  it('single-leg marker fires mark_transfer with null when no candidate is picked', () => {
    const onMarkTransfer = vi.fn();

    render(
      <ReconciliationCasePanel
        activeCase={{
          ...strongCase,
          divergence_type: 'unmatched_bank_transaction',
          matched_record_type: null,
          matched_record_id: null,
          confidence: 0.4,
          hypotheses: [],
        } as any}
        bankTransaction={{ ...bankTransaction, amount: -500 } as any}
        matchedPayableBill={null}
        matchedAccount={null}
        transferCandidates={[]}
        onMarkTransfer={onMarkTransfer}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Marcar como transferencia interna/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: /Marcar este lado como transferencia/i }),
    );

    expect(onMarkTransfer).toHaveBeenCalledWith(null);
  });

  it('ignore flow captures reason text and sends it to the handler', () => {
    const onIgnore = vi.fn();

    render(
      <ReconciliationCasePanel
        activeCase={{
          ...strongCase,
          divergence_type: 'unmatched_bank_transaction',
          matched_record_type: null,
          matched_record_id: null,
          confidence: 0.4,
          hypotheses: [],
        } as any}
        bankTransaction={{ ...bankTransaction, amount: -12.5 } as any}
        matchedPayableBill={null}
        matchedAccount={null}
        onIgnoreTransaction={onIgnore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Nao reconheco \(ignorar\)/i }));
    const dialog = screen.getByRole('dialog');
    const textarea = within(dialog).getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'nao reconheco esse valor' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar como nao reconhecido/i }));

    expect(onIgnore).toHaveBeenCalledWith('nao reconheco esse valor');
  });

  it('ignore without reason calls handler with null', () => {
    const onIgnore = vi.fn();

    render(
      <ReconciliationCasePanel
        activeCase={{
          ...strongCase,
          divergence_type: 'unmatched_bank_transaction',
          matched_record_type: null,
          matched_record_id: null,
          confidence: 0.4,
          hypotheses: [],
        } as any}
        bankTransaction={{ ...bankTransaction, amount: -12.5 } as any}
        matchedPayableBill={null}
        matchedAccount={null}
        onIgnoreTransaction={onIgnore}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Nao reconheco \(ignorar\)/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Confirmar como nao reconhecido/i }));

    expect(onIgnore).toHaveBeenCalledWith(null);
  });
});
