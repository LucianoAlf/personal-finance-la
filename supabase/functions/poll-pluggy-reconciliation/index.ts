import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authenticatePluggy,
  getPluggyItem,
  listPluggyAccounts,
  listPluggyTransactions,
  type PluggyFetch,
} from '../_shared/pluggy-client.ts';
import { normalizePluggyTransaction } from '../_shared/bank-transaction-normalizer.ts';
import {
  buildCaseDraft,
  materializeReconciliationRows,
  type MaterializeBankTransactionInput,
} from '../_shared/reconciliation-materializer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-authorization, cache-control, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RECONCILIATION_CRON_LOCK_NAME = 'poll-pluggy-reconciliation';
const RECONCILIATION_CRON_LOCK_TTL_SECONDS = 20 * 60;

export interface WorkerInput {
  env: Record<string, string | undefined>;
  now: string;
  fetchImpl?: PluggyFetch;
  supabase?: SupabaseClient;
  scopedUserId?: string | null;
}

export interface PollResult {
  authenticatedThisRun: boolean;
  generatedCases: Array<{ confidence: number }>;
  connectionUpdates: Array<{ itemId: string; status: string }>;
  persistedTransactions: number;
  createdCases: number;
}

interface PluggyConnectionTarget {
  user_id: string;
  item_id: string;
  institution_name: string;
}

const DEFAULT_RECONCILIATION_WINDOW_START = '2026-04-01';

async function loadUserWindowStart(
  supabase: SupabaseClient | undefined,
  userId: string,
): Promise<string> {
  if (!supabase) return DEFAULT_RECONCILIATION_WINDOW_START;
  const { data, error } = await supabase
    .from('user_settings')
    .select('reconciliation_window_start')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    return DEFAULT_RECONCILIATION_WINDOW_START;
  }
  const raw = (data as { reconciliation_window_start?: string | null } | null)?.reconciliation_window_start;
  if (!raw) return DEFAULT_RECONCILIATION_WINDOW_START;
  return typeof raw === 'string' && raw.length >= 10 ? raw.slice(0, 10) : DEFAULT_RECONCILIATION_WINDOW_START;
}

function toTransactionShape(tx: {
  id: string;
  amount: number;
  date: string;
  description: string;
}): { id: string; amount: number; date: string; description: string } {
  const date = tx.date.length >= 10 ? tx.date.slice(0, 10) : tx.date;
  return {
    id: tx.id,
    amount: tx.amount,
    date,
    description: tx.description.trim(),
  };
}

async function loadConnectionTargets(
  supabase: SupabaseClient | undefined,
  envItemIds: string[],
  scopedUserId?: string | null,
): Promise<PluggyConnectionTarget[]> {
  if (!supabase) return [];

  let query = supabase.from('pluggy_connections').select('user_id, item_id, institution_name');
  if (scopedUserId) {
    query = query.eq('user_id', scopedUserId);
  }
  if (envItemIds.length > 0) {
    query = query.in('item_id', envItemIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message ?? 'Failed to load pluggy connection targets');
  }

  return (data ?? []) as PluggyConnectionTarget[];
}

async function acquirePollLock(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase.rpc('acquire_reconciliation_job_lock', {
    p_job_name: RECONCILIATION_CRON_LOCK_NAME,
    p_owner_id: ownerId,
    p_ttl_seconds: RECONCILIATION_CRON_LOCK_TTL_SECONDS,
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to acquire reconciliation poll lock');
  }

  return Boolean(data);
}

async function releasePollLock(supabase: SupabaseClient, ownerId: string) {
  const { error } = await supabase.rpc('release_reconciliation_job_lock', {
    p_job_name: RECONCILIATION_CRON_LOCK_NAME,
    p_owner_id: ownerId,
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to release reconciliation poll lock');
  }
}

export async function runPluggyReconciliationPoll(input: WorkerInput): Promise<PollResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = input.env.PLUGGY_BASE_URL ?? 'https://api.pluggy.ai';
  const clientId = input.env.PLUGGY_CLIENT_ID;
  const clientSecret = input.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are required');
  }

  const apiKey = await authenticatePluggy(
    { baseUrl, clientId, clientSecret },
    fetchImpl,
  );

  const itemIds = Object.entries(input.env)
    .filter(([key]) => key.startsWith('PLUGGY_ITEM_ID_'))
    .map(([, value]) => value)
    .filter((v): v is string => Boolean(v));

  const connectionTargets = await loadConnectionTargets(input.supabase, itemIds, input.scopedUserId);
  const targetsByItemId = new Map<string, PluggyConnectionTarget[]>();
  for (const target of connectionTargets) {
    const current = targetsByItemId.get(target.item_id) ?? [];
    current.push(target);
    targetsByItemId.set(target.item_id, current);
  }

  const pollItemIds = Array.from(new Set([...itemIds, ...connectionTargets.map((target) => target.item_id)]));

  const generatedCases: Array<{ confidence: number }> = [];
  const connectionUpdates: Array<{ itemId: string; status: string }> = [];
  const connectionUpserts: Array<Record<string, unknown>> = [];
  const rowsByUser = new Map<string, MaterializeBankTransactionInput[]>();
  const windowStartByUser = new Map<string, string>();
  let persistedTransactions = 0;
  let createdCases = 0;

  for (const itemId of pollItemIds) {
    const item = await getPluggyItem({ baseUrl, apiKey, itemId }, fetchImpl);
    const sourceHealth = item.status === 'UPDATED' ? 'healthy' : 'stale';
    const itemTargets = targetsByItemId.get(itemId) ?? [];

    connectionUpdates.push({ itemId, status: sourceHealth });

    // Resolve per-user reconciliation window. Earliest wins so that when the
    // same Pluggy item is shared across users (shouldn't happen, but we are
    // defensive) we don't accidentally drop transactions a stricter user still
    // needs.
    let itemWindowStart = DEFAULT_RECONCILIATION_WINDOW_START;
    for (const target of itemTargets) {
      connectionUpserts.push({
        user_id: target.user_id,
        item_id: itemId,
        institution_name: target.institution_name || `Pluggy ${itemId}`,
        status: item.status,
        last_synced_at: input.now,
      });

      let userWindow = windowStartByUser.get(target.user_id);
      if (!userWindow) {
        userWindow = await loadUserWindowStart(input.supabase, target.user_id);
        windowStartByUser.set(target.user_id, userWindow);
      }
      if (userWindow < itemWindowStart) {
        itemWindowStart = userWindow;
      }
    }

    const accounts = await listPluggyAccounts({ baseUrl, apiKey, itemId }, fetchImpl);
    for (const account of accounts.results ?? []) {
      const transactions = await listPluggyTransactions(
        {
          baseUrl,
          apiKey,
          accountId: account.id,
          from: itemWindowStart,
        },
        fetchImpl,
      );

      for (const tx of transactions.results ?? []) {
        const transaction = toTransactionShape(tx);

        if (itemTargets.length === 0) {
          const normalized = normalizePluggyTransaction({
            sourceItemId: itemId,
            accountId: account.id,
            accountName: account.name ?? null,
            institutionName: null,
            marketingName: account.marketingName ?? null,
            accountType: account.type ?? null,
            accountSubtype: account.subtype ?? null,
            accountNumber: account.number ?? null,
            internalAccountId: null,
            transaction,
            windowStart: itemWindowStart,
          });

          if (normalized.out_of_scope) continue;

          const draft = buildCaseDraft({
            userId: 'unassigned',
            bankTransaction: {
              ...normalized,
              sourceHealth,
            },
            payables: [],
          });

          generatedCases.push({ confidence: draft.caseDraft.confidence });
          continue;
        }

        for (const target of itemTargets) {
          const targetWindow = windowStartByUser.get(target.user_id) ?? itemWindowStart;
          const normalized = normalizePluggyTransaction({
            sourceItemId: itemId,
            accountId: account.id,
            accountName: account.name ?? null,
            institutionName: target.institution_name,
            marketingName: account.marketingName ?? null,
            accountType: account.type ?? null,
            accountSubtype: account.subtype ?? null,
            accountNumber: account.number ?? null,
            internalAccountId: null,
            transaction,
            windowStart: targetWindow,
          });

          const currentRows = rowsByUser.get(target.user_id) ?? [];
          currentRows.push({
            source_item_id: normalized.source_item_id,
            external_id: normalized.external_id,
            account_name: normalized.account_name,
            external_account_id: normalized.external_account_id,
            internal_account_id: normalized.internal_account_id,
            amount: normalized.amount,
            date: normalized.date,
            description: normalized.description,
            raw_description: normalized.raw_description,
            sourceHealth,
            out_of_scope: normalized.out_of_scope,
          });
          rowsByUser.set(target.user_id, currentRows);
        }
      }
    }
  }

  if (input.supabase && connectionUpserts.length > 0) {
    const { error: connectionUpsertError } = await input.supabase
      .from('pluggy_connections')
      .upsert(connectionUpserts, { onConflict: 'user_id,item_id' });

    if (connectionUpsertError) {
      throw new Error(connectionUpsertError.message ?? 'Failed to update pluggy connections');
    }
  }

  if (input.supabase) {
    for (const [userId, rows] of rowsByUser.entries()) {
      const result = await materializeReconciliationRows(input.supabase, {
        userId,
        source: 'pluggy',
        rows,
        onConflict: 'user_id,source,external_id',
        refreshOpenCases: true,
      });

      persistedTransactions += result.importedCount;
      createdCases += result.createdCases;
      generatedCases.push(...result.generatedCases.map((item) => ({ confidence: item.confidence })));
    }
  }

  return {
    authenticatedThisRun: true,
    generatedCases,
    connectionUpdates,
    persistedTransactions,
    createdCases,
  };
}

if (import.meta.main) {
  serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase environment');
      }

      const supabase = createClient(supabaseUrl, serviceKey);
      const cronSecret = req.headers.get('x-cron-secret');
      const expectedCronSecret = Deno.env.get('CRON_SECRET');
      const rawAuth = req.headers.get('x-supabase-authorization') || req.headers.get('authorization');
      const hasJwtAuth = !!rawAuth && /^Bearer\s+.+/i.test(rawAuth);
      let scopedUserId: string | null = null;

      if (expectedCronSecret && !hasJwtAuth && cronSecret !== expectedCronSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!expectedCronSecret && !hasJwtAuth) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (hasJwtAuth && rawAuth) {
        const userToken = rawAuth.replace(/^Bearer\s+/i, '');
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser(userToken);

        if (authError || !user) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        scopedUserId = user.id;
      }

      const lockOwner = `poll-pluggy-reconciliation:${crypto.randomUUID()}`;
      const lockAcquired = await acquirePollLock(supabase, lockOwner);

      if (!lockAcquired) {
        return new Response(JSON.stringify({ skipped: true, reason: 'run_already_in_progress' }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const result = await runPluggyReconciliationPoll({
          env: Deno.env.toObject(),
          now: new Date().toISOString(),
          supabase,
          scopedUserId,
        });

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } finally {
        await releasePollLock(supabase, lockOwner);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
}
