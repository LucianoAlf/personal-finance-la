import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  normalizeBankDescription,
  scoreReconciliationCandidates,
  similarity,
} from './reconciliation-matcher.ts';

Deno.test('scoreReconciliationCandidates emits a strong bill match for debito automatico', () => {
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
  assertEquals((result.bestMatch?.confidence ?? 0) >= 0.85, true);
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

  assertEquals((result.bestMatch?.confidence ?? 1) < 0.85, true);
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

Deno.test('normalizeBankDescription strips DEBITO AUTOMATICO prefix', () => {
  const result = normalizeBankDescription('DEBITO AUTOMATICO AMIL');
  assertEquals(result.method, 'debit_auto');
  assertEquals(result.core, 'amil');
});

Deno.test('normalizeBankDescription strips accents and lowercases', () => {
  const result = normalizeBankDescription('PAGAMENTO ENERGIA SÃO PAULO');
  assertEquals(result.method, 'payment');
  assertEquals(result.core, 'energia sao paulo');
});

Deno.test('normalizeBankDescription detects PIX ENVIADO with counterpart', () => {
  const result = normalizeBankDescription('PIX ENVIADO JOAO S');
  assertEquals(result.method, 'pix_sent');
  assertEquals(result.isPix, true);
  assertEquals(result.counterpart, 'joao s');
});

Deno.test('normalizeBankDescription detects PIX RECEBIDO with counterpart', () => {
  const result = normalizeBankDescription('PIX RECEBIDO MARIA DA SILVA');
  assertEquals(result.method, 'pix_received');
  assertEquals(result.isPix, true);
  assertEquals(result.counterpart, 'maria da silva');
});

Deno.test('normalizeBankDescription strips COMPRA prefix', () => {
  const result = normalizeBankDescription('COMPRA NO DEBITO IFOOD RESTAURANT');
  assertEquals(result.method, 'purchase');
  assertEquals(result.core, 'ifood restaurant');
});

Deno.test('normalizeBankDescription falls back to other for unrecognized prefix', () => {
  const result = normalizeBankDescription('MENSALIDADE COLEGIO');
  assertEquals(result.method, 'other');
  assertEquals(result.core, 'mensalidade colegio');
});

Deno.test('similarity aligns DEB AUT AMIL with Amil via normalization', () => {
  const score = similarity('DEB AUT AMIL', 'Amil');
  assertEquals(score >= 0.8, true);
});

Deno.test('similarity aligns PIX ENVIADO JOAO with Joao Silva via normalization', () => {
  const score = similarity('PIX ENVIADO JOAO', 'Joao Silva');
  assertEquals(score >= 0.3, true);
});

Deno.test('scoreReconciliationCandidates penalizes PIX match when counterpart differs from bill', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -320,
      date: '2026-04-11',
      description: 'PIX ENVIADO JOAO S',
      sourceHealth: 'healthy',
    },
    payables: [
      { id: 'bill-1', amount: 320, due_date: '2026-04-10', description: 'Amil' },
    ],
    transactions: [],
    accounts: [],
  });

  // amount + date alinham, mas description (Amil) não bate com contraparte PIX (Joao).
  // Matcher deve rebaixar pra não criar falso positivo.
  if (result.bestMatch) {
    assertEquals(result.bestMatch.confidence < 0.85, true);
  } else {
    assertEquals(result.hypotheses.length >= 1, true);
  }
});

Deno.test('scoreReconciliationCandidates prioritizes transferência hypothesis when PIX sem bill', () => {
  const result = scoreReconciliationCandidates({
    bankTransaction: {
      amount: -1500,
      date: '2026-04-12',
      description: 'PIX ENVIADO CONTA PROPRIA',
      sourceHealth: 'healthy',
    },
    payables: [],
    transactions: [],
    accounts: [],
  });

  assertEquals(result.bestMatch, null);
  const transferHypothesis = result.hypotheses.find((h) => h.label === 'transferência');
  assertEquals(!!transferHypothesis, true);
  // Com marcador PIX, confidence da hipótese de transferência deve ser reforçada.
  assertEquals((transferHypothesis?.confidence ?? 0) >= 0.5, true);
});
