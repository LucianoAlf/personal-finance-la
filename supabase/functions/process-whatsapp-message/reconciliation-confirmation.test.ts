import { assertEquals, assert } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  parseReconciliationDecisionReply,
  buildReconciliationConfirmationPrompt,
  isExpiredReconciliationDecision,
  type PendingReconciliationDecision,
} from './reconciliation-confirmation.ts';

Deno.test('parseReconciliationDecisionReply: confirmations', () => {
  for (const phrase of [
    'sim',
    'Sim',
    'sim, confirmo',
    'confirmo',
    'pode',
    'pode sim',
    'manda ver',
    'isso',
    'isso mesmo',
    'certo',
    'ok',
    'okay',
    'beleza',
    'fecha',
    'pode fechar',
    'vai',
    'bora',
  ]) {
    assertEquals(parseReconciliationDecisionReply(phrase).kind, 'confirm', phrase);
  }
});

Deno.test('parseReconciliationDecisionReply: declines', () => {
  for (const phrase of [
    'nao',
    'Nao',
    'nao quero',
    'cancela',
    'cancelar',
    'cancela isso',
    'esquece',
    'deixa pra la',
    'nao, deixa',
    'nao faz',
    'desconsidera',
  ]) {
    assertEquals(parseReconciliationDecisionReply(phrase).kind, 'decline', phrase);
  }
});

Deno.test('parseReconciliationDecisionReply: defer', () => {
  for (const phrase of ['depois vejo', 'depois', 'mais tarde', 'amanha vejo']) {
    assertEquals(parseReconciliationDecisionReply(phrase).kind, 'defer', phrase);
  }
});

Deno.test('parseReconciliationDecisionReply: ambiguous falls through', () => {
  for (const phrase of [
    'qual o saldo?',
    'quanto gastei esse mes?',
    'registra 50 no mercado',
    'tem outra coisa?',
  ]) {
    const kind = parseReconciliationDecisionReply(phrase).kind;
    assertEquals(kind, 'ambiguous', `"${phrase}" parsed as ${kind}`);
  }
});

Deno.test('parseReconciliationDecisionReply: empty string is ambiguous', () => {
  assertEquals(parseReconciliationDecisionReply('').kind, 'ambiguous');
});

Deno.test('buildReconciliationConfirmationPrompt: renders preview + call to action', () => {
  const pending: PendingReconciliationDecision = {
    caseId: 'c-1',
    action: 'link_payable',
    payload: { payableBillId: 'bill-enel' },
    summary: 'vincular a "Conta de luz" (venc 10/04/2026, R$ 100,00)',
    caseHeadline: 'R$ 100,00 em 12/04 na Nubank (ENEL debito automatico)',
    createdAt: '2026-04-17T12:00:00Z',
    expiresAt: '2026-04-17T12:10:00Z',
    phone: '5511',
  };
  const prompt = buildReconciliationConfirmationPrompt(pending);
  assert(prompt.includes('ENEL') || prompt.includes('Conta de luz'), 'should include context');
  assert(/sim.*nao|confirmo.*cancel|pode.*deixa/i.test(prompt), 'should offer yes/no wording');
});

Deno.test('isExpiredReconciliationDecision: respects expiresAt', () => {
  const pending: PendingReconciliationDecision = {
    caseId: 'c-1',
    action: 'link_payable',
    payload: {},
    summary: 's',
    caseHeadline: 'h',
    createdAt: '2026-04-17T12:00:00Z',
    expiresAt: '2026-04-17T12:10:00Z',
    phone: '5511',
  };
  assertEquals(isExpiredReconciliationDecision(pending, '2026-04-17T12:09:59Z'), false);
  assertEquals(isExpiredReconciliationDecision(pending, '2026-04-17T12:10:00Z'), true);
  assertEquals(isExpiredReconciliationDecision(pending, '2026-04-17T12:11:00Z'), true);
});
