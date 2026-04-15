export interface PluggyAuthConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface PluggyItemRequest {
  baseUrl: string;
  apiKey: string;
  itemId: string;
}

export interface PluggyItem {
  id: string;
  status: string;
  webhookUrl: string | null;
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '');
}

export function buildPluggyHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
  };
}

export type PluggyFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function authenticatePluggy(
  config: PluggyAuthConfig,
  fetchImpl: PluggyFetch,
): Promise<string> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/auth`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pluggy auth failed: ${res.status}`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('Pluggy auth response invalid JSON');
  }

  if (
    data === null ||
    typeof data !== 'object' ||
    !('apiKey' in data) ||
    typeof (data as { apiKey: unknown }).apiKey !== 'string' ||
    (data as { apiKey: string }).apiKey.length === 0
  ) {
    throw new Error('Pluggy auth response missing apiKey');
  }

  return (data as { apiKey: string }).apiKey;
}

export async function getPluggyItem(
  config: PluggyItemRequest,
  fetchImpl: PluggyFetch,
): Promise<PluggyItem> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/items/${encodeURIComponent(config.itemId)}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: buildPluggyHeaders(config.apiKey),
  });

  if (!res.ok) {
    throw new Error(`Pluggy get item failed: ${res.status}`);
  }

  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error('Pluggy get item: invalid JSON body');
  }

  if (typeof data.id !== 'string' || data.id.length === 0) {
    throw new Error('Pluggy get item: missing id');
  }

  if (typeof data.status !== 'string' || data.status.length === 0) {
    throw new Error('Pluggy get item: missing status');
  }

  const webhookUrl = data.webhookUrl;
  if (webhookUrl !== undefined && webhookUrl !== null && typeof webhookUrl !== 'string') {
    throw new Error('Pluggy get item: invalid webhookUrl');
  }

  return {
    id: data.id,
    status: data.status,
    webhookUrl: webhookUrl ?? null,
  };
}

export interface PluggyAccountRow {
  id: string;
  name?: string | null;
}

export interface PluggyTransactionRow {
  id: string;
  amount: number;
  date: string;
  description: string;
}

function parseResults<T>(data: unknown): T[] {
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export async function listPluggyAccounts(
  config: { baseUrl: string; apiKey: string; itemId: string },
  fetchImpl: PluggyFetch,
): Promise<{ results: PluggyAccountRow[] }> {
  const url = `${normalizeBaseUrl(config.baseUrl)}/accounts?itemId=${encodeURIComponent(config.itemId)}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: buildPluggyHeaders(config.apiKey),
  });
  if (!res.ok) {
    throw new Error(`Pluggy list accounts failed: ${res.status}`);
  }
  const data: unknown = await res.json();
  return { results: parseResults<PluggyAccountRow>(data) };
}

export async function listPluggyTransactions(
  config: { baseUrl: string; apiKey: string; accountId: string },
  fetchImpl: PluggyFetch,
): Promise<{ results: PluggyTransactionRow[] }> {
  const url =
    `${normalizeBaseUrl(config.baseUrl)}/transactions?accountId=${encodeURIComponent(config.accountId)}`;
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: buildPluggyHeaders(config.apiKey),
  });
  if (!res.ok) {
    throw new Error(`Pluggy list transactions failed: ${res.status}`);
  }
  const data: unknown = await res.json();
  return { results: parseResults<PluggyTransactionRow>(data) };
}
