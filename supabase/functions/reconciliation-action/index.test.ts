import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import { applyReconciliationDecision, type ApplyReconciliationInput } from './index.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Row = Record<string, unknown>;

function fakeSupabase(options?: {
  existingCase?: Row;
  bankTx?: Row;
  failAuditInsert?: boolean;
}): SupabaseClient {
  const failAuditInsert = options?.failAuditInsert ?? false;
  const caseRow: Row = {
    id: 'case-1',
    user_id: 'user-1',
    status: 'open',
    confidence: 0.5,
    bank_transaction_id: 'bt-1',
    ...options?.existingCase,
  };
  const bankRow: Row = options?.bankTx ?? { id: 'bt-1', amount: -100, description: 'Test' };

  function from(table: string) {
    if (table === 'reconciliation_cases') {
      return {
        select: () => ({
          eq: (col: string, val: unknown) => ({
            eq: (col2: string, val2: unknown) => ({
              single: async () => {
                if (col === 'id' && val === caseRow.id && col2 === 'user_id' && val2 === caseRow.user_id) {
                  return { data: { ...caseRow }, error: null };
                }
                return { data: null, error: { code: 'PGRST116', message: 'not found' } };
              },
            }),
          }),
        }),
        update: (patch: Row) => ({
          eq: (col: string, id: unknown) => ({
            eq: (col2: string, uid: unknown) => {
              if (col === 'id' && col2 === 'user_id' && id === caseRow.id && uid === caseRow.user_id) {
                Object.assign(caseRow, patch);
              }
              return Promise.resolve({ data: null, error: null });
            },
          }),
        }),
      };
    }

    if (table === 'bank_transactions') {
      return {
        select: () => ({
          eq: (col: string, val: unknown) => ({
            single: async () => {
              if (col === 'id' && val === bankRow.id) {
                return { data: { ...bankRow }, error: null };
              }
              return { data: null, error: { code: 'PGRST116' } };
            },
          }),
        }),
      };
    }

    if (table === 'reconciliation_audit_log') {
      return {
        insert: (row: Row) => {
          if (failAuditInsert) {
            return Promise.resolve({ data: null, error: { message: 'insert failed' } });
          }
          return Promise.resolve({ data: row, error: null });
        },
      };
    }

    throw new Error(`Unexpected table ${table}`);
  }

  return { from } as unknown as SupabaseClient;
}

function fakeSupabaseAutoClose() {
  const caseRow: Row = {
    id: 'case-2',
    user_id: 'user-1',
    status: 'open',
    confidence: 0.91,
    bank_transaction_id: 'bt-2',
  };
  const bankRow: Row = { id: 'bt-2', amount: -50 };
  const audits: Row[] = [];

  const client = {
    from: (table: string) => {
      if (table === 'reconciliation_cases') {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => ({
              eq: (col2: string, val2: unknown) => ({
                single: async () => {
                  if (String(val) === 'case-2' && String(val2) === 'user-1') {
                    return { data: { ...caseRow }, error: null };
                  }
                  return { data: null, error: { code: 'PGRST116' } };
                },
              }),
            }),
          }),
          update: (patch: Row) => ({
            eq: (col: string, id: unknown) => ({
              eq: (col2: string, uid: unknown) => {
                if (String(id) === 'case-2' && String(uid) === 'user-1') {
                  Object.assign(caseRow, patch);
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }
      if (table === 'bank_transactions') {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => ({
              single: async () =>
                String(val) === 'bt-2'
                  ? { data: { ...bankRow }, error: null }
                  : { data: null, error: { code: 'PGRST116' } },
            }),
          }),
        };
      }
      if (table === 'reconciliation_audit_log') {
        return {
          insert: (row: Row) => {
            audits.push(row);
            return Promise.resolve({ data: row, error: null });
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, caseRow, audits };
}

Deno.test('confirm writes link + audit but does not mutate payable financial state', async () => {
  const result = await applyReconciliationDecision(fakeSupabase(), {
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
  const { client } = fakeSupabaseAutoClose();

  const result = await applyReconciliationDecision(client, {
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
  const supabase = fakeSupabase({ failAuditInsert: true });

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
