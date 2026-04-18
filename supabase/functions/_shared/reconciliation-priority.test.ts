import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { computeReconciliationPriority } from './reconciliation-priority.ts';

const NOW = '2026-04-16T12:00:00Z';

Deno.test('stale source always routes to infra regardless of amount or match', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: -12000,
      transactionDate: '2026-04-15',
      now: NOW,
      sourceHealth: 'stale',
      matchConfidence: 0,
    }),
    'infra',
  );

  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'pending_bill_paid_in_bank',
      amount: -320,
      transactionDate: '2026-04-10',
      now: NOW,
      sourceHealth: 'stale',
      matchConfidence: 0.92,
    }),
    'infra',
  );
});

Deno.test('unmatched bank transaction no longer defaults to urgent', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: -120,
      transactionDate: '2026-04-10',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0,
    }),
    'medium',
  );
});

Deno.test('unmatched tiny amounts go to low instead of flooding the inbox with urgents', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: -12.5,
      transactionDate: '2026-04-15',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0,
    }),
    'low',
  );
});

Deno.test('unmatched ancient transactions degrade to low', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: -800,
      transactionDate: '2026-01-01',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0,
    }),
    'low',
  );
});

Deno.test('unmatched large and recent is urgent', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: -9800,
      transactionDate: '2026-04-14',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0,
    }),
    'urgent',
  );
});

Deno.test('unmatched mid-value recent is high', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'unmatched_bank_transaction',
      amount: -2200,
      transactionDate: '2026-04-10',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0,
    }),
    'high',
  );
});

Deno.test('amount_mismatch on high-value bill is urgent even with confirmed match', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'amount_mismatch',
      amount: -1500,
      transactionDate: '2026-04-14',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0.82,
    }),
    'urgent',
  );
});

Deno.test('pending_bill_paid_in_bank strong match is medium (confirm-when-you-can)', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'pending_bill_paid_in_bank',
      amount: -320,
      transactionDate: '2026-04-14',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0.95,
    }),
    'medium',
  );
});

Deno.test('date_mismatch with material amount is high', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'date_mismatch',
      amount: -2500,
      transactionDate: '2026-04-10',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0.7,
    }),
    'high',
  );
});

Deno.test('possible_duplicate flagged as high even on small amount', () => {
  assertEquals(
    computeReconciliationPriority({
      divergenceType: 'possible_duplicate',
      amount: -45,
      transactionDate: '2026-04-15',
      now: NOW,
      sourceHealth: 'healthy',
      matchConfidence: 0.6,
    }),
    'high',
  );
});
