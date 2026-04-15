import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

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
