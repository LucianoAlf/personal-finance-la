import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { runPluggyReconciliationPoll } from './index.ts';
import type { PluggyFetch } from '../_shared/pluggy-client.ts';

function mockFetchHealthyItau(): PluggyFetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth')) {
      return new Response(JSON.stringify({ apiKey: 'runtime-key-1' }), { status: 200 });
    }
    if (url.includes('/items/item-itau')) {
      return new Response(
        JSON.stringify({ id: 'item-itau', status: 'UPDATED', webhookUrl: null }),
        { status: 200 },
      );
    }
    if (url.includes('/accounts') && url.includes('itemId=item-itau')) {
      return new Response(JSON.stringify({ results: [{ id: 'acc-1', name: 'Conta' }] }), {
        status: 200,
      });
    }
    if (url.includes('/transactions') && url.includes('accountId=acc-1')) {
      return new Response(
        JSON.stringify({
          results: [
            { id: 'tx-1', amount: -10, date: '2026-04-11T00:00:00.000Z', description: 'Teste' },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(`unexpected: ${url}`, { status: 500 });
  }) as PluggyFetch;
}

function mockFetchStaleSantander(): PluggyFetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth')) {
      return new Response(JSON.stringify({ apiKey: 'runtime-key-2' }), { status: 200 });
    }
    if (url.includes('/items/item-stale')) {
      return new Response(
        JSON.stringify({ id: 'item-stale', status: 'OUTDATED', webhookUrl: null }),
        { status: 200 },
      );
    }
    if (url.includes('/accounts') && url.includes('itemId=item-stale')) {
      return new Response(JSON.stringify({ results: [{ id: 'acc-s', name: 'Santander' }] }), {
        status: 200,
      });
    }
    if (url.includes('/transactions') && url.includes('accountId=acc-s')) {
      return new Response(
        JSON.stringify({
          results: [
            { id: 'tx-s', amount: -50, date: '2026-04-10', description: 'Compra' },
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(`unexpected: ${url}`, { status: 500 });
  }) as PluggyFetch;
}

function fakeSupabaseForPluggyPersistence(): {
  client: SupabaseClient;
  bankRows: Array<Record<string, unknown>>;
  caseRows: Array<Record<string, unknown>>;
  connectionRows: Array<Record<string, unknown>>;
} {
  const bankRows: Array<Record<string, unknown>> = [];
  const caseRows: Array<Record<string, unknown>> = [];
  const connectionRows: Array<Record<string, unknown>> = [
    {
      user_id: 'user-1',
      item_id: 'item-itau',
      institution_name: 'Itau',
      status: 'LOGIN_ERROR',
      last_synced_at: null,
    },
  ];

  const client = {
    from: (table: string) => {
      if (table === 'pluggy_connections') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: connectionRows,
                error: null,
              }),
            }),
            in: async () => ({
              data: connectionRows,
              error: null,
            }),
          }),
          upsert: async (rows: Array<Record<string, unknown>>) => {
            connectionRows.splice(0, connectionRows.length, ...rows);
            return { data: rows, error: null };
          },
        };
      }

      if (table === 'payable_bills') {
        return {
          select: () => ({
            eq: async () => ({
              data: [
                {
                  id: 'bill-1',
                  amount: 10,
                  due_date: '2026-04-11',
                  description: 'Teste',
                },
              ],
              error: null,
            }),
          }),
        };
      }

      if (table === 'bank_transactions') {
        return {
          upsert: (rows: Array<Record<string, unknown>>) => ({
            select: async () => {
              const persisted = rows.map((row, index) => ({
                id: `bt-${index + 1}`,
                ...row,
              }));
              bankRows.splice(0, bankRows.length, ...persisted);
              return { data: persisted, error: null };
            },
          }),
          delete: () => ({
            eq: () => ({
              in: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      }

      if (table === 'reconciliation_cases') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: [],
                error: null,
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              in: async () => ({ data: null, error: null }),
            }),
          }),
          insert: async (rows: Array<Record<string, unknown>>) => {
            caseRows.splice(0, caseRows.length, ...rows);
            return { data: rows, error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };

  return { client: client as unknown as SupabaseClient, bankRows, caseRows, connectionRows };
}

Deno.test('worker authenticates per run and never reuses a persisted runtime apiKey contract', async () => {
  const result = await runPluggyReconciliationPoll({
    env: {
      PLUGGY_CLIENT_ID: 'client',
      PLUGGY_CLIENT_SECRET: 'secret',
      PLUGGY_ITEM_ID_ITAU: 'item-itau',
    },
    now: '2026-04-14T12:00:00Z',
    fetchImpl: mockFetchHealthyItau(),
  });

  assertEquals(result.authenticatedThisRun, true);
});

Deno.test('stale item updates pluggy_connections and caps match confidence', async () => {
  const result = await runPluggyReconciliationPoll({
    env: {
      PLUGGY_CLIENT_ID: 'client',
      PLUGGY_CLIENT_SECRET: 'secret',
      PLUGGY_ITEM_ID_SANTANDER: 'item-stale',
    },
    now: '2026-04-14T12:00:00Z',
    fetchImpl: mockFetchStaleSantander(),
  });

  assertEquals(result.connectionUpdates[0].status, 'stale');
  assertEquals(result.generatedCases.every((item) => item.confidence <= 0.64), true);
});

Deno.test('worker asks Pluggy with from=window_start so pre-April rows never reach the inbox', async () => {
  let capturedTransactionUrl: string | null = null;
  const trackingFetch: PluggyFetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/auth')) {
      return new Response(JSON.stringify({ apiKey: 'runtime-key' }), { status: 200 });
    }
    if (url.includes('/items/item-itau')) {
      return new Response(
        JSON.stringify({ id: 'item-itau', status: 'UPDATED', webhookUrl: null }),
        { status: 200 },
      );
    }
    if (url.includes('/accounts') && url.includes('itemId=item-itau')) {
      return new Response(JSON.stringify({ results: [{ id: 'acc-1', name: 'Conta' }] }), {
        status: 200,
      });
    }
    if (url.includes('/transactions') && url.includes('accountId=acc-1')) {
      capturedTransactionUrl = url;
      return new Response(JSON.stringify({ results: [] }), { status: 200 });
    }
    return new Response(`unexpected: ${url}`, { status: 500 });
  }) as PluggyFetch;

  await runPluggyReconciliationPoll({
    env: {
      PLUGGY_CLIENT_ID: 'client',
      PLUGGY_CLIENT_SECRET: 'secret',
      PLUGGY_ITEM_ID_ITAU: 'item-itau',
    },
    now: '2026-04-14T12:00:00Z',
    fetchImpl: trackingFetch,
  });

  if (!capturedTransactionUrl) {
    throw new Error('expected poller to call /transactions at least once');
  }
  if (!(capturedTransactionUrl as string).includes('from=2026-04-01')) {
    throw new Error(`expected from=2026-04-01 in URL, got: ${capturedTransactionUrl}`);
  }
});

Deno.test('worker reuses the shared materializer when pluggy_connections resolves the user owner', async () => {
  const { client, bankRows, caseRows, connectionRows } = fakeSupabaseForPluggyPersistence();

  const result = await runPluggyReconciliationPoll({
    env: {
      PLUGGY_CLIENT_ID: 'client',
      PLUGGY_CLIENT_SECRET: 'secret',
      PLUGGY_ITEM_ID_ITAU: 'item-itau',
    },
    now: '2026-04-14T12:00:00Z',
    fetchImpl: mockFetchHealthyItau(),
    supabase: client,
  });

  assertEquals(result.persistedTransactions, 1);
  assertEquals(result.createdCases, 1);
  assertEquals(bankRows[0].source, 'pluggy');
  assertEquals(bankRows[0].reconciliation_status, 'matched');
  assertEquals(caseRows[0].matched_record_type, 'payable_bill');
  assertEquals(connectionRows[0].status, 'UPDATED');
});
