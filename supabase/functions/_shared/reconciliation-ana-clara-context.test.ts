import { assertEquals, assertMatch } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildReconciliationContextForAnaClara } from './reconciliation-ana-clara-context.ts';

type Row = Record<string, unknown>;

/**
 * Fake supabase that supports the subset used by
 * `buildReconciliationContextForAnaClara`: select().eq().in().order().gte().lte().not().
 * Not a general-purpose mock; it lets us drive the exact flow this module uses.
 */
function createFakeSupabase(seed: {
  reconciliation_cases: Row[];
  bank_transactions: Row[];
  payable_bills?: Row[];
  accounts?: Row[];
}) {
  const tables: Record<string, Row[]> = {
    reconciliation_cases: seed.reconciliation_cases.map((r) => ({ ...r })),
    bank_transactions: seed.bank_transactions.map((r) => ({ ...r })),
    payable_bills: (seed.payable_bills ?? []).map((r) => ({ ...r })),
    accounts: (seed.accounts ?? []).map((r) => ({ ...r })),
  };

  function createQuery(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    const api = {
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      not(column: string, op: string, values: string) {
        if (op === 'in') {
          const parsed = values
            .replace(/^\(/, '')
            .replace(/\)$/, '')
            .split(',')
            .map((v) => v.trim().replace(/^"|"$/g, ''));
          filters.push((row) => !parsed.includes(row[column] as string));
        }
        return api;
      },
      gte(column: string, value: string) {
        filters.push((row) => String(row[column] ?? '') >= value);
        return api;
      },
      lte(column: string, value: string) {
        filters.push((row) => String(row[column] ?? '') <= value);
        return api;
      },
      order() {
        return api;
      },
      async then(resolve: (v: { data: Row[]; error: null }) => unknown) {
        const rows = tables[table].filter((r) => filters.every((f) => f(r))).map((r) => ({ ...r }));
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return api;
  }

  return {
    from: (table: string) => ({ select: (_cols?: string) => createQuery(table) }),
  } as unknown as SupabaseClient;
}

Deno.test('returns an empty prompt block when there are no open cases', async () => {
  const supabase = createFakeSupabase({ reconciliation_cases: [], bank_transactions: [] });
  const snapshot = await buildReconciliationContextForAnaClara(supabase, 'user-1');
  assertEquals(snapshot.totalOpen, 0);
  assertEquals(snapshot.cases.length, 0);
  assertEquals(snapshot.promptBlock, '');
});

Deno.test('surfaces a payable candidate as the lead hypothesis when amount + keyword align', async () => {
  const supabase = createFakeSupabase({
    reconciliation_cases: [
      {
        id: 'case-enel',
        user_id: 'user-1',
        bank_transaction_id: 'bt-enel',
        divergence_type: 'unmatched_bank_transaction',
        status: 'open',
        priority: 'high',
        confidence: 0.3,
        hypotheses: [],
        updated_at: '2026-04-12T12:00:00Z',
      },
    ],
    bank_transactions: [
      {
        id: 'bt-enel',
        user_id: 'user-1',
        account_name: 'Nubank',
        internal_account_id: 'acc-nubank',
        amount: -100,
        date: '2026-04-12',
        description: 'ENEL debito automatico',
        raw_description: null,
        category_suggestion: null,
        reconciliation_status: 'pending',
      },
    ],
    payable_bills: [
      {
        id: 'bill-enel',
        user_id: 'user-1',
        description: 'Conta de luz',
        provider_name: 'ENEL',
        amount: 100,
        due_date: '2026-04-10',
        status: 'pending',
        payment_account_id: null,
        category_id: null,
      },
      {
        id: 'bill-random',
        user_id: 'user-1',
        description: 'Aluguel',
        provider_name: 'Casa',
        amount: 1500,
        due_date: '2026-04-05',
        status: 'pending',
        payment_account_id: null,
        category_id: null,
      },
    ],
    accounts: [{ id: 'acc-nubank', name: 'Nubank PF' }],
  });

  const snapshot = await buildReconciliationContextForAnaClara(supabase, 'user-1');
  assertEquals(snapshot.totalOpen, 1);
  const [one] = snapshot.cases;
  assertEquals(one.caseId, 'case-enel');
  assertEquals(one.bank.accountLabel, 'Nubank PF');
  assertEquals(one.leadHypothesis?.action, 'link_payable');
  if (one.leadHypothesis?.params.kind !== 'link_payable') {
    throw new Error('expected link_payable params');
  }
  assertEquals(one.leadHypothesis.params.payableBillId, 'bill-enel');
  assertMatch(snapshot.promptBlock, /Reconciliacao bancaria pendente/);
  assertMatch(snapshot.promptBlock, /Conta de luz/);
  assertMatch(snapshot.promptBlock, /case_id=case-enel/);
});

Deno.test('falls back to register_expense + ignore when nothing matches', async () => {
  const supabase = createFakeSupabase({
    reconciliation_cases: [
      {
        id: 'case-orph',
        user_id: 'user-1',
        bank_transaction_id: 'bt-orph',
        divergence_type: 'unmatched_bank_transaction',
        status: 'open',
        priority: 'medium',
        confidence: 0.2,
        hypotheses: [],
        updated_at: '2026-04-12T12:00:00Z',
      },
    ],
    bank_transactions: [
      {
        id: 'bt-orph',
        user_id: 'user-1',
        account_name: 'Itau',
        internal_account_id: null,
        amount: -45.5,
        date: '2026-04-12',
        description: 'Farmacia sao joao',
        raw_description: null,
        category_suggestion: 'saude',
        reconciliation_status: 'pending',
      },
    ],
    payable_bills: [],
    accounts: [],
  });

  const snapshot = await buildReconciliationContextForAnaClara(supabase, 'user-1');
  const [one] = snapshot.cases;
  assertEquals(one.leadHypothesis?.action, 'register_expense');
  const ignore = one.alternatives.find((a) => a.action === 'ignore');
  if (!ignore) throw new Error('expected ignore alternative');
});

Deno.test('caps at the configured limit and sorts urgent first', async () => {
  const cases = Array.from({ length: 8 }, (_, i) => ({
    id: `case-${i}`,
    user_id: 'user-1',
    bank_transaction_id: `bt-${i}`,
    divergence_type: 'unmatched_bank_transaction',
    status: 'open',
    priority: i === 0 ? 'medium' : i < 3 ? 'high' : i < 6 ? 'urgent' : 'low',
    confidence: 0.2,
    hypotheses: [],
    updated_at: `2026-04-1${i}T12:00:00Z`,
  }));
  const bankTxs = Array.from({ length: 8 }, (_, i) => ({
    id: `bt-${i}`,
    user_id: 'user-1',
    account_name: 'Itau',
    internal_account_id: null,
    amount: -10 - i,
    date: `2026-04-${String(10 + i).padStart(2, '0')}`,
    description: `Mov ${i}`,
    raw_description: null,
    category_suggestion: null,
    reconciliation_status: 'pending',
  }));

  const supabase = createFakeSupabase({
    reconciliation_cases: cases,
    bank_transactions: bankTxs,
  });

  const snapshot = await buildReconciliationContextForAnaClara(supabase, 'user-1', { limit: 3 });
  assertEquals(snapshot.cases.length, 3);
  for (const c of snapshot.cases) assertEquals(c.priority, 'urgent');
  assertEquals(snapshot.byPriority.urgent, 3);
  assertEquals(snapshot.byPriority.high, 2);
  assertEquals(snapshot.byPriority.medium, 1);
  assertEquals(snapshot.byPriority.low, 2);
});

Deno.test('mark_transfer is surfaced when an opposite-sign counterpart exists within the window', async () => {
  const supabase = createFakeSupabase({
    reconciliation_cases: [
      {
        id: 'case-transf',
        user_id: 'user-1',
        bank_transaction_id: 'bt-out',
        divergence_type: 'unmatched_bank_transaction',
        status: 'open',
        priority: 'medium',
        confidence: 0.3,
        hypotheses: [],
        updated_at: '2026-04-12T12:00:00Z',
      },
    ],
    bank_transactions: [
      {
        id: 'bt-out',
        user_id: 'user-1',
        account_name: 'Itau',
        internal_account_id: null,
        amount: -500,
        date: '2026-04-12',
        description: 'Transferencia enviada',
        raw_description: null,
        category_suggestion: null,
        reconciliation_status: 'pending',
      },
      {
        id: 'bt-in',
        user_id: 'user-1',
        account_name: 'Nubank',
        internal_account_id: null,
        amount: 500,
        date: '2026-04-12',
        description: 'Transferencia recebida',
        raw_description: null,
        category_suggestion: null,
        reconciliation_status: 'pending',
      },
    ],
  });

  const snapshot = await buildReconciliationContextForAnaClara(supabase, 'user-1');
  const [one] = snapshot.cases;
  const transfer = [one.leadHypothesis, ...one.alternatives].find(
    (h) => h?.action === 'mark_transfer',
  );
  if (!transfer || transfer.params.kind !== 'mark_transfer') {
    throw new Error('expected a mark_transfer hypothesis referencing bt-in');
  }
  assertEquals(transfer.params.counterpartBankTransactionId, 'bt-in');
});
