import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { applyReconciliationDecision, type ApplyReconciliationInput } from './index.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Row = Record<string, unknown>;

/**
 * Minimal in-memory fake that mirrors the chains used by `reconciliation-action`.
 * Supports select().eq().eq().single()/.maybeSingle(), select().eq().eq().in().order().limit().maybeSingle(),
 * update().eq().eq() and insert(). Any table and row shape is accepted so we can reuse it for
 * confirm/reject/mark_transfer/ignore tests.
 */
function createFakeSupabase(initial: {
  cases: Row[];
  bank_transactions: Row[];
  payable_bills?: Row[];
  transactions?: Row[];
  failAuditInsert?: boolean;
  failBankUpdateForAction?: string;
  insertedTransactionId?: string;
}) {
  const tables: Record<string, Row[]> = {
    reconciliation_cases: initial.cases.map((row) => ({ ...row })),
    bank_transactions: initial.bank_transactions.map((row) => ({ ...row })),
    payable_bills: (initial.payable_bills ?? []).map((row) => ({ ...row })),
    transactions: (initial.transactions ?? []).map((row) => ({ ...row })),
    reconciliation_audit_log: [],
  };
  let txIdCounter = 0;

  function createQuery(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let order: { column: string; ascending: boolean } | null = null;
    let limit: number | null = null;

    const api = {
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      order(column: string, opts?: { ascending: boolean }) {
        order = { column, ascending: opts?.ascending ?? true };
        return api;
      },
      limit(count: number) {
        limit = count;
        return api;
      },
      apply(): Row[] {
        let rows = tables[table].filter((row) => filters.every((predicate) => predicate(row)));
        if (order) {
          const { column, ascending } = order;
          rows = [...rows].sort((a, b) => {
            const av = a[column];
            const bv = b[column];
            if (av === bv) return 0;
            if (av === undefined || av === null) return ascending ? -1 : 1;
            if (bv === undefined || bv === null) return ascending ? 1 : -1;
            return (av as string | number) < (bv as string | number) ? (ascending ? -1 : 1) : ascending ? 1 : -1;
          });
        }
        if (limit !== null) rows = rows.slice(0, limit);
        return rows.map((row) => ({ ...row }));
      },
      async single() {
        const rows = api.apply();
        if (rows.length === 0) return { data: null, error: { code: 'PGRST116', message: 'not found' } };
        return { data: rows[0], error: null };
      },
      async maybeSingle() {
        const rows = api.apply();
        return { data: rows[0] ?? null, error: null };
      },
      then(resolve: (value: { data: Row[]; error: null }) => unknown) {
        return Promise.resolve({ data: api.apply(), error: null }).then(resolve);
      },
    };
    return api;
  }

  function from(table: string) {
    return {
      select: (_cols?: string) => createQuery(table),
      insert: (row: Row | Row[]) => {
        if (table === 'reconciliation_audit_log' && initial.failAuditInsert) {
          // Still expose chained API so callers that do insert().select().single()
          // do not blow up; return empty rows with the audit error.
          const failingApi = {
            async single() {
              return { data: null, error: { message: 'insert failed' } };
            },
            async maybeSingle() {
              return { data: null, error: { message: 'insert failed' } };
            },
            select: () => failingApi,
            then(resolve: (value: { data: null; error: { message: string } }) => unknown) {
              return Promise.resolve({ data: null, error: { message: 'insert failed' } }).then(
                resolve,
              );
            },
          };
          return failingApi;
        }
        const rows = Array.isArray(row) ? row : [row];
        const materialized = rows.map((r) => {
          const next = { ...r };
          if (table === 'transactions' && next.id === undefined) {
            txIdCounter += 1;
            next.id = `tx-${txIdCounter}`;
          }
          return next;
        });
        tables[table].push(...materialized);

        const insertApi = {
          async single() {
            return { data: materialized[0] ?? null, error: null };
          },
          async maybeSingle() {
            return { data: materialized[0] ?? null, error: null };
          },
          select: (_cols?: string) => insertApi,
          then(resolve: (value: { data: Row[]; error: null }) => unknown) {
            return Promise.resolve({ data: materialized, error: null }).then(resolve);
          },
        };
        return insertApi;
      },
      update: (patch: Row) => {
        const filters: Array<(row: Row) => boolean> = [];
        const api = {
          eq(column: string, value: unknown) {
            filters.push((row) => row[column] === value);
            return api;
          },
          then(resolve: (value: { data: null; error: unknown }) => unknown) {
            if (
              initial.failBankUpdateForAction &&
              table === 'bank_transactions' &&
              (patch as Record<string, unknown>).reconciliation_status === 'reconciled'
            ) {
              return Promise.resolve({
                data: null,
                error: { message: `forced bank update failure for ${initial.failBankUpdateForAction}` },
              }).then(resolve);
            }
            const affected = tables[table].filter((row) =>
              filters.every((predicate) => predicate(row)),
            );
            for (const row of affected) {
              Object.assign(row, patch);
            }
            return Promise.resolve({ data: null, error: null }).then(resolve);
          },
        };
        return api;
      },
      delete: () => {
        const filters: Array<(row: Row) => boolean> = [];
        const api = {
          eq(column: string, value: unknown) {
            filters.push((row) => row[column] === value);
            return api;
          },
          then(resolve: (value: { data: null; error: null }) => unknown) {
            tables[table] = tables[table].filter(
              (row) => !filters.every((predicate) => predicate(row)),
            );
            return Promise.resolve({ data: null, error: null }).then(resolve);
          },
        };
        return api;
      },
    };
  }

  return {
    supabase: { from } as unknown as SupabaseClient,
    tables,
  };
}

function baseCase(overrides: Row = {}): Row {
  return {
    id: 'case-1',
    user_id: 'user-1',
    status: 'open',
    confidence: 0.5,
    bank_transaction_id: 'bt-1',
    resolved_at: null,
    resolved_by: null,
    auto_close_reason: null,
    ...overrides,
  };
}

function baseBankTx(overrides: Row = {}): Row {
  return {
    id: 'bt-1',
    user_id: 'user-1',
    amount: -100,
    description: 'Test',
    source: 'pluggy',
    account_name: 'Conta teste',
    date: '2026-04-14',
    reconciliation_status: 'pending',
    transfer_pair_id: null,
    ...overrides,
  };
}

Deno.test('confirm writes link + audit but does not mutate payable financial state', async () => {
  const { supabase } = createFakeSupabase({
    cases: [baseCase()],
    bank_transactions: [baseBankTx()],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-1',
    action: 'confirm',
    confirmationSource: 'workspace',
  });

  assertEquals(result.outcome, 'confirmed');
  assertEquals(result.financialMutationPerformed, false);
  assertEquals(result.auditEntry.action, 'linked');
});

Deno.test('auto-close writes visible audit entry instead of silently dropping the case', async () => {
  const { supabase } = createFakeSupabase({
    cases: [baseCase({ id: 'case-2', bank_transaction_id: 'bt-2', confidence: 0.91 })],
    bank_transactions: [baseBankTx({ id: 'bt-2', amount: -50 })],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-2',
    action: 'auto_close',
    reason: 'underlying payable already updated externally',
  });

  assertEquals(result.outcome, 'auto_closed');
  assertEquals(result.auditEntry.notes, 'underlying payable already updated externally');
  assertEquals(result.auditEntry.action, 'auto_closed');
});

Deno.test('audit insert failure rolls back case update', async () => {
  const { supabase } = createFakeSupabase({
    cases: [baseCase()],
    bank_transactions: [baseBankTx()],
    failAuditInsert: true,
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-1',
        action: 'confirm',
        confirmationSource: 'workspace',
      } satisfies ApplyReconciliationInput),
    Error,
    'Audit persistence failed; case not finalized',
  );
});

Deno.test('mark_transfer pairs the two legs, closes both cases, flags both bank rows', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [
      baseCase({ id: 'case-A', bank_transaction_id: 'bt-out' }),
      baseCase({ id: 'case-B', bank_transaction_id: 'bt-in', status: 'open' }),
    ],
    bank_transactions: [
      baseBankTx({ id: 'bt-out', amount: -500, description: 'Transf saida' }),
      baseBankTx({ id: 'bt-in', amount: 500, description: 'Transf entrada' }),
    ],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-A',
    action: 'mark_transfer',
    counterpartBankTransactionId: 'bt-in',
  });

  assertEquals(result.outcome, 'auto_closed');
  assertEquals(result.auditEntry.action, 'marked_transfer');
  if (!result.transferPair) throw new Error('expected transferPair payload');
  assertEquals(result.transferPair.primaryBankTransactionId, 'bt-out');
  assertEquals(result.transferPair.counterpartBankTransactionId, 'bt-in');
  assertEquals(result.transferPair.counterpartCaseId, 'case-B');

  const bankOut = tables.bank_transactions.find((row) => row.id === 'bt-out');
  const bankIn = tables.bank_transactions.find((row) => row.id === 'bt-in');
  assertEquals(bankOut?.reconciliation_status, 'transfer_matched');
  assertEquals(bankIn?.reconciliation_status, 'transfer_matched');
  assertEquals(bankOut?.transfer_pair_id, bankIn?.transfer_pair_id);

  const caseA = tables.reconciliation_cases.find((row) => row.id === 'case-A');
  const caseB = tables.reconciliation_cases.find((row) => row.id === 'case-B');
  assertEquals(caseA?.status, 'auto_closed');
  assertEquals(caseB?.status, 'auto_closed');
  assertEquals(
    (caseA?.auto_close_reason as string).startsWith('internal_transfer_pair:'),
    true,
  );
});

Deno.test('mark_transfer rejects same-sign counterpart', async () => {
  const { supabase } = createFakeSupabase({
    cases: [baseCase({ id: 'case-A', bank_transaction_id: 'bt-out' })],
    bank_transactions: [
      baseBankTx({ id: 'bt-out', amount: -500 }),
      baseBankTx({ id: 'bt-other', amount: -500 }),
    ],
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-A',
        action: 'mark_transfer',
        counterpartBankTransactionId: 'bt-other',
      }),
    Error,
    'opposite sign',
  );
});

Deno.test('mark_transfer rejects mismatched value', async () => {
  const { supabase } = createFakeSupabase({
    cases: [baseCase({ id: 'case-A', bank_transaction_id: 'bt-out' })],
    bank_transactions: [
      baseBankTx({ id: 'bt-out', amount: -500 }),
      baseBankTx({ id: 'bt-in', amount: 250 }),
    ],
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-A',
        action: 'mark_transfer',
        counterpartBankTransactionId: 'bt-in',
      }),
    Error,
    'amount must match',
  );
});

Deno.test('mark_transfer without counterpart flags single leg awaiting pairing', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-A', bank_transaction_id: 'bt-out' })],
    bank_transactions: [baseBankTx({ id: 'bt-out', amount: -500 })],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-A',
    action: 'mark_transfer',
  });

  assertEquals(result.outcome, 'auto_closed');
  assertEquals(result.transferPair?.counterpartBankTransactionId, null);
  const caseA = tables.reconciliation_cases.find((row) => row.id === 'case-A');
  assertEquals(
    (caseA?.auto_close_reason as string).startsWith('internal_transfer_single_leg:'),
    true,
  );
  const bankOut = tables.bank_transactions.find((row) => row.id === 'bt-out');
  assertEquals(bankOut?.reconciliation_status, 'transfer_matched');
});

Deno.test('ignore marks bank row as ignored and closes case with unrecognized reason', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-I', bank_transaction_id: 'bt-I' })],
    bank_transactions: [baseBankTx({ id: 'bt-I', amount: -33 })],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-I',
    action: 'ignore',
    reason: 'nao reconheco esse lancamento',
  });

  assertEquals(result.outcome, 'auto_closed');
  assertEquals(result.auditEntry.action, 'ignored');
  const caseI = tables.reconciliation_cases.find((row) => row.id === 'case-I');
  assertEquals(caseI?.auto_close_reason, 'nao reconheco esse lancamento');
  const bankI = tables.bank_transactions.find((row) => row.id === 'bt-I');
  assertEquals(bankI?.reconciliation_status, 'ignored');
});

Deno.test('ignore without reason falls back to unrecognized_by_operator tag', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-I2', bank_transaction_id: 'bt-I2' })],
    bank_transactions: [baseBankTx({ id: 'bt-I2', amount: -11 })],
  });

  await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-I2',
    action: 'ignore',
  });

  const caseI2 = tables.reconciliation_cases.find((row) => row.id === 'case-I2');
  assertEquals(caseI2?.auto_close_reason, 'unrecognized_by_operator');
});

function basePayable(overrides: Row = {}): Row {
  return {
    id: 'bill-1',
    user_id: 'user-1',
    description: 'Enel abril',
    amount: 100,
    status: 'pending',
    paid_at: null,
    paid_amount: null,
    payment_account_id: null,
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

Deno.test('link_payable flips the bill to paid, reconciles the bank row and closes the case', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-L', bank_transaction_id: 'bt-L' })],
    bank_transactions: [baseBankTx({ id: 'bt-L', amount: -100, internal_account_id: 'acc-1' })],
    payable_bills: [basePayable({ id: 'bill-L', amount: 100 })],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-L',
    action: 'link_payable',
    payableBillId: 'bill-L',
  });

  assertEquals(result.outcome, 'confirmed');
  assertEquals(result.auditEntry.action, 'linked_payable');
  assertEquals(result.linkedPayable?.payableBillId, 'bill-L');
  assertEquals(result.linkedPayable?.paidAmount, 100);

  const bill = tables.payable_bills.find((row) => row.id === 'bill-L');
  assertEquals(bill?.status, 'paid');
  assertEquals(bill?.paid_amount, 100);
  assertEquals(bill?.payment_account_id, 'acc-1');

  const bank = tables.bank_transactions.find((row) => row.id === 'bt-L');
  assertEquals(bank?.reconciliation_status, 'reconciled');

  const caseL = tables.reconciliation_cases.find((row) => row.id === 'case-L');
  assertEquals(caseL?.status, 'confirmed');
  assertEquals(caseL?.matched_record_type, 'payable_bill');
  assertEquals(caseL?.matched_record_id, 'bill-L');
  assertEquals(caseL?.auto_close_reason, 'linked_to_payable:bill-L');
});

Deno.test('link_payable tolerates small amount divergence (5 percent) but rejects larger drift', async () => {
  const okSetup = createFakeSupabase({
    cases: [baseCase({ id: 'case-L1', bank_transaction_id: 'bt-L1' })],
    bank_transactions: [baseBankTx({ id: 'bt-L1', amount: -103 })], // +3% vs 100 expected
    payable_bills: [basePayable({ id: 'bill-L1', amount: 100 })],
  });
  await applyReconciliationDecision(okSetup.supabase, {
    userId: 'user-1',
    caseId: 'case-L1',
    action: 'link_payable',
    payableBillId: 'bill-L1',
  });
  assertEquals(
    okSetup.tables.payable_bills.find((row) => row.id === 'bill-L1')?.status,
    'paid',
  );

  const badSetup = createFakeSupabase({
    cases: [baseCase({ id: 'case-L2', bank_transaction_id: 'bt-L2' })],
    bank_transactions: [baseBankTx({ id: 'bt-L2', amount: -250 })],
    payable_bills: [basePayable({ id: 'bill-L2', amount: 100 })],
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(badSetup.supabase, {
        userId: 'user-1',
        caseId: 'case-L2',
        action: 'link_payable',
        payableBillId: 'bill-L2',
      }),
    Error,
    'beyond 5% tolerance',
  );
  assertEquals(
    badSetup.tables.payable_bills.find((row) => row.id === 'bill-L2')?.status,
    'pending',
  );
});

Deno.test('link_payable refuses to re-pay an already-paid bill', async () => {
  const { supabase } = createFakeSupabase({
    cases: [baseCase({ id: 'case-L3', bank_transaction_id: 'bt-L3' })],
    bank_transactions: [baseBankTx({ id: 'bt-L3', amount: -100 })],
    payable_bills: [basePayable({ id: 'bill-L3', amount: 100, status: 'paid', paid_amount: 100 })],
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-L3',
        action: 'link_payable',
        payableBillId: 'bill-L3',
      }),
    Error,
    'already marked as paid',
  );
});

Deno.test('link_payable without payableBillId is rejected before touching any row', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-L4', bank_transaction_id: 'bt-L4' })],
    bank_transactions: [baseBankTx({ id: 'bt-L4', amount: -100 })],
    payable_bills: [basePayable({ id: 'bill-L4', amount: 100 })],
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-L4',
        action: 'link_payable',
      }),
    Error,
    'payableBillId is required',
  );

  const bill = tables.payable_bills.find((row) => row.id === 'bill-L4');
  assertEquals(bill?.status, 'pending');
});

Deno.test('link_payable rolls back payable + bank row when audit insert fails', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-L5', bank_transaction_id: 'bt-L5' })],
    bank_transactions: [baseBankTx({ id: 'bt-L5', amount: -100 })],
    payable_bills: [basePayable({ id: 'bill-L5', amount: 100 })],
    failAuditInsert: true,
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-L5',
        action: 'link_payable',
        payableBillId: 'bill-L5',
      }),
    Error,
    'Audit persistence failed',
  );

  const bill = tables.payable_bills.find((row) => row.id === 'bill-L5');
  assertEquals(bill?.status, 'pending');
  assertEquals(bill?.paid_amount ?? null, null);

  const bank = tables.bank_transactions.find((row) => row.id === 'bt-L5');
  assertEquals(bank?.reconciliation_status, 'pending');

  const caseL5 = tables.reconciliation_cases.find((row) => row.id === 'case-L5');
  assertEquals(caseL5?.status, 'open');
});

Deno.test('register_expense creates a transaction, reconciles bank row and links case', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-R', bank_transaction_id: 'bt-R' })],
    bank_transactions: [
      baseBankTx({
        id: 'bt-R',
        amount: -47.9,
        description: 'Farmacia',
        date: '2026-04-10',
        internal_account_id: 'acc-nubank',
      }),
    ],
  });

  const result = await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-R',
    action: 'register_expense',
    registerExpense: { categoryId: 'cat-saude', paymentMethod: 'pix' },
  });

  assertEquals(result.outcome, 'confirmed');
  assertEquals(result.auditEntry.action, 'registered_expense');
  assertEquals(result.registeredExpense?.accountId, 'acc-nubank');
  assertEquals(result.registeredExpense?.amount, 47.9);

  const inserted = tables.transactions[0];
  assertEquals(inserted?.type, 'expense');
  assertEquals(inserted?.amount, 47.9);
  assertEquals(inserted?.account_id, 'acc-nubank');
  assertEquals(inserted?.category_id, 'cat-saude');
  assertEquals(inserted?.payment_method, 'pix');
  assertEquals(inserted?.source, 'bank_reconciliation');
  assertEquals(inserted?.transaction_date, '2026-04-10');
  assertEquals(inserted?.description, 'Farmacia');

  const bank = tables.bank_transactions.find((row) => row.id === 'bt-R');
  assertEquals(bank?.reconciliation_status, 'reconciled');

  const caseR = tables.reconciliation_cases.find((row) => row.id === 'case-R');
  assertEquals(caseR?.status, 'confirmed');
  assertEquals(caseR?.matched_record_type, 'transaction');
  assertEquals(typeof caseR?.matched_record_id, 'string');
});

Deno.test('register_expense rejects when no account is available', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-R2', bank_transaction_id: 'bt-R2' })],
    bank_transactions: [baseBankTx({ id: 'bt-R2', amount: -10, internal_account_id: null })],
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-R2',
        action: 'register_expense',
      }),
    Error,
    'register_expense requires an accountId',
  );

  assertEquals(tables.transactions.length, 0);
});

Deno.test('register_expense deletes the phantom transaction when audit insert fails', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-R3', bank_transaction_id: 'bt-R3' })],
    bank_transactions: [
      baseBankTx({ id: 'bt-R3', amount: -89, internal_account_id: 'acc-x' }),
    ],
    failAuditInsert: true,
  });

  await assertRejects(
    () =>
      applyReconciliationDecision(supabase, {
        userId: 'user-1',
        caseId: 'case-R3',
        action: 'register_expense',
      }),
    Error,
    'Audit persistence failed',
  );

  assertEquals(tables.transactions.length, 0);
  const bank = tables.bank_transactions.find((row) => row.id === 'bt-R3');
  assertEquals(bank?.reconciliation_status, 'pending');
});

Deno.test('register_expense uses description override when provided', async () => {
  const { supabase, tables } = createFakeSupabase({
    cases: [baseCase({ id: 'case-R4', bank_transaction_id: 'bt-R4' })],
    bank_transactions: [
      baseBankTx({
        id: 'bt-R4',
        amount: -30,
        description: 'PIX SENDOUT ana',
        internal_account_id: 'acc-x',
      }),
    ],
  });

  await applyReconciliationDecision(supabase, {
    userId: 'user-1',
    caseId: 'case-R4',
    action: 'register_expense',
    registerExpense: { description: 'Reembolso Ana Clara' },
  });

  assertEquals(tables.transactions[0]?.description, 'Reembolso Ana Clara');
});
