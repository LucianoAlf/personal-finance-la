import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { buildCaseDraft, materializeReconciliationRows } from './reconciliation-materializer.ts';

function buildRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    source_item_id: 'item-itau',
    external_id: `ext-${index}`,
    account_name: 'Itau corrente',
    external_account_id: `acc-${index}`,
    internal_account_id: null,
    amount: -100 - index,
    date: '2026-04-16',
    description: `PIX ${index}`,
    raw_description: `PIX ${index}`,
    sourceHealth: 'healthy' as const,
  }));
}

function createChunkSensitiveSupabase(maxIdsPerInClause: number) {
  const inCallSizes: number[] = [];

  const client = {
    from(table: string) {
      if (table === 'payable_bills') {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      }

      if (table === 'bank_transactions') {
        return {
          upsert: (rows: Array<Record<string, unknown>>) => ({
            select: async () => ({
              data: rows.map((row, index) => ({ id: `bt-${index}`, ...row })),
              error: null,
            }),
          }),
          delete: () => ({
            eq: () => ({
              in: async () => ({ error: null }),
            }),
          }),
        };
      }

      if (table === 'reconciliation_cases') {
        return {
          select: () => ({
            eq: () => ({
              in: async (_column: string, ids: string[]) => {
                inCallSizes.push(ids.length);
                if (ids.length > maxIdsPerInClause) {
                  return {
                    data: null,
                    error: { message: `too many ids in one clause: ${ids.length}` },
                  };
                }

                return { data: [], error: null };
              },
            }),
          }),
          delete: () => ({
            eq: () => ({
              in: async (_column: string, ids: string[]) => {
                inCallSizes.push(ids.length);
                if (ids.length > maxIdsPerInClause) {
                  return { error: { message: `too many ids in one clause: ${ids.length}` } };
                }

                return { error: null };
              },
            }),
          }),
          insert: async (rows: Array<Record<string, unknown>>) => ({ data: rows, error: null }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client, inCallSizes };
}

Deno.test('buildCaseDraft no longer flags every unmatched bank transaction as urgent', () => {
  const draft = buildCaseDraft({
    userId: 'user-1',
    bankTransaction: {
      source_item_id: 'item-itau',
      external_id: 'ext-1',
      account_name: 'Itau corrente',
      external_account_id: 'acc-1',
      internal_account_id: null,
      amount: -120,
      date: '2026-04-14',
      description: 'PIX ENVIADO JOAO S',
      raw_description: 'PIX ENVIADO JOAO S',
      sourceHealth: 'healthy',
    },
    payables: [],
    now: '2026-04-16T12:00:00Z',
  });

  assertEquals(draft.caseDraft.divergence_type, 'unmatched_bank_transaction');
  assertEquals(draft.caseDraft.priority, 'medium');
  assertEquals(draft.caseDraft.confidence, 0);
});

Deno.test('buildCaseDraft routes stale sources to infra priority, not urgent', () => {
  const draft = buildCaseDraft({
    userId: 'user-1',
    bankTransaction: {
      source_item_id: 'item-itau',
      external_id: 'ext-1',
      account_name: 'Itau corrente',
      external_account_id: 'acc-1',
      internal_account_id: null,
      amount: -120,
      date: '2026-04-14',
      description: 'PIX',
      raw_description: 'PIX',
      sourceHealth: 'stale',
    },
    payables: [],
    now: '2026-04-16T12:00:00Z',
  });

  assertEquals(draft.caseDraft.priority, 'infra');
});

Deno.test('buildCaseDraft escalates high-value recent unmatched to urgent', () => {
  const draft = buildCaseDraft({
    userId: 'user-1',
    bankTransaction: {
      source_item_id: 'item-itau',
      external_id: 'ext-1',
      account_name: 'Itau corrente',
      external_account_id: 'acc-1',
      internal_account_id: null,
      amount: -9800,
      date: '2026-04-14',
      description: 'PIX',
      raw_description: 'PIX',
      sourceHealth: 'healthy',
    },
    payables: [],
    now: '2026-04-16T12:00:00Z',
  });

  assertEquals(draft.caseDraft.priority, 'urgent');
});

Deno.test('materializeReconciliationRows chunks refresh lookups for large bank transaction batches', async () => {
  const { client, inCallSizes } = createChunkSensitiveSupabase(200);

  const result = await materializeReconciliationRows(client as never, {
    userId: 'user-1',
    source: 'pluggy',
    rows: buildRows(450),
    onConflict: 'user_id,source,external_id',
    refreshOpenCases: true,
  });

  assertEquals(result.importedCount, 450);
  assertEquals(result.createdCases, 450);
  assertEquals(inCallSizes.length > 1, true);
  assertEquals(inCallSizes.every((size) => size <= 200), true);
});
