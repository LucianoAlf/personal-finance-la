#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Phase 4 Pluggy smoke: auth + item, accounts, transactions (first account), investments.
 *
 * From repo root (with secrets in env or optional `.env.local` in cwd):
 *   deno run --allow-net --allow-env --allow-read scripts/pluggy/phase4-smoke.ts
 *
 * Or pass env explicitly / use `deno run --env-file=.env.local ...` on Deno versions that support it.
 */

import {
  authenticatePluggy,
  buildPluggyHeaders,
  getPluggyItem,
  normalizeBaseUrl,
} from '../../supabase/functions/_shared/pluggy-client.ts';

function extractResults(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { results?: unknown }).results)
  ) {
    return (data as { results: unknown[] }).results;
  }
  return [];
}

function requireResults(path: string, data: unknown): unknown[] {
  const results = extractResults(data);
  const isSupportedListShape =
    Array.isArray(data) ||
    (data !== null &&
      typeof data === 'object' &&
      Array.isArray((data as { results?: unknown }).results));

  if (!isSupportedListShape) {
    throw new Error(`${path} did not return a supported list shape`);
  }

  return results;
}

async function loadEnvLocalFromCwd(): Promise<void> {
  let text: string;
  try {
    text = await Deno.readTextFile(`${Deno.cwd()}/.env.local`);
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && Deno.env.get(key) === undefined) {
      Deno.env.set(key, val);
    }
  }
}

await loadEnvLocalFromCwd();

const baseUrl = Deno.env.get('PLUGGY_BASE_URL') ?? 'https://api.pluggy.ai';
const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
const itemId = Deno.env.get('PLUGGY_ITEM_ID_NUBANK');

if (!clientId || !clientSecret || !itemId) {
  console.error(
    'Missing PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, or PLUGGY_ITEM_ID_NUBANK (set in environment or .env.local in cwd).',
  );
  Deno.exit(1);
}

const apiKey = await authenticatePluggy(
  { baseUrl, clientId, clientSecret },
  fetch,
);

const root = normalizeBaseUrl(baseUrl);
const headers = buildPluggyHeaders(apiKey);

async function pluggyGet(path: string): Promise<unknown> {
  const res = await fetch(`${root}${path}`, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} -> HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  try {
    return await res.json();
  } catch {
    throw new Error(`${path} -> invalid JSON response`);
  }
}

const item = await getPluggyItem(
  { baseUrl, apiKey, itemId },
  fetch,
);

const accountsJson = await pluggyGet(`/accounts?itemId=${encodeURIComponent(itemId)}`);
const accounts = requireResults('/accounts', accountsJson);
const accountsCount = accounts.length;

let transactionsCount = 0;
const first = accounts[0];
if (first && typeof first === 'object' && first !== null && 'id' in first) {
  const accountId = String((first as { id: unknown }).id);
  const txJson = await pluggyGet(
    `/transactions?accountId=${encodeURIComponent(accountId)}`,
  );
  transactionsCount = requireResults('/transactions', txJson).length;
}

const investmentsJson = await pluggyGet(
  `/investments?itemId=${encodeURIComponent(itemId)}`,
);
const investmentsCount = requireResults('/investments', investmentsJson).length;

const payload = {
  auth: 200,
  itemWebhookUrl: item.webhookUrl,
  accountsCount,
  transactionsCount,
  investmentsCount,
};

console.log(JSON.stringify(payload, null, 2));
