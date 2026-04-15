import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { scoreReconciliationCandidates } from './reconciliation-matcher.ts';

Deno.test('scoreReconciliationCandidates emits a strong bill match for debit automatico', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -320,
      date: '2026-04-11',
      description: 'DEBITO AUTOMATICO AMIL',
      sourceHealth: 'healthy',
    },
    payables: [
      { id: 'bill-1', amount: 320, due_date: '2026-04-10', description: 'Amil' },
    ],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch?.recordId, 'bill-1');
  assertEquals(result.bestMatch?.confidence >= 0.85, true);
});

Deno.test('scoreReconciliationCandidates degrades confidence for stale source items', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -320,
      date: '2026-04-11',
      description: 'DEBITO AUTOMATICO AMIL',
      sourceHealth: 'stale',
    },
    payables: [{ id: 'bill-1', amount: 320, due_date: '2026-04-10', description: 'Amil' }],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch?.confidence < 0.85, true);
  assertEquals(result.bestMatch?.reasoning.sourceHealthPenalty, true);
});

Deno.test('scoreReconciliationCandidates returns hypotheses for ambiguous pix', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -85,
      date: '2026-04-09',
      description: 'PIX ENVIADO JOAO S',
      sourceHealth: 'healthy',
    },
    payables: [],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch, null);
  assertEquals(result.hypotheses.length >= 2, true);
});
