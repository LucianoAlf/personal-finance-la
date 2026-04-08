import { describe, expect, it } from 'vitest';

import {
  getTagAssignmentTarget,
  getTaggableEntityTypeForTransactionRow,
  getTransactionWriteTarget,
} from '@/utils/tags/tag-assignment';
import type { Transaction } from '@/types/transactions';

describe('tag assignment routing', () => {
  it('routes bank transactions to transaction_tags', () => {
    expect(getTagAssignmentTarget({ entityType: 'transaction' })).toBe('transaction_tags');
  });

  it('routes credit card transactions to credit_card_transaction_tags', () => {
    expect(getTagAssignmentTarget({ entityType: 'credit_card_transaction' })).toBe(
      'credit_card_transaction_tags',
    );
  });

  it('routes payable bills to bill_tags', () => {
    expect(getTagAssignmentTarget({ entityType: 'payable_bill' })).toBe('bill_tags');
  });
});

describe('getTaggableEntityTypeForTransactionRow', () => {
  it('treats missing row as bank/manual transaction', () => {
    expect(getTaggableEntityTypeForTransactionRow(undefined)).toBe('transaction');
  });

  it('routes credit card ledger rows to credit_card_transaction', () => {
    const cc: Transaction = {
      id: 'x',
      user_id: 'u',
      account_id: '',
      category_id: 'c',
      type: 'expense',
      amount: 1,
      description: 'd',
      transaction_date: '2026-01-01',
      is_paid: false,
      is_recurring: false,
      source: 'manual',
      created_at: '',
      updated_at: '',
      credit_card_id: 'card-1',
    };
    expect(getTaggableEntityTypeForTransactionRow(cc)).toBe('credit_card_transaction');
  });

  it('routes payment_method credit without credit_card_id to credit_card_transaction', () => {
    const cc: Transaction = {
      id: 'x',
      user_id: 'u',
      account_id: '',
      category_id: 'c',
      type: 'expense',
      amount: 1,
      description: 'd',
      transaction_date: '2026-01-01',
      is_paid: false,
      is_recurring: false,
      source: 'manual',
      created_at: '',
      updated_at: '',
      payment_method: 'credit',
    };
    expect(getTaggableEntityTypeForTransactionRow(cc)).toBe('credit_card_transaction');
  });

  it('routes normal bank row to transaction', () => {
    const bank: Transaction = {
      id: 'x',
      user_id: 'u',
      account_id: 'a',
      category_id: 'c',
      type: 'expense',
      amount: 1,
      description: 'd',
      transaction_date: '2026-01-01',
      is_paid: true,
      is_recurring: false,
      source: 'manual',
      created_at: '',
      updated_at: '',
    };
    expect(getTaggableEntityTypeForTransactionRow(bank)).toBe('transaction');
  });
});

describe('getTransactionWriteTarget', () => {
  it('creates a new bank/manual row when there is no existing entity id', () => {
    expect(getTransactionWriteTarget(undefined, null)).toEqual({
      mode: 'create',
      entityType: 'transaction',
    });
  });

  it('reuses the already-created manual transaction id after tag persistence fails', () => {
    expect(getTransactionWriteTarget(undefined, 'tx-created-earlier')).toEqual({
      mode: 'update',
      entityId: 'tx-created-earlier',
      entityType: 'transaction',
    });
  });

  it('updates the selected credit-card row instead of treating it as a bank transaction', () => {
    const cc: Transaction = {
      id: 'cc-1',
      user_id: 'u',
      account_id: '',
      category_id: 'c',
      type: 'expense',
      amount: 1,
      description: 'd',
      transaction_date: '2026-01-01',
      is_paid: false,
      is_recurring: false,
      source: 'manual',
      created_at: '',
      updated_at: '',
      credit_card_id: 'card-1',
    };

    expect(getTransactionWriteTarget(cc, null)).toEqual({
      mode: 'update',
      entityId: 'cc-1',
      entityType: 'credit_card_transaction',
    });
  });
});
