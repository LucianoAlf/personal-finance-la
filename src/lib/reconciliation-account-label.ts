import type { BankTransactionRow, PluggyConnectionRow } from '@/types/reconciliation';

/**
 * Bank rows ingested BEFORE the account-label heuristic was applied (Onda 1)
 * still carry raw Pluggy design codenames such as `ultraviolet-black` or
 * `nubank-ultravioleta-credito` in `account_name`. We cannot silently rewrite
 * the database row because older audit entries reference it, but we can refuse
 * to leak the codename on screen.
 *
 * This client-side sanitizer is purely cosmetic: given a stored label + the
 * linked Pluggy connection, it returns the best humane string we can assemble.
 */

const CODENAME_TOKENS = new Set([
  'ultraviolet',
  'ultravioleta',
  'violet',
  'nubank-ultravioleta',
  'platinum',
  'platina',
  'obsidian',
  'onyx',
  'gold',
  'silver',
  'black',
  'blue',
  'roxinho',
  'roxinho-credito',
  'infinite',
  'rewards',
  'pro',
]);

const SURFACE_TOKENS: Record<string, string> = {
  credito: 'cartao de credito',
  credit: 'cartao de credito',
  card: 'cartao',
  debito: 'debito',
  corrente: 'conta corrente',
  checking: 'conta corrente',
  poupanca: 'poupanca',
  savings: 'poupanca',
};

function isDesignCodename(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const value = raw.trim();
  if (!value) return true;
  if (value.length > 48) return false;
  const lower = value.toLowerCase();

  if (!/[a-z]/.test(lower)) return false;
  if (!lower.includes('-')) return false;

  const tokens = lower.split(/[-_\s]+/).filter(Boolean);
  if (tokens.length < 2) return false;

  const designHits = tokens.filter((token) => CODENAME_TOKENS.has(token)).length;
  if (designHits >= 1) return true;

  const allShortLower = tokens.every((token) => token.length <= 12 && /^[a-z0-9]+$/.test(token));
  return allShortLower && tokens.length <= 4;
}

function pickSurface(tokens: string[]): string | null {
  for (const token of tokens) {
    const mapped = SURFACE_TOKENS[token];
    if (mapped) return mapped;
  }
  return null;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

export interface AccountLabelContext {
  storedName: string | null | undefined;
  institutionName?: string | null;
  sourceHint?: BankTransactionRow['source'] | null;
}

/**
 * Resolves a human-friendly account label for the UI, replacing leaked Pluggy
 * design codenames with institution + surface. If nothing usable is known,
 * falls back to a generic "Conta bancaria" so we never render raw codenames.
 */
export function resolveDisplayAccountLabel(ctx: AccountLabelContext): string {
  const stored = (ctx.storedName ?? '').trim();

  if (!isDesignCodename(stored)) {
    return titleCase(stored);
  }

  const institution = ctx.institutionName?.trim();
  const tokens = stored.toLowerCase().split(/[-_\s]+/).filter(Boolean);
  const surface = pickSurface(tokens);

  if (institution) {
    return surface ? `${institution} \u2022 ${surface}` : institution;
  }

  if (ctx.sourceHint === 'pluggy') return 'Conta Pluggy nao identificada';
  if (ctx.sourceHint === 'csv_upload') return 'Conta do CSV importado';
  if (ctx.sourceHint === 'manual_paste') return 'Conta colada manualmente';
  return 'Conta bancaria';
}

/**
 * Convenience for components that have a connections list and want a cached
 * resolver. Maps source_item_id -> institution_name once, then defers to
 * `resolveDisplayAccountLabel` on each call.
 */
export function createAccountLabelResolver(connections: PluggyConnectionRow[]) {
  const institutionByItem = new Map(
    connections.map((connection) => [connection.item_id, connection.institution_name]),
  );

  return (bank: Pick<BankTransactionRow, 'account_name' | 'source' | 'source_item_id'> | null | undefined) => {
    if (!bank) return 'Conta nao identificada';
    const institutionName = bank.source_item_id ? institutionByItem.get(bank.source_item_id) ?? null : null;
    return resolveDisplayAccountLabel({
      storedName: bank.account_name,
      institutionName,
      sourceHint: bank.source,
    });
  };
}
