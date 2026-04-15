import { assertEquals, assertRejects } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

import {
  authenticatePluggy,
  buildPluggyHeaders,
  getPluggyItem,
} from './pluggy-client.ts';

Deno.test('authenticatePluggy returns runtime apiKey and never models bearer auth', async () => {
  const calls: Array<{ url: string; method?: string; headers: HeadersInit }> = [];

  const fetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method, headers: init?.headers ?? {} });

    if (String(input).endsWith('/auth')) {
      return new Response(JSON.stringify({ apiKey: 'runtime-key-123' }), { status: 200 });
    }

    throw new Error(`Unexpected URL: ${String(input)}`);
  };

  const apiKey = await authenticatePluggy(
    {
      baseUrl: 'https://api.pluggy.ai',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
    fetchMock,
  );

  assertEquals(apiKey, 'runtime-key-123');
  assertEquals(calls[0].url, 'https://api.pluggy.ai/auth');
  assertEquals(calls[0].method, 'POST');
  assertEquals((calls[0].headers as Record<string, string>)['Content-Type'], 'application/json');
  assertEquals('Authorization' in (calls[0].headers as Record<string, string>), false);
  assertEquals(buildPluggyHeaders('runtime-key-123')['X-API-KEY'], 'runtime-key-123');
});

Deno.test('getPluggyItem surfaces webhookUrl null explicitly', async () => {
  const item = await getPluggyItem(
    { baseUrl: 'https://api.pluggy.ai', apiKey: 'runtime-key-123', itemId: 'item-1' },
    async () =>
      new Response(JSON.stringify({ id: 'item-1', status: 'UPDATED', webhookUrl: null }), {
        status: 200,
      }),
  );

  assertEquals(item.webhookUrl, null);
});

Deno.test('authenticatePluggy fails closed when /auth does not return apiKey', async () => {
  await assertRejects(
    () =>
      authenticatePluggy(
        { baseUrl: 'https://api.pluggy.ai', clientId: 'id', clientSecret: 'secret' },
        async () => new Response(JSON.stringify({ token: 'wrong-shape' }), { status: 200 }),
      ),
    Error,
    'Pluggy auth response missing apiKey',
  );
});

Deno.test('authenticatePluggy fails closed when /auth returns invalid JSON', async () => {
  await assertRejects(
    () =>
      authenticatePluggy(
        { baseUrl: 'https://api.pluggy.ai', clientId: 'id', clientSecret: 'secret' },
        async () => new Response('not-json', { status: 200 }),
      ),
    Error,
    'Pluggy auth response invalid JSON',
  );
});

Deno.test('authenticatePluggy fails closed when /auth returns non-OK status', async () => {
  await assertRejects(
    () =>
      authenticatePluggy(
        { baseUrl: 'https://api.pluggy.ai', clientId: 'id', clientSecret: 'secret' },
        async () => new Response(JSON.stringify({ apiKey: 'runtime-key-123' }), { status: 401 }),
      ),
    Error,
    'Pluggy auth failed: 401',
  );
});

Deno.test('getPluggyItem fails closed when the body is invalid JSON', async () => {
  await assertRejects(
    () =>
      getPluggyItem(
        { baseUrl: 'https://api.pluggy.ai', apiKey: 'runtime-key-123', itemId: 'item-1' },
        async () => new Response('not-json', { status: 200 }),
      ),
    Error,
    'Pluggy get item: invalid JSON body',
  );
});

Deno.test('getPluggyItem fails closed when id or status are missing', async () => {
  await assertRejects(
    () =>
      getPluggyItem(
        { baseUrl: 'https://api.pluggy.ai', apiKey: 'runtime-key-123', itemId: 'item-1' },
        async () => new Response(JSON.stringify({ webhookUrl: null }), { status: 200 }),
      ),
    Error,
    'Pluggy get item: missing id',
  );
});

Deno.test('getPluggyItem fails closed when webhookUrl is not string or null', async () => {
  await assertRejects(
    () =>
      getPluggyItem(
        { baseUrl: 'https://api.pluggy.ai', apiKey: 'runtime-key-123', itemId: 'item-1' },
        async () =>
          new Response(JSON.stringify({ id: 'item-1', status: 'UPDATED', webhookUrl: 123 }), {
            status: 200,
          }),
      ),
    Error,
    'Pluggy get item: invalid webhookUrl',
  );
});
