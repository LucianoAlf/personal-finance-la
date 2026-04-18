import { assertEquals, assertMatch } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { handleReconciliationIntent } from './reconciliation-handler.ts';
import type {
  AnaClaraReconciliationCase,
  AnaClaraReconciliationSnapshot,
  ReconciliationPriority,
} from '../_shared/reconciliation-ana-clara-context.ts';

/**
 * The handler takes a SnapshotBuilder and a FunctionInvoker as ports, so the
 * tests can drive the full decision tree deterministically without touching
 * supabase or the real reconciliation-action function. This mirrors the
 * accounts-safe-actions pattern (small handlers + injected dependencies).
 */

function emptyByPriority(): Record<ReconciliationPriority, number> {
  return { urgent: 0, high: 0, medium: 0, low: 0, infra: 0 };
}

function buildFakeSnapshot(overrides: Partial<AnaClaraReconciliationSnapshot> = {}): AnaClaraReconciliationSnapshot {
  return {
    totalOpen: 0,
    byPriority: emptyByPriority(),
    cases: [],
    promptBlock: '',
    ...overrides,
  };
}

function fakeCase(partial: Partial<AnaClaraReconciliationCase> & { caseId: string }): AnaClaraReconciliationCase {
  return {
    caseId: partial.caseId,
    bankTransactionId: partial.bankTransactionId ?? 'bt-' + partial.caseId,
    divergenceType: partial.divergenceType ?? 'unmatched_bank_transaction',
    priority: partial.priority ?? 'high',
    confidence: partial.confidence ?? 0.3,
    bank: partial.bank ?? {
      amount: -100,
      date: '2026-04-12',
      description: 'Generic mov',
      accountLabel: 'Nubank',
      isDebit: true,
    },
    headline: partial.headline ?? 'R$ 100,00 em 12/04 na Nubank',
    leadHypothesis: partial.leadHypothesis ?? null,
    alternatives: partial.alternatives ?? [],
  };
}

Deno.test('ASK with no open cases: reassures the user and does not dispatch', async () => {
  const replies: string[] = [];
  const invokes: unknown[] = [];

  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'ASK_RECONCILIATION',
    content: 'tem algo para eu conferir?',
    entities: {},
    buildSnapshot: async () => buildFakeSnapshot(),
    invokeReconciliationAction: async (...args) => {
      invokes.push(args);
      return { ok: true };
    },
    sendReply: async (t) => {
      replies.push(t);
    },
  });

  assertEquals(invokes.length, 0);
  assertEquals(replies.length, 1);
  // Reassure message should explicitly say "nothing to review" — anything else
  // would scare the user into thinking we lost the snapshot.
  assertMatch(replies[0]!, /tudo em dia|tudo certo|nenhum caso|nada pendente/i);
});

Deno.test('ASK with 2 open cases: sends a compact list with action hints', async () => {
  const replies: string[] = [];
  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'ASK_RECONCILIATION',
    content: 'o que tem pendente?',
    entities: {},
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 2,
        byPriority: { ...emptyByPriority(), high: 2 },
        cases: [
          fakeCase({
            caseId: 'c-1',
            bank: {
              amount: -100,
              date: '2026-04-12',
              description: 'ENEL debito automatico',
              accountLabel: 'Nubank PF',
              isDebit: true,
            },
            headline: 'R$ 100,00 em 12/04 na Nubank PF (ENEL debito automatico)',
            leadHypothesis: {
              action: 'link_payable',
              summary: 'Vincular a "Conta de luz" (venc 10/04)',
              score: 0.7,
              params: {
                kind: 'link_payable',
                payableBillId: 'bill-enel',
                billDescription: 'Conta de luz',
                billAmount: 100,
                billDueDate: '2026-04-10',
              },
            },
          }),
          fakeCase({
            caseId: 'c-2',
            bank: {
              amount: -45.5,
              date: '2026-04-12',
              description: 'Farmacia sao joao',
              accountLabel: 'Itau',
              isDebit: true,
            },
            headline: 'R$ 45,50 em 12/04 na Itau (Farmacia sao joao)',
            leadHypothesis: {
              action: 'register_expense',
              summary: 'Registrar como despesa em "Itau"',
              score: 0.4,
              params: { kind: 'register_expense', accountId: null, suggestedCategory: 'saude' },
            },
          }),
        ],
        promptBlock: '...',
      }),
    invokeReconciliationAction: async () => ({ ok: true }),
    sendReply: async (t) => {
      replies.push(t);
    },
  });

  assertEquals(replies.length, 1);
  const msg = replies[0]!;
  assertMatch(msg, /2 .*(caso|pend|reconcil)/i);
  assertMatch(msg, /ENEL|Conta de luz/i);
  assertMatch(msg, /Farmacia/i);
  assertMatch(msg, /me diz|confirma|quer que eu|posso/i);
});

Deno.test('DECIDE link_payable with saveDecisionContext: saves pending + asks for confirmation (no dispatch yet)', async () => {
  const replies: string[] = [];
  const invokes: Array<{ caseId: string; action: string; payload: Record<string, unknown> }> = [];
  const saved: Array<{ userId: string; phone: string; caseId: string; action: string; payload: unknown }> = [];

  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'DECIDE_RECONCILIATION',
    content: 'pode vincular, sim',
    entities: { case_id: 'c-1', reconciliation_action: 'link_payable' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), high: 1 },
        cases: [
          fakeCase({
            caseId: 'c-1',
            leadHypothesis: {
              action: 'link_payable',
              summary: 'vincular a "Conta de luz" (R$ 100,00, venc 10/04)',
              score: 0.8,
              params: {
                kind: 'link_payable',
                payableBillId: 'bill-enel',
                billDescription: 'Conta de luz',
                billAmount: 100,
                billDueDate: '2026-04-10',
              },
            },
          }),
        ],
      }),
    saveDecisionContext: async (userId, pending, phone) => {
      saved.push({
        userId,
        phone,
        caseId: pending.caseId,
        action: pending.action,
        payload: pending.payload,
      });
    },
    invokeReconciliationAction: async (args) => {
      invokes.push(args);
      return { ok: true };
    },
    now: () => '2026-04-17T12:00:00Z',
    sendReply: async (t) => {
      replies.push(t);
    },
  });

  // Critical: we MUST NOT dispatch yet — the confirmation flow takes over.
  assertEquals(invokes.length, 0);
  assertEquals(saved.length, 1);
  assertEquals(saved[0]!.caseId, 'c-1');
  assertEquals(saved[0]!.action, 'link_payable');
  assertEquals((saved[0]!.payload as Record<string, unknown>).payableBillId, 'bill-enel');
  assertEquals(replies.length, 1);
  assertMatch(replies[0]!, /sim.*nao|confirmar|cancelar/i);
  assertMatch(replies[0]!, /Conta de luz|vincular/i);
});

Deno.test('DECIDE link_payable WITHOUT saveDecisionContext: legacy direct-dispatch path is preserved', async () => {
  const replies: string[] = [];
  const invokes: Array<{ caseId: string; action: string; payload: Record<string, unknown> }> = [];

  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'DECIDE_RECONCILIATION',
    content: 'pode vincular',
    entities: { case_id: 'c-1', reconciliation_action: 'link_payable' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), high: 1 },
        cases: [
          fakeCase({
            caseId: 'c-1',
            leadHypothesis: {
              action: 'link_payable',
              summary: 'match forte',
              score: 0.8,
              params: {
                kind: 'link_payable',
                payableBillId: 'bill-enel',
                billDescription: 'Conta de luz',
                billAmount: 100,
                billDueDate: '2026-04-10',
              },
            },
          }),
        ],
      }),
    invokeReconciliationAction: async (args) => {
      invokes.push(args);
      return { ok: true };
    },
    sendReply: async (t) => {
      replies.push(t);
    },
  });

  assertEquals(invokes.length, 1);
  assertEquals(invokes[0]!.payload.payableBillId, 'bill-enel');
  assertMatch(replies[0]!, /vinculei|baixei|paga|pronto|feito/i);
});

Deno.test('DECIDE register_expense with confirmation: pre-builds payload on pending', async () => {
  const saved: Array<{ caseId: string; action: string; payload: Record<string, unknown> }> = [];
  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'DECIDE_RECONCILIATION',
    content: 'registra como despesa',
    entities: { case_id: 'c-1', reconciliation_action: 'register_expense' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), medium: 1 },
        cases: [
          fakeCase({
            caseId: 'c-1',
            priority: 'medium',
            leadHypothesis: {
              action: 'register_expense',
              summary: 'sem boleto',
              score: 0.4,
              params: { kind: 'register_expense', accountId: 'acc-itau', suggestedCategory: 'saude' },
            },
          }),
        ],
      }),
    saveDecisionContext: async (_userId, pending) => {
      saved.push({ caseId: pending.caseId, action: pending.action, payload: pending.payload });
    },
    invokeReconciliationAction: async () => ({ ok: true }),
    sendReply: async () => {},
  });

  assertEquals(saved.length, 1);
  assertEquals(saved[0]!.action, 'register_expense');
  const expense = saved[0]!.payload.registerExpense as Record<string, unknown> | undefined;
  if (!expense) throw new Error('expected registerExpense payload on pending');
  assertEquals(expense.accountId, 'acc-itau');
});

Deno.test('DECIDE mark_transfer with confirmation: pre-builds counterpartBankTransactionId on pending', async () => {
  const saved: Array<{ caseId: string; action: string; payload: Record<string, unknown> }> = [];
  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'DECIDE_RECONCILIATION',
    content: 'era transferencia interna',
    entities: { case_id: 'c-t', reconciliation_action: 'mark_transfer' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), medium: 1 },
        cases: [
          fakeCase({
            caseId: 'c-t',
            priority: 'medium',
            leadHypothesis: {
              action: 'mark_transfer',
              summary: 'leg oposta dentro do mesmo dia',
              score: 0.7,
              params: {
                kind: 'mark_transfer',
                counterpartBankTransactionId: 'bt-in',
                counterpartDescription: 'Transferencia recebida',
                counterpartDate: '2026-04-12',
              },
            },
          }),
        ],
      }),
    saveDecisionContext: async (_userId, pending) => {
      saved.push({ caseId: pending.caseId, action: pending.action, payload: pending.payload });
    },
    invokeReconciliationAction: async () => ({ ok: true }),
    sendReply: async () => {},
  });

  assertEquals(saved[0]!.action, 'mark_transfer');
  assertEquals(saved[0]!.payload.counterpartBankTransactionId, 'bt-in');
});

Deno.test('DECIDE ignore: dispatched directly (no confirmation required, low risk)', async () => {
  const invokes: Array<{ caseId: string; action: string; payload: Record<string, unknown> }> = [];
  const saved: unknown[] = [];
  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511',
    intent: 'DECIDE_RECONCILIATION',
    content: 'ignora isso',
    entities: { case_id: 'c-1', reconciliation_action: 'ignore' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), low: 1 },
        cases: [
          fakeCase({
            caseId: 'c-1',
            priority: 'low',
            leadHypothesis: {
              action: 'ignore',
              summary: 'fecha sem mexer',
              score: 0.2,
              params: { kind: 'ignore' },
            },
          }),
        ],
      }),
    saveDecisionContext: async (...args) => {
      saved.push(args);
    },
    invokeReconciliationAction: async (args) => {
      invokes.push(args);
      return { ok: true };
    },
    sendReply: async () => {},
  });
  // ignore is idempotent + does not move money, so it MUST bypass the
  // confirmation flow — otherwise the user has to answer "sim" twice for
  // what they already said "ignora" to.
  assertEquals(invokes.length, 1);
  assertEquals(invokes[0]!.action, 'ignore');
  assertEquals(saved.length, 0);
});

Deno.test('DECIDE for unknown case_id falls back to ASK-style listing without invoking', async () => {
  const replies: string[] = [];
  const invokes: unknown[] = [];

  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'DECIDE_RECONCILIATION',
    content: 'ignora',
    entities: { case_id: 'c-ghost', reconciliation_action: 'ignore' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), high: 1 },
        cases: [fakeCase({ caseId: 'c-real', leadHypothesis: null })],
      }),
    invokeReconciliationAction: async (...args) => {
      invokes.push(args);
      return { ok: true };
    },
    sendReply: async (t) => {
      replies.push(t);
    },
  });

  assertEquals(invokes.length, 0);
  assertMatch(replies[0]!, /nao (achei|encontrei)|qual|me diz/i);
});

Deno.test('DECIDE when the action does not match the case params degrades to a confirmation question', async () => {
  const replies: string[] = [];
  const invokes: unknown[] = [];
  await handleReconciliationIntent({
    supabase: {} as SupabaseClient,
    userId: 'user-1',
    phone: '5511999999999',
    intent: 'DECIDE_RECONCILIATION',
    content: 'vincula o boleto',
    // Snapshot has a register_expense hypothesis, but user asked link_payable.
    // Without a payable bill id to use, the handler must NOT invoke blindly.
    entities: { case_id: 'c-1', reconciliation_action: 'link_payable' },
    buildSnapshot: async () =>
      buildFakeSnapshot({
        totalOpen: 1,
        byPriority: { ...emptyByPriority(), medium: 1 },
        cases: [
          fakeCase({
            caseId: 'c-1',
            priority: 'medium',
            leadHypothesis: {
              action: 'register_expense',
              summary: 'sem boleto',
              score: 0.3,
              params: { kind: 'register_expense', accountId: 'acc-itau', suggestedCategory: null },
            },
            alternatives: [],
          }),
        ],
      }),
    invokeReconciliationAction: async (...args) => {
      invokes.push(args);
      return { ok: true };
    },
    sendReply: async (t) => {
      replies.push(t);
    },
  });
  assertEquals(invokes.length, 0);
  assertMatch(replies[0]!, /qual boleto|nao achei|me diz/i);
});
