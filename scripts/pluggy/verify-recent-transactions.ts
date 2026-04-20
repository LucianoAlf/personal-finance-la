#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Lista transações Pluggy por item num intervalo de datas.
 *
 * Fontes de item ids (deduplicadas por UUID):
 * - Todas as variáveis `PLUGGY_ITEM_ID_*` (ex.: PLUGGY_ITEM_ID_NUBANK) — mesmo padrão do `poll-pluggy-reconciliation`
 * - Opcional: `PLUGGY_ITEM_IDS` — lista separada por vírgula e/ou espaço; aceita `NOME=uuid` ou só `uuid`
 *
 * Uso (na raiz do repo):
 *   deno run --env-file=.env.local --allow-net --allow-env --allow-read scripts/pluggy/verify-recent-transactions.ts
 *
 * Opcional: FROM=2026-04-18 TO=2026-04-21
 */
import {
  authenticatePluggy,
  listPluggyAccounts,
  listPluggyTransactions,
} from '../../supabase/functions/_shared/pluggy-client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function collectPluggyItems(): Array<{ label: string; itemId: string }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; itemId: string }> = [];

  const env = Deno.env.toObject();

  for (const [key, value] of Object.entries(env).sort(([a], [b]) => a.localeCompare(b))) {
    if (!key.startsWith('PLUGGY_ITEM_ID_') || key === 'PLUGGY_ITEM_IDS') continue;
    const itemId = value?.trim();
    if (!itemId || !UUID_RE.test(itemId)) continue;
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    out.push({ label: key, itemId });
  }

  const rawList = env['PLUGGY_ITEM_IDS']?.trim();
  if (rawList) {
    const parts = rawList.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const eq = part.indexOf('=');
      let name: string;
      let id: string;
      if (eq !== -1) {
        name = part.slice(0, eq).trim();
        id = part.slice(eq + 1).trim();
      } else {
        name = 'PLUGGY_ITEM_IDS';
        id = part;
      }
      if (!UUID_RE.test(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ label: `${name} (${'PLUGGY_ITEM_IDS'})`, itemId: id });
    }
  }

  return out;
}

const baseUrl = Deno.env.get('PLUGGY_BASE_URL') ?? 'https://api.pluggy.ai';
const clientId = Deno.env.get('PLUGGY_CLIENT_ID');
const clientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

const from = Deno.env.get('FROM') ?? '2026-04-18';
const to = Deno.env.get('TO') ?? new Date().toISOString().slice(0, 10);

if (!clientId || !clientSecret) {
  console.error('Missing PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET');
  Deno.exit(1);
}

const items = collectPluggyItems();
if (items.length === 0) {
  console.error(
    'Nenhum item Pluggy: defina PLUGGY_ITEM_ID_<BANCO>=uuid e/ou PLUGGY_ITEM_IDS=uuid1,uuid2 (veja .env.example).',
  );
  Deno.exit(1);
}

const apiKey = await authenticatePluggy({ baseUrl, clientId, clientSecret }, fetch);

for (const { label, itemId } of items) {
  console.log(`\n=== ${label} item=${itemId.slice(0, 8)}… ===`);
  const { results: accounts } = await listPluggyAccounts(
    { baseUrl, apiKey, itemId },
    fetch,
  );
  for (const acc of accounts) {
    const { results: txs } = await listPluggyTransactions(
      {
        baseUrl,
        apiKey,
        accountId: acc.id,
        from,
        to,
        pageSize: 100,
      },
      fetch,
    );
    const accountLabel = [acc.marketingName, acc.name, acc.subtype].filter(Boolean).join(' / ');
    console.log(`  account ${acc.id.slice(0, 8)}… ${accountLabel}`);
    if (txs.length === 0) {
      console.log('    (nenhuma transação no intervalo)');
      continue;
    }
    for (const t of txs) {
      console.log(
        `    ${t.date.slice(0, 10)}  ${String(t.amount).padStart(12)}  ${t.description.slice(0, 80)}`,
      );
    }
  }
}
