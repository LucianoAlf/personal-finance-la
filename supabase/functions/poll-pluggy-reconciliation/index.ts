import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  authenticatePluggy,
  getPluggyItem,
  listPluggyAccounts,
  listPluggyTransactions,
  type PluggyFetch,
} from '../_shared/pluggy-client.ts';
import { normalizePluggyTransaction } from '../_shared/bank-transaction-normalizer.ts';
import { scoreReconciliationCandidates } from '../_shared/reconciliation-matcher.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export interface WorkerInput {
  env: Record<string, string | undefined>;
  now: string;
  fetchImpl?: PluggyFetch;
}

export interface PollResult {
  authenticatedThisRun: boolean;
  generatedCases: Array<{ confidence: number }>;
  connectionUpdates: Array<{ itemId: string; status: string }>;
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

/**
 * Polls Pluggy per run: fresh `/auth` apiKey (never persisted), items → accounts → transactions,
 * then scores reconciliation candidates in memory (persist path: upsert bank_transactions, cases, connections — later).
 */
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

  const generatedCases: Array<{ confidence: number }> = [];
  const connectionUpdates: Array<{ itemId: string; status: string }> = [];

  for (const itemId of itemIds) {
    const item = await getPluggyItem({ baseUrl, apiKey, itemId }, fetchImpl);
    const sourceHealth = item.status === 'UPDATED' ? 'healthy' : 'stale';

    connectionUpdates.push({ itemId, status: sourceHealth });

    const accounts = await listPluggyAccounts({ baseUrl, apiKey, itemId }, fetchImpl);
    for (const account of accounts.results ?? []) {
      const transactions = await listPluggyTransactions(
        { baseUrl, apiKey, accountId: account.id },
        fetchImpl,
      );

      for (const tx of transactions.results ?? []) {
        const transaction = toTransactionShape(tx);
        const normalized = normalizePluggyTransaction({
          sourceItemId: itemId,
          accountId: account.id,
          accountName: account.name ?? null,
          internalAccountId: null,
          transaction,
        });

        const score = scoreReconciliationCandidates({
          bankTransaction: {
            amount: normalized.amount,
            date: normalized.date,
            description: normalized.description,
            sourceHealth,
          },
          payables: [],
          transactions: [],
          accounts: [],
        });

        generatedCases.push({ confidence: score.bestMatch?.confidence ?? 0 });
      }
    }
  }

  return { authenticatedThisRun: true, generatedCases, connectionUpdates };
}

if (import.meta.main) {
  serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const result = await runPluggyReconciliationPoll({
        env: Deno.env.toObject(),
        now: new Date().toISOString(),
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  });
}
