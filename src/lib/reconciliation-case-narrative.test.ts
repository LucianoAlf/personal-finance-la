import { describe, expect, it } from 'vitest';

import type { BankTransactionRow, ReconciliationCaseRow } from '@/types/reconciliation';
import type { PayableBill } from '@/types/payable-bills.types';

import { buildCaseNarrative, classifyBankDescription } from './reconciliation-case-narrative';

const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
const formatDate = (value: string) => value;

const baseCase: ReconciliationCaseRow = {
  id: 'case-1',
  user_id: 'user-1',
  bank_transaction_id: 'bt-1',
  divergence_type: 'unmatched_bank_transaction',
  matched_record_type: null,
  matched_record_id: null,
  confidence: 0,
  confidence_reasoning: {},
  hypotheses: [],
  status: 'open',
  priority: 'medium',
  auto_close_reason: null,
  resolved_at: null,
  resolved_by: null,
  created_at: '',
  updated_at: '',
};

const baseBankTransaction: BankTransactionRow = {
  id: 'bt-1',
  user_id: 'user-1',
  source: 'pluggy',
  source_item_id: 'item-itau',
  external_id: 'ext-1',
  account_name: 'Itau corrente',
  external_account_id: 'acc-1',
  internal_account_id: null,
  amount: -85,
  date: '2026-04-14',
  description: 'PIX ENVIADO JOAO S',
  raw_description: 'PIX ENVIADO JOAO S',
};

describe('classifyBankDescription', () => {
  it('classifies PIX outgoing', () => {
    expect(classifyBankDescription('PIX ENVIADO MARIA').kind).toBe('pix');
    expect(classifyBankDescription('PIX ENVIADO MARIA').label).toMatch(/PIX/);
  });

  it('classifies TED/DOC as transfer', () => {
    expect(classifyBankDescription('TED EMITIDA NUBANK').kind).toBe('transfer');
    expect(classifyBankDescription('DOC CRED').kind).toBe('transfer');
  });

  it('classifies debito automatico', () => {
    expect(classifyBankDescription('DEBITO AUTOMATICO AMIL').kind).toBe('debit');
  });

  it('falls back to generic when description is empty', () => {
    expect(classifyBankDescription('').kind).toBe('generic');
    expect(classifyBankDescription(null).kind).toBe('generic');
  });
});

describe('buildCaseNarrative', () => {
  it('asks a PIX-specific question for unmatched PIX bank transactions', () => {
    const narrative = buildCaseNarrative({
      caseRow: baseCase,
      bankTransaction: baseBankTransaction,
      matchedPayableBill: null,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.mode).toBe('contextual_decision');
    expect(narrative.title).toMatch(/PIX enviado sem correspond/i);
    expect(narrative.contextualQuestion).toMatch(/PIX/);
    expect(narrative.contextualQuestion).toMatch(/pessoa|conta do sistema/i);
  });

  it('asks a TED/DOC question for unmatched transfers (no longer forces PIX copy)', () => {
    const narrative = buildCaseNarrative({
      caseRow: baseCase,
      bankTransaction: {
        ...baseBankTransaction,
        description: 'TED EMITIDA SUPPLIER 123',
        raw_description: 'TED EMITIDA SUPPLIER 123',
      },
      matchedPayableBill: null,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.title).toMatch(/Transfer/);
    expect(narrative.contextualQuestion).toMatch(/transfer/i);
    expect(narrative.contextualQuestion).not.toMatch(/PIX/i);
  });

  it('produces an amount_mismatch narrative with concrete delta', () => {
    const narrative = buildCaseNarrative({
      caseRow: {
        ...baseCase,
        divergence_type: 'amount_mismatch',
        matched_record_type: 'payable_bill',
        matched_record_id: 'pb-1',
        confidence: 0.78,
      },
      bankTransaction: {
        ...baseBankTransaction,
        amount: -1500,
        description: 'DEBITO AUTOMATICO AMIL',
        raw_description: 'DEBITO AUTOMATICO AMIL',
      },
      matchedPayableBill: {
        id: 'pb-1',
        user_id: 'user-1',
        description: 'Amil',
        amount: 1200,
        due_date: '2026-04-14',
        status: 'pending',
      } as unknown as PayableBill,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.mode).toBe('contextual_decision');
    expect(narrative.title).toMatch(/Diverg.*valor/i);
    expect(narrative.anaHunch).toMatch(/R\$ 1500\.00/);
    expect(narrative.anaHunch).toMatch(/R\$ 1200\.00/);
    expect(narrative.anaHunch).toMatch(/R\$ 300\.00/);
    expect(narrative.primaryActionLabel).toMatch(/valor do banco/i);
  });

  it('produces a date_mismatch narrative that names both dates', () => {
    const narrative = buildCaseNarrative({
      caseRow: {
        ...baseCase,
        divergence_type: 'date_mismatch',
        matched_record_type: 'payable_bill',
        matched_record_id: 'pb-1',
        confidence: 0.7,
      },
      bankTransaction: { ...baseBankTransaction, date: '2026-04-14' },
      matchedPayableBill: {
        id: 'pb-1',
        user_id: 'user-1',
        description: 'Amil',
        amount: 320,
        due_date: '2026-03-28',
        status: 'pending',
      } as unknown as PayableBill,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.title).toMatch(/Diverg.*data/i);
    expect(narrative.anaHunch).toMatch(/2026-04-14/);
    expect(narrative.anaHunch).toMatch(/2026-03-28/);
    expect(narrative.contextualQuestion).toMatch(/adiantado|atraso|ciclo/i);
  });

  it('emits a strong-match narrative (non-PIX) for pending_bill_paid_in_bank', () => {
    const narrative = buildCaseNarrative({
      caseRow: {
        ...baseCase,
        divergence_type: 'pending_bill_paid_in_bank',
        matched_record_type: 'payable_bill',
        matched_record_id: 'pb-1',
        confidence: 0.92,
      },
      bankTransaction: {
        ...baseBankTransaction,
        description: 'DEBITO AUTOMATICO AMIL',
        raw_description: 'DEBITO AUTOMATICO AMIL',
      },
      matchedPayableBill: {
        id: 'pb-1',
        user_id: 'user-1',
        description: 'Amil',
        amount: 320,
        due_date: '2026-04-10',
        status: 'pending',
      } as unknown as PayableBill,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.mode).toBe('strong_match');
    expect(narrative.contextualQuestion).toBeNull();
    expect(narrative.primaryActionLabel).toMatch(/Confirmar concili/i);
  });

  it('prefers the resolved displayAccountLabel over raw account_name to avoid codename leaks', () => {
    const narrative = buildCaseNarrative({
      caseRow: {
        ...baseCase,
        divergence_type: 'unmatched_bank_transaction',
      },
      bankTransaction: {
        ...baseBankTransaction,
        account_name: 'ultraviolet-black',
      },
      matchedPayableBill: null,
      matchedAccount: null,
      formatCurrency,
      formatDate,
      displayAccountLabel: 'Nubank \u2022 cartao final 1234',
    });

    expect(narrative.title).toContain('Nubank');
    expect(narrative.title).not.toContain('ultraviolet-black');
  });

  it('falls back to raw account_name only when displayAccountLabel is absent', () => {
    const narrative = buildCaseNarrative({
      caseRow: {
        ...baseCase,
        divergence_type: 'unmatched_bank_transaction',
      },
      bankTransaction: {
        ...baseBankTransaction,
        account_name: 'Itau corrente',
      },
      matchedPayableBill: null,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.title).toContain('Itau corrente');
  });

  it('routes stale_connection cases to infra_attention', () => {
    const narrative = buildCaseNarrative({
      caseRow: {
        ...baseCase,
        divergence_type: 'stale_connection',
      },
      bankTransaction: baseBankTransaction,
      matchedPayableBill: null,
      matchedAccount: null,
      formatCurrency,
      formatDate,
    });

    expect(narrative.mode).toBe('infra_attention');
    expect(narrative.primaryActionLabel).toMatch(/Abrir conex/i);
  });
});
