import { assertEquals, assertMatch } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { handleAwaitingReconciliationDecisionReply } from './reconciliation-confirm-handler.ts';
import type { PendingReconciliationDecision } from './reconciliation-confirmation.ts';

function basePending(overrides: Partial<PendingReconciliationDecision> = {}): PendingReconciliationDecision {
  return {
    caseId: 'c-1',
    action: 'link_payable',
    payload: { payableBillId: 'bill-enel' },
    summary: 'vincular a "Conta de luz" (R$ 100,00, venc 10/04)',
    caseHeadline: 'R$ 100,00 em 12/04 na Nubank (ENEL)',
    phone: '5511',
    createdAt: '2026-04-17T12:00:00Z',
    expiresAt: '2026-04-17T12:10:00Z',
    ...overrides,
  };
}

Deno.test('confirm happy path: invokes action, clears context, returns success text', async () => {
  const invokes: Array<{ caseId: string; action: string; payload: Record<string, unknown> }> = [];
  const cleared: string[] = [];

  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'sim',
    userId: 'user-1',
    pending: basePending(),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async (args) => {
      invokes.push(args);
      return { ok: true };
    },
    limparContexto: async (userId) => {
      cleared.push(userId);
    },
    salvarContexto: async () => {
      throw new Error('should not save on confirm');
    },
  });

  assertEquals(invokes.length, 1);
  assertEquals(invokes[0]!.caseId, 'c-1');
  assertEquals(invokes[0]!.action, 'link_payable');
  assertEquals(invokes[0]!.payload.payableBillId, 'bill-enel');
  assertEquals(cleared, ['user-1']);
  assertMatch(msg, /pronto|vinculei|feito|paga/i);
});

Deno.test('decline: clears context without invoking', async () => {
  const invokes: unknown[] = [];
  const cleared: string[] = [];

  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'cancela',
    userId: 'user-1',
    pending: basePending(),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async (...args) => {
      invokes.push(args);
      return { ok: true };
    },
    limparContexto: async (u) => {
      cleared.push(u);
    },
    salvarContexto: async () => {},
  });
  assertEquals(invokes.length, 0);
  assertEquals(cleared, ['user-1']);
  assertMatch(msg, /ok|beleza|cancelei|deixei pra la/i);
});

Deno.test('defer: clears context with friendly message', async () => {
  const cleared: string[] = [];
  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'depois',
    userId: 'user-1',
    pending: basePending(),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async () => ({ ok: true }),
    limparContexto: async (u) => {
      cleared.push(u);
    },
    salvarContexto: async () => {},
  });
  assertEquals(cleared, ['user-1']);
  assertMatch(msg, /depois|mais tarde|quando quiser/i);
});

Deno.test('ambiguous: keeps context and re-asks', async () => {
  const saved: Array<{ userId: string; type: string; data: unknown; phone: string }> = [];
  const cleared: string[] = [];
  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'me fala mais sobre isso',
    userId: 'user-1',
    pending: basePending(),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async () => ({ ok: true }),
    limparContexto: async (u) => {
      cleared.push(u);
    },
    salvarContexto: async (userId, type, data, phone) => {
      saved.push({ userId, type, data, phone });
    },
  });

  assertEquals(cleared.length, 0);
  assertEquals(saved.length, 1);
  assertEquals(saved[0]!.type, 'awaiting_reconciliation_decision_confirm');
  assertMatch(msg, /sim.*nao|pode.*cancela|me diz|confirma/i);
});

Deno.test('expired preview: refuses to invoke, clears context, asks the user to start over', async () => {
  const invokes: unknown[] = [];
  const cleared: string[] = [];
  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'sim',
    userId: 'user-1',
    pending: basePending({ expiresAt: '2026-04-17T12:04:00Z' }),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async (...args) => {
      invokes.push(args);
      return { ok: true };
    },
    limparContexto: async (u) => {
      cleared.push(u);
    },
    salvarContexto: async () => {},
  });
  assertEquals(invokes.length, 0);
  assertEquals(cleared, ['user-1']);
  assertMatch(msg, /expirou|passou muito tempo|de novo/i);
});

Deno.test('topic shift: releases context and returns empty string (falls through to NLP)', async () => {
  const cleared: string[] = [];
  const invokes: unknown[] = [];
  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'qual meu saldo?',
    userId: 'user-1',
    pending: basePending(),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async (...args) => {
      invokes.push(args);
      return { ok: true };
    },
    limparContexto: async (u) => {
      cleared.push(u);
    },
    salvarContexto: async () => {},
    detectTopicShift: (t) => /saldo|gastei/i.test(t),
  });
  assertEquals(msg, '');
  assertEquals(cleared, ['user-1']);
  assertEquals(invokes.length, 0);
});

Deno.test('error from reconciliation-action: clears context and reports the reason', async () => {
  const cleared: string[] = [];
  const msg = await handleAwaitingReconciliationDecisionReply({
    texto: 'sim',
    userId: 'user-1',
    pending: basePending(),
    now: () => '2026-04-17T12:05:00Z',
    invokeReconciliationAction: async () => ({ ok: false, error: 'boleto ja estava pago' }),
    limparContexto: async (u) => {
      cleared.push(u);
    },
    salvarContexto: async () => {},
  });
  assertEquals(cleared, ['user-1']);
  assertMatch(msg, /nao consegui|ops|erro|ja estava/i);
});
