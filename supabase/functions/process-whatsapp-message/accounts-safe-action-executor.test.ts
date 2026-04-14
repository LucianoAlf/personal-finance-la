import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import type { PendingAccountsSafeAction } from './accounts-safe-actions.ts';
import { executePendingAccountsSafeAction } from './accounts-safe-action-executor.ts';

type FakeRow = Record<string, unknown>;
type FakeStore = {
  payable_bills?: FakeRow[];
  accounts?: FakeRow[];
  agent_action_log?: FakeRow[];
};
type FakeBehavior = {
  insertErrors?: Partial<Record<keyof FakeStore, string>>;
  selectErrors?: Partial<Record<keyof FakeStore, string>>;
};

const EXEC_USER_ID = 'user-1';
const DEFAULT_EXEC_CONTEXT = {
  userId: EXEC_USER_ID,
  now: '2026-04-11T10:03:00.000Z',
} as const;

const basePending = {
  anomalyType: 'overdue_without_settlement',
  diagnosticBasis: {
    conclusionKey: 'still_open',
    conclusionText: 'essa conta continua em aberto segundo o usuario',
    source: 'explicit_health_check',
  },
  confirmationPrompt:
    "Vou aplicar a alteracao segura para 'Celular (1/12)'. Confirma? (sim/nao)",
  confirmationText: 'sim',
  confirmationSource: 'explicit_yes',
  surfacedAt: '2026-04-11T10:00:00.000Z',
  previewExpiresAt: '2026-04-11T11:00:00.000Z',
  confirmedAt: '2026-04-11T10:02:00.000Z',
} as const;

function createPending(
  overrides: Partial<PendingAccountsSafeAction>,
): PendingAccountsSafeAction {
  return {
    ...basePending,
    actionType: 'reschedule_due_date',
    targetType: 'payable_bill',
    targetId: 'bill-1',
    before: { due_date: '2026-04-05', status: 'pending' },
    after: { due_date: '2026-04-20' },
    effectSummary:
      'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
    idempotencyKey: 'safe-key-1',
    ...overrides,
  };
}

function createFakeSafeActionSupabase(initial: FakeStore, behavior: FakeBehavior = {}) {
  const store = {
    payable_bills: structuredClone(initial.payable_bills ?? []),
    accounts: structuredClone(initial.accounts ?? []),
    agent_action_log: structuredClone(initial.agent_action_log ?? []),
  };

  const fake = {
    store,
    behavior,
    updateCalls: [] as Array<{ table: string; patch: Record<string, unknown>; filters: Array<{ column: string; value: unknown }> }>,
    from(table: keyof typeof store) {
      return new FakeQuery(fake, table);
    },
  };

  return fake;
}

function getAuditDetails(fake: ReturnType<typeof createFakeSafeActionSupabase>, index = -1) {
  const logs = fake.store.agent_action_log;
  const row = index >= 0 ? logs[index] : logs[logs.length - 1];
  return (row?.details ?? null) as Record<string, unknown> | null;
}

class FakeQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private mode: 'select' | 'update' | 'insert' = 'select';
  private patch: Record<string, unknown> | null = null;
  private insertPayload: FakeRow[] = [];
  private selectedColumns: string | null = null;

  constructor(
    private fake: ReturnType<typeof createFakeSafeActionSupabase>,
    private table: keyof ReturnType<typeof createFakeSafeActionSupabase>['store'],
  ) {}

  select(columns?: string) {
    this.selectedColumns = columns ?? null;
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.mode = 'update';
    this.patch = structuredClone(patch);
    return this;
  }

  insert(payload: FakeRow | FakeRow[]) {
    this.mode = 'insert';
    this.insertPayload = Array.isArray(payload)
      ? structuredClone(payload)
      : [structuredClone(payload)];
    return Promise.resolve(this.execute());
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  single() {
    const result = this.execute();
    if (result.error) return Promise.resolve(result);
    const row = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
    if (!row) {
      return Promise.resolve({
        data: null,
        error: { message: 'Row not found' },
      });
    }
    return Promise.resolve({ data: row, error: null });
  }

  maybeSingle() {
    const result = this.execute();
    if (result.error) return Promise.resolve(result);
    const row = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
    return Promise.resolve({ data: row, error: null });
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: null | { message: string } }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute() {
    if (this.mode === 'insert') {
      const insertError = this.fake.behavior.insertErrors?.[this.table];
      if (insertError) {
        return { data: null, error: { message: insertError } };
      }
      this.fake.store[this.table].push(...this.insertPayload.map((row) => structuredClone(row)));
      return { data: this.insertPayload, error: null };
    }

    const rows = this.fake.store[this.table].filter((row) =>
      this.filters.every(({ column, value }) => row[column] === value)
    );

    if (this.mode === 'select') {
      const selectError = this.fake.behavior.selectErrors?.[this.table];
      if (selectError) {
        return { data: null, error: { message: selectError } };
      }
    }

    if (this.mode === 'update') {
      for (const row of rows) {
        Object.assign(row, structuredClone(this.patch ?? {}));
      }
      this.fake.updateCalls.push({
        table: this.table,
        patch: structuredClone(this.patch ?? {}),
        filters: structuredClone(this.filters),
      });
      return { data: rows.map((row) => structuredClone(row)), error: null };
    }

    return { data: rows.map((row) => structuredClone(row)), error: null };
  }
}

Deno.test('aborts before writing when the before snapshot no longer matches relevant fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-22',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({}),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'dados mudaram');
});

Deno.test('pre-write validation does not accept a foreign record with the same target id', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'shared-bill-id',
        user_id: 'other-user',
        description: 'Conta Estranha',
        due_date: '2026-04-05',
        status: 'pending',
      },
      {
        id: 'shared-bill-id',
        user_id: EXEC_USER_ID,
        description: 'Minha Conta',
        due_date: '2026-04-22',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'shared-bill-id',
      idempotencyKey: 'scoped-read-prewrite-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'dados mudaram');
});

Deno.test('succeeds only after re-reading the persisted bill and matching after fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({}),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(fake.updateCalls.length, 1);
  assertEquals(fake.store.payable_bills[0].due_date, '2026-04-20');
  assertStringIncludes(result.message, 'Pronto.');

  const audit = getAuditDetails(fake);
  assertEquals(audit?.surfacedAt, '2026-04-11T10:00:00.000Z');
  assertEquals(audit?.previewExpiresAt, '2026-04-11T11:00:00.000Z');
  assertEquals(audit?.confirmedAt, '2026-04-11T10:02:00.000Z');
  assertEquals(typeof audit?.executedAt, 'string');
  assertEquals(typeof audit?.verifiedAt, 'string');
});

Deno.test('fails when the write path returns but the re-read still does not match after fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  fake.from = ((table: keyof typeof fake.store) => {
    const query = new FakeQuery(fake, table);
    const originalUpdate = query.update.bind(query);
    query.update = ((patch: Record<string, unknown>) => {
      const strippedPatch = { ...patch };
      delete strippedPatch.due_date;
      return originalUpdate(strippedPatch);
    }) as typeof query.update;
    return query;
  }) as typeof fake.from;

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'safe-key-post-write-fail' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_FAILED');
  assertEquals(fake.updateCalls.length, 1);
  assertStringIncludes(result.message, 'seguranca');
});

Deno.test('post-write verification does not succeed by reading another users record with the same target id', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'shared-bill-id-2',
        user_id: 'other-user',
        description: 'Conta Estranha',
        due_date: '2026-04-20',
        status: 'pending',
      },
      {
        id: 'shared-bill-id-2',
        user_id: EXEC_USER_ID,
        description: 'Minha Conta',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  fake.from = ((table: keyof typeof fake.store) => {
    const query = new FakeQuery(fake, table);
    const originalUpdate = query.update.bind(query);
    query.update = ((patch: Record<string, unknown>) => {
      const strippedPatch = { ...patch };
      delete strippedPatch.due_date;
      return originalUpdate(strippedPatch);
    }) as typeof query.update;
    return query;
  }) as typeof fake.from;

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'shared-bill-id-2',
      idempotencyKey: 'scoped-read-postwrite-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_FAILED');
  assertEquals(fake.updateCalls.length, 1);
  assertStringIncludes(result.message, 'seguranca');
});

Deno.test('returns idempotent success on duplicate confirmation replay without a second write', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          anomalyType: 'overdue_without_settlement',
          actionType: 'reschedule_due_date',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { due_date: '2026-04-05', status: 'pending' },
          after: { due_date: '2026-04-20' },
          effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
          diagnosticBasis: {
            conclusionKey: 'still_open',
            conclusionText: 'essa conta continua em aberto segundo o usuario',
            source: 'explicit_health_check',
          },
          confirmationPrompt:
            "Vou aplicar a alteracao segura para 'Celular (1/12)'. Confirma? (sim/nao)",
          confirmationText: 'sim',
          confirmationSource: 'explicit_yes',
          surfacedAt: '2026-04-11T10:00:00.000Z',
          previewExpiresAt: '2026-04-11T11:00:00.000Z',
          confirmedAt: '2026-04-11T10:02:00.000Z',
          idempotencyKey: 'same-key',
          executedAt: '2026-04-11T10:03:00.000Z',
          verifiedAt: '2026-04-11T10:03:01.000Z',
          executionResult: { ok: true },
          postWriteVerification: {
            ok: true,
            expectedAfter: { due_date: '2026-04-20' },
            actualAfter: { due_date: '2026-04-20' },
            lockedFields: { status: 'pending' },
            actualLockedFields: { status: 'pending' },
          },
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'same-key' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, true);
  assertEquals(fake.updateCalls.length, 0);
});

Deno.test('returns idempotent success from a fully audited replay row even when the current pending payload is malformed', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          anomalyType: 'overdue_without_settlement',
          actionType: 'reschedule_due_date',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { due_date: '2026-04-05', status: 'pending' },
          after: { due_date: '2026-04-20' },
          effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
          diagnosticBasis: {
            conclusionKey: 'still_open',
            conclusionText: 'essa conta continua em aberto segundo o usuario',
            source: 'explicit_health_check',
          },
          confirmationPrompt:
            "Vou aplicar a alteracao segura para 'Celular (1/12)'. Confirma? (sim/nao)",
          confirmationText: 'sim',
          confirmationSource: 'explicit_yes',
          surfacedAt: '2026-04-11T10:00:00.000Z',
          previewExpiresAt: '2026-04-11T11:00:00.000Z',
          confirmedAt: '2026-04-11T10:02:00.000Z',
          idempotencyKey: 'same-key-malformed-current-pending',
          executedAt: '2026-04-11T10:03:00.000Z',
          verifiedAt: '2026-04-11T10:03:01.000Z',
          executionResult: { ok: true },
          postWriteVerification: {
            ok: true,
            expectedAfter: { due_date: '2026-04-20' },
            actualAfter: { due_date: '2026-04-20' },
            lockedFields: { status: 'pending' },
            actualLockedFields: { status: 'pending' },
          },
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      idempotencyKey: 'same-key-malformed-current-pending',
      effectSummary: '',
      confirmationPrompt: '',
      diagnosticBasis: {
        conclusionKey: '',
        conclusionText: '',
        source: 'unknown' as never,
      },
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, true);
  assertEquals(fake.updateCalls.length, 0);
});

Deno.test('prefers a matching fully audited success replay over other same-key rows that would otherwise conflict', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          anomalyType: 'overdue_without_settlement',
          actionType: 'reschedule_due_date',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { due_date: '2026-04-05', status: 'pending' },
          after: { due_date: '2026-04-20' },
          effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
          diagnosticBasis: {
            conclusionKey: 'still_open',
            conclusionText: 'essa conta continua em aberto segundo o usuario',
            source: 'explicit_health_check',
          },
          confirmationPrompt:
            "Vou aplicar a alteracao segura para 'Celular (1/12)'. Confirma? (sim/nao)",
          confirmationText: 'sim',
          confirmationSource: 'explicit_yes',
          surfacedAt: '2026-04-11T10:00:00.000Z',
          previewExpiresAt: '2026-04-11T11:00:00.000Z',
          confirmedAt: '2026-04-11T10:02:00.000Z',
          idempotencyKey: 'same-key-mixed-rows',
          executedAt: '2026-04-11T10:03:00.000Z',
          verifiedAt: '2026-04-11T10:03:01.000Z',
          executionResult: { ok: true },
          postWriteVerification: {
            ok: true,
            expectedAfter: { due_date: '2026-04-20' },
            actualAfter: { due_date: '2026-04-20' },
            lockedFields: { status: 'pending' },
            actualLockedFields: { status: 'pending' },
          },
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          actionType: 'update_amount',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { amount: 99 },
          after: { amount: 120 },
          idempotencyKey: 'same-key-mixed-rows',
          finalState: 'SAFE_ACTION_ABORTED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'same-key-mixed-rows' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, true);
  assertEquals(fake.updateCalls.length, 0);
});

Deno.test('does not return idempotent replay success when the prior succeeded row is missing required audit completeness fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          actionType: 'reschedule_due_date',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { due_date: '2026-04-05', status: 'pending' },
          after: { due_date: '2026-04-20' },
          idempotencyKey: 'same-key-incomplete-replay',
          effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'same-key-incomplete-replay' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, undefined);
  assertEquals(fake.updateCalls.length, 1);
});

Deno.test('does not return idempotent replay success when the prior succeeded row has an invalid confirmation source', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          anomalyType: 'overdue_without_settlement',
          actionType: 'reschedule_due_date',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { due_date: '2026-04-05', status: 'pending' },
          after: { due_date: '2026-04-20' },
          effectSummary: 'Ela deixa de aparecer como vencida agora e passa a vencer na nova data.',
          diagnosticBasis: {
            conclusionKey: 'still_open',
            conclusionText: 'essa conta continua em aberto segundo o usuario',
            source: 'explicit_health_check',
          },
          confirmationPrompt:
            "Vou aplicar a alteracao segura para 'Celular (1/12)'. Confirma? (sim/nao)",
          confirmationText: 'sim',
          confirmationSource: 'freeform_yes',
          surfacedAt: '2026-04-11T10:00:00.000Z',
          previewExpiresAt: '2026-04-11T11:00:00.000Z',
          confirmedAt: '2026-04-11T10:02:00.000Z',
          idempotencyKey: 'same-key-invalid-replay-source',
          executedAt: '2026-04-11T10:03:00.000Z',
          verifiedAt: '2026-04-11T10:03:01.000Z',
          executionResult: { ok: true },
          postWriteVerification: {
            ok: true,
            expectedAfter: { due_date: '2026-04-20' },
            actualAfter: { due_date: '2026-04-20' },
            lockedFields: { status: 'pending' },
            actualLockedFields: { status: 'pending' },
          },
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'same-key-invalid-replay-source' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, undefined);
  assertEquals(fake.updateCalls.length, 1);
});

Deno.test('fails safe before write when idempotency lookup cannot be read, and audits the abort when audit persistence works', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-idempotency-read-1',
        user_id: EXEC_USER_ID,
        description: 'Internet',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  }, {
    selectErrors: {
      agent_action_log: 'agent_action_log read failed',
    },
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-idempotency-read-1',
      idempotencyKey: 'read-error-idempotency-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'idempot');
  assertEquals(fake.store.agent_action_log.length, 1);
});

Deno.test('blocks replay when the same idempotency key already succeeded for a different safe action contract', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: EXEC_USER_ID,
        action_type: 'accounts_safe_action',
        details: {
          actionType: 'update_amount',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { amount: 99 },
          after: { amount: 120 },
          idempotencyKey: 'same-key-different-contract',
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'same-key-different-contract' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(result.idempotentReplay, undefined);
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'idempotency');
});

Deno.test('ignores idempotency replay rows that belong to a different user', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
    agent_action_log: [
      {
        user_id: 'other-user',
        action_type: 'accounts_safe_action',
        details: {
          actionType: 'reschedule_due_date',
          targetType: 'payable_bill',
          targetId: 'bill-1',
          before: { due_date: '2026-04-05', status: 'pending' },
          after: { due_date: '2026-04-20' },
          idempotencyKey: 'same-key-other-user',
          finalState: 'SAFE_ACTION_SUCCEEDED',
        },
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'same-key-other-user' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(result.idempotentReplay, undefined);
  assertEquals(fake.updateCalls.length, 1);
});

Deno.test('executes an account mutation through the account path and verifies the persisted balance', async () => {
  const fake = createFakeSafeActionSupabase({
    accounts: [
      {
        id: 'account-1',
        user_id: EXEC_USER_ID,
        name: 'NuConta',
        current_balance: 0,
        is_active: true,
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      anomalyType: 'zero_balance_account',
      actionType: 'adjust_account_balance',
      targetType: 'account',
      targetId: 'account-1',
      before: { current_balance: 0 },
      after: { current_balance: 5221 },
      effectSummary: 'Ela volta a refletir o saldo correto nas leituras de contas ativas.',
      idempotencyKey: 'account-balance-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(fake.updateCalls.length, 1);
  assertEquals(fake.store.accounts[0].current_balance, 5221);
});

Deno.test('aborts before writing when the safe action preview is already expired at execution time and still audits with explicit user id', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      idempotencyKey: 'expired-preview-key',
      previewExpiresAt: '2026-04-11T11:00:00.000Z',
    }),
    {
      userId: EXEC_USER_ID,
      now: '2026-04-11T11:00:01.000Z',
    },
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'expir');
  assertEquals(fake.store.agent_action_log.length, 1);
  assertEquals(fake.store.agent_action_log[0].user_id, EXEC_USER_ID);
});

Deno.test('aborts before writing when the current persisted state is no longer eligible for the chosen action', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-2',
        user_id: EXEC_USER_ID,
        description: 'Academia',
        due_date: '2026-04-05',
        status: 'pending',
        is_recurring: true,
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      actionType: 'cancel_one_off_bill',
      targetId: 'bill-2',
      before: { status: 'pending' },
      after: { status: 'cancelled' },
      effectSummary: 'Ela deixa de aparecer como pendente, e o historico continua preservado.',
      idempotencyKey: 'eligibility-revalidation-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'eleg');
});

Deno.test('audits the safe abort with explicit user id when the scoped read cannot load an acting-user target row', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-3',
        description: 'Internet',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-3',
      idempotencyKey: 'missing-row-user-id-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_ABORTED');
  assertEquals(fake.updateCalls.length, 0);
  assertEquals(fake.store.agent_action_log.length, 1);
  assertEquals(fake.store.agent_action_log[0].user_id, EXEC_USER_ID);
});

Deno.test('fails verification when reread state matches after fields but contradicts locked unchanged fields that matter', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-1',
        user_id: EXEC_USER_ID,
        description: 'Celular (1/12)',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  fake.from = ((table: keyof typeof fake.store) => {
    const query = new FakeQuery(fake, table);
    const originalUpdate = query.update.bind(query);
    query.update = ((patch: Record<string, unknown>) => {
      return originalUpdate({
        ...patch,
        status: 'paid',
      });
    }) as typeof query.update;
    return query;
  }) as typeof fake.from;

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({ idempotencyKey: 'verification-locked-fields-key' }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_FAILED');
  assertEquals(fake.updateCalls.length, 1);
  assertStringIncludes(result.message, 'seguranca');
});

Deno.test('mark_as_paid does not write hidden fields outside the safe action contract', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-paid-1',
        user_id: EXEC_USER_ID,
        description: 'Condominio',
        due_date: '2026-04-05',
        status: 'pending',
        amount: 155,
        paid_amount: null,
        paid_at: null,
        payment_method: 'bank_slip',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      actionType: 'mark_as_paid',
      targetId: 'bill-paid-1',
      before: { status: 'pending', paid_amount: null, paid_at: null },
      after: {
        status: 'paid',
        paid_amount: 155,
        paid_at: '2026-04-10',
      },
      effectSummary: 'Essa conta sai da lista de pendentes e passa a constar como quitada.',
      idempotencyKey: 'mark-paid-no-hidden-write-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(fake.updateCalls.length, 1);
  assertEquals('payment_method' in fake.updateCalls[0].patch, false);
  assertEquals(fake.store.payable_bills[0].payment_method, 'bank_slip');
});

Deno.test('mark_as_paid succeeds when the reread returns paid_at as a full timestamp for the same calendar date', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-paid-timestamp-1',
        user_id: EXEC_USER_ID,
        description: 'Celular',
        due_date: '2026-04-05',
        status: 'pending',
        amount: 99,
        paid_amount: null,
        paid_at: null,
        payment_method: null,
      },
    ],
  });

  fake.from = ((table: keyof typeof fake.store) => {
    const query = new FakeQuery(fake, table);
    const originalUpdate = query.update.bind(query);
    query.update = ((patch: Record<string, unknown>) => {
      return originalUpdate({
        ...patch,
        paid_at: '2026-04-11T00:00:00-03:00',
      });
    }) as typeof query.update;
    return query;
  }) as typeof fake.from;

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      actionType: 'mark_as_paid',
      targetId: 'bill-paid-timestamp-1',
      before: { status: 'pending', paid_amount: null, paid_at: null },
      after: {
        status: 'paid',
        paid_amount: 99,
        paid_at: '2026-04-11',
      },
      effectSummary: 'Essa conta sai da lista de pendentes e passa a constar como quitada.',
      idempotencyKey: 'mark-paid-timestamp-reread-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_SUCCEEDED');
  assertEquals(fake.updateCalls.length, 1);
});

Deno.test('mark_as_paid verification fails when reread drifts in locked amount and payment_method fields', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-paid-2',
        user_id: EXEC_USER_ID,
        description: 'Escola',
        due_date: '2026-04-05',
        status: 'pending',
        amount: 300,
        paid_amount: null,
        paid_at: null,
        payment_method: null,
      },
    ],
  });

  fake.from = ((table: keyof typeof fake.store) => {
    const query = new FakeQuery(fake, table);
    const originalUpdate = query.update.bind(query);
    query.update = ((patch: Record<string, unknown>) => {
      return originalUpdate({
        ...patch,
        amount: 333,
        payment_method: 'pix',
      });
    }) as typeof query.update;
    return query;
  }) as typeof fake.from;

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      actionType: 'mark_as_paid',
      targetId: 'bill-paid-2',
      before: { status: 'pending', paid_amount: null, paid_at: null },
      after: {
        status: 'paid',
        paid_amount: 300,
        paid_at: '2026-04-10',
      },
      effectSummary: 'Essa conta sai da lista de pendentes e passa a constar como quitada.',
      idempotencyKey: 'mark-paid-hidden-drift-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_FAILED');
  assertEquals(fake.updateCalls.length, 1);
  assertStringIncludes(result.message, 'seguranca');

  const audit = getAuditDetails(fake);
  const verification = (audit?.postWriteVerification ?? null) as Record<string, unknown> | null;
  assertEquals(
    verification?.lockedFields,
    { amount: 300, payment_method: null },
  );
  assertEquals(
    verification?.actualLockedFields,
    { amount: 333, payment_method: 'pix' },
  );
});

Deno.test('does not finalize success when audit persistence cannot be written', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-audit-1',
        user_id: EXEC_USER_ID,
        description: 'Agua',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  }, {
    insertErrors: {
      agent_action_log: 'audit insert failed',
    },
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-audit-1',
      idempotencyKey: 'audit-failure-success-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertStringIncludes(result.message, 'auditoria');
  assertEquals(fake.store.agent_action_log.length, 0);
});

Deno.test('does not finalize success when mandatory confirmation audit inputs are missing', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-confirmation-1',
        user_id: EXEC_USER_ID,
        description: 'Gas',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-confirmation-1',
      idempotencyKey: 'missing-confirmation-audit-inputs-key',
      confirmationText: undefined,
      confirmationSource: undefined,
      confirmedAt: undefined,
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertStringIncludes(result.message, 'auditoria');
  assertEquals(fake.updateCalls.length, 0);
  assertEquals(fake.store.agent_action_log.length, 0);
});

Deno.test('does not write when confirmationSource is not one of the contract-valid values', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-confirmation-source-1',
        user_id: EXEC_USER_ID,
        description: 'Internet',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-confirmation-source-1',
      idempotencyKey: 'invalid-confirmation-source-key',
      confirmationSource: 'freeform_yes' as never,
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'auditoria');
  assertEquals(fake.store.agent_action_log.length, 0);
});

Deno.test('does not write when the mandatory audit contract is malformed before finalization', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-audit-contract-1',
        user_id: EXEC_USER_ID,
        description: 'Luz',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-audit-contract-1',
      idempotencyKey: '',
      effectSummary: '',
      confirmationPrompt: '',
      diagnosticBasis: {
        conclusionKey: '',
        conclusionText: '',
        source: 'unknown' as never,
      },
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'auditoria');
  assertEquals(fake.store.agent_action_log.length, 0);
});

Deno.test('does not finalize aborted outcome when audit persistence cannot be written', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-audit-2',
        user_id: EXEC_USER_ID,
        description: 'Luz',
        due_date: '2026-04-22',
        status: 'pending',
      },
    ],
  }, {
    insertErrors: {
      agent_action_log: 'audit insert failed',
    },
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-audit-2',
      idempotencyKey: 'audit-failure-abort-key',
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertStringIncludes(result.message, 'auditoria');
  assertEquals(fake.store.agent_action_log.length, 0);
});

Deno.test('missing confirmation audit inputs escalate as non-final infrastructure error when pre-write audit persistence also fails', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-confirmation-2',
        user_id: EXEC_USER_ID,
        description: 'Telefone',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  }, {
    insertErrors: {
      agent_action_log: 'audit insert failed',
    },
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-confirmation-2',
      idempotencyKey: 'missing-confirmation-audit-insert-fails-key',
      confirmationText: undefined,
      confirmationSource: undefined,
      confirmedAt: undefined,
    }),
    DEFAULT_EXEC_CONTEXT,
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertEquals(fake.updateCalls.length, 0);
  assertStringIncludes(result.message, 'auditoria');
  assertEquals(fake.store.agent_action_log.length, 0);
});

Deno.test('malformed audit contract is rejected before an expiry-based abort can finalize', async () => {
  const fake = createFakeSafeActionSupabase({
    payable_bills: [
      {
        id: 'bill-malformed-expiry-1',
        user_id: EXEC_USER_ID,
        description: 'Telefone',
        due_date: '2026-04-05',
        status: 'pending',
      },
    ],
  });

  const result = await executePendingAccountsSafeAction(
    fake as never,
    createPending({
      targetId: 'bill-malformed-expiry-1',
      idempotencyKey: '',
      effectSummary: '',
      previewExpiresAt: '2026-04-11T10:00:00.000Z',
    }),
    {
      userId: EXEC_USER_ID,
      now: '2026-04-11T10:03:00.000Z',
    },
  );

  assertEquals(result.finalState, 'SAFE_ACTION_INFRASTRUCTURE_ERROR');
  assertEquals(fake.updateCalls.length, 0);
  assertEquals(fake.store.agent_action_log.length, 0);
  assertStringIncludes(result.message, 'auditoria');
});
