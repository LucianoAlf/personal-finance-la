import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { importReconciliationRows } from './index.ts';

type Row = Record<string, unknown>;

function createFakeSupabase(options?: { failCaseInsert?: boolean }): {
  client: SupabaseClient;
  bankRows: Row[];
  caseRows: Row[];
  deletedIds: string[];
} {
  const bankRows: Row[] = [];
  const caseRows: Row[] = [];
  const deletedIds: string[] = [];
  const payableBills: Row[] = [
    {
      id: 'bill-1',
      amount: 152.37,
      due_date: '2026-04-15',
      description: 'Conta de luz',
    },
  ];

  const client = {
    from: (table: string) => {
      if (table === 'payable_bills') {
        return {
          select: () => ({
            eq: async () => ({
              data: payableBills,
              error: null,
            }),
          }),
        };
      }

      if (table === 'bank_transactions') {
        return {
          insert: (rows: Row[]) => ({
            select: async () => {
              const inserted = rows.map((row, index) => ({
                id: `bt-${index + 1}`,
                ...row,
              }));
              bankRows.push(...inserted);
              return { data: inserted, error: null };
            },
          }),
          delete: () => ({
            eq: () => ({
              in: async (_column: string, ids: string[]) => {
                deletedIds.push(...ids);
                return { data: null, error: null };
              },
            }),
          }),
        };
      }

      if (table === 'reconciliation_cases') {
        return {
          insert: async (rows: Row[]) => {
            if (options?.failCaseInsert) {
              return { data: null, error: { message: 'case insert failed' } };
            }
            caseRows.push(...rows);
            return { data: rows, error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    bankRows,
    caseRows,
    deletedIds,
  };
}

Deno.test('imports bank rows and materializes matched and unmatched reconciliation cases', async () => {
  const { client, bankRows, caseRows } = createFakeSupabase();

  const result = await importReconciliationRows(client, {
    userId: 'user-1',
    source: 'manual_entry',
    rows: [
      {
        source_item_id: null,
        external_id: null,
        account_name: 'Nubank PJ',
        external_account_id: null,
        internal_account_id: null,
        amount: 152.37,
        date: '2026-04-15',
        description: 'Conta de luz',
        raw_description: 'Conta de luz',
      },
      {
        source_item_id: null,
        external_id: null,
        account_name: 'Nubank PJ',
        external_account_id: null,
        internal_account_id: null,
        amount: 89.9,
        date: '2026-04-20',
        description: 'Pix para amigo',
        raw_description: 'Pix para amigo',
      },
    ],
  });

  assertEquals(result.importedCount, 2);
  assertEquals(result.createdCases, 2);
  assertEquals(result.matchedCount, 1);
  assertEquals(result.unmatchedCount, 1);
  assertEquals(bankRows[0].reconciliation_status, 'matched');
  assertEquals(bankRows[1].reconciliation_status, 'pending');
  assertEquals(caseRows[0].matched_record_type, 'payable_bill');
  assertEquals(caseRows[1].divergence_type, 'unmatched_bank_transaction');
});

Deno.test('rolls back inserted bank rows when case materialization fails', async () => {
  const { client, deletedIds } = createFakeSupabase({ failCaseInsert: true });

  await assertRejects(
    () =>
      importReconciliationRows(client, {
        userId: 'user-1',
        source: 'manual_entry',
        rows: [
          {
            source_item_id: null,
            external_id: null,
            account_name: 'Nubank PJ',
            external_account_id: null,
            internal_account_id: null,
            amount: 152.37,
            date: '2026-04-15',
            description: 'Conta de luz',
            raw_description: 'Conta de luz',
          },
        ],
      }),
    Error,
    'case insert failed',
  );

  assertEquals(deletedIds, ['bt-1']);
});
