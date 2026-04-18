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
  /** Marketing name is usually the one humans recognize ("Conta Corrente", "Nu Ultravioleta"). */
  marketingName?: string | null;
  /** BANK | CREDIT. Used to disambiguate checking from credit card when building labels. */
  type?: string | null;
  /** CHECKING_ACCOUNT | SAVINGS_ACCOUNT | CREDIT_CARD | ... */
  subtype?: string | null;
  /** Usually masked (e.g. "****1234"). Drives the "final 4" portion of the label. */
  number?: string | null;
  taxNumber?: string | null;
  owner?: string | null;
}

export interface PluggyTransactionRow {
  id: string;
  amount: number;
  date: string;
  description: string;
}

export interface PluggyTransactionQuery {
  baseUrl: string;
  apiKey: string;
  accountId: string;
  /** ISO date (YYYY-MM-DD). Maps to Pluggy's `from` query string. */
  from?: string | null;
  /** ISO date (YYYY-MM-DD). Maps to Pluggy's `to` query string. */
  to?: string | null;
  /** Pluggy supports up to 500 per page; we cap to be friendly. */
  pageSize?: number;
  /** 1-indexed page number when paginating manually. */
  page?: number;
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
  config: PluggyTransactionQuery,
  fetchImpl: PluggyFetch,
): Promise<{ results: PluggyTransactionRow[] }> {
  const params = new URLSearchParams();
  params.set('accountId', config.accountId);

  // Passing `from` is the single biggest lever against "historical noise
  // contamination": without it Pluggy happily serves us up to a year of data
  // every poll cycle, which is exactly how 2500 pre-window cases appeared in
  // the inbox. Callers should derive this from the per-user window.
  if (config.from) {
    params.set('from', config.from);
  }
  if (config.to) {
    params.set('to', config.to);
  }
  if (typeof config.pageSize === 'number' && Number.isFinite(config.pageSize)) {
    params.set('pageSize', String(Math.max(1, Math.min(500, Math.trunc(config.pageSize)))));
  }
  if (typeof config.page === 'number' && Number.isFinite(config.page)) {
    params.set('page', String(Math.max(1, Math.trunc(config.page))));
  }

  const url = `${normalizeBaseUrl(config.baseUrl)}/transactions?${params.toString()}`;
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
