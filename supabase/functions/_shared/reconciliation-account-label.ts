// Shared resolver for human-friendly account labels.
//
// Pluggy's /accounts endpoint returns fields that are NOT safe to surface
// directly to end users. Common failure modes we observed in production:
//
//   * Nubank credit cards ship as `name = "ultraviolet-black"` (the design
//     codename), which looks like leaked metadata in the UI.
//   * Marketing names sometimes contain the bank slogan, not a label the
//     operator would recognize ("A melhor conta digital do Brasil").
//   * Some issuers only populate `number` with the masked tail.
//
// This module centralizes the logic so the normalizer (ingestion), the
// workspace query (read path), and the UI all render the same string:
//
//     "<Institution> | <Surface> | <final 4>"
//
// e.g. "Nubank \u2022 cartao final 1234" or "Mercado Pago \u2022 conta corrente final 0022".

export interface RawAccountLabelInput {
  institutionName?: string | null;
  accountName?: string | null;
  marketingName?: string | null;
  type?: string | null;
  subtype?: string | null;
  number?: string | null;
}

/**
 * Heuristic list of Pluggy account.name values that we must hide from operators
 * because they are design/product codenames rather than account identifiers.
 * Detection is conservative: any token that looks like a Nubank card design
 * (color-color or "nu-<color>") matches, plus a manual deny list.
 */
const DESIGN_CODENAME_DENY_LIST = new Set([
  'ultraviolet-black',
  'ultra-violet-black',
  'mastercard-black',
  'platinum-black',
  'gold-standard',
]);

const COLOR_TOKEN_REGEX = /^(nu-)?[a-z]+-(black|platinum|gold|silver|pro|premium|plus|standard)$/i;

export function looksLikeDesignCodename(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (DESIGN_CODENAME_DENY_LIST.has(normalized)) return true;
  return COLOR_TOKEN_REGEX.test(normalized);
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function surfaceForType(type: string | null | undefined, subtype: string | null | undefined): string | null {
  const normalizedSub = (subtype ?? '').toUpperCase();
  const normalizedType = (type ?? '').toUpperCase();

  if (normalizedSub === 'CREDIT_CARD' || normalizedType === 'CREDIT') {
    return 'cartao';
  }
  if (normalizedSub === 'SAVINGS_ACCOUNT') {
    return 'poupanca';
  }
  if (normalizedSub === 'CHECKING_ACCOUNT' || normalizedType === 'BANK') {
    return 'conta corrente';
  }
  if (normalizedSub.length > 0) {
    return normalizedSub.replace(/_/g, ' ').toLowerCase();
  }
  return null;
}

function maskedTail(rawNumber: string | null | undefined): string | null {
  if (!rawNumber) return null;
  const digits = rawNumber.replace(/\D+/g, '');
  if (digits.length >= 4) {
    return digits.slice(-4);
  }
  // Fall back to the literal string when Pluggy returns already masked values like "****".
  const trimmed = rawNumber.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Returns a human-friendly label. Guarantees a non-empty string so callers can
 * store it directly in `bank_transactions.account_name` without null checks.
 * Ordering of the pieces is deterministic for test reliability.
 */
export function resolveAccountLabel(input: RawAccountLabelInput): string {
  const institution = input.institutionName?.trim() ?? '';
  const marketing = input.marketingName?.trim() ?? '';
  const raw = input.accountName?.trim() ?? '';
  const surface = surfaceForType(input.type, input.subtype);
  const tail = maskedTail(input.number);

  const usableMarketing = marketing && !looksLikeDesignCodename(marketing) ? marketing : '';
  const usableRaw = raw && !looksLikeDesignCodename(raw) ? raw : '';

  const mainSegments: string[] = [];
  if (institution) {
    mainSegments.push(institution);
  }

  const secondary = [usableMarketing, usableRaw].filter(Boolean).join(' / ');
  if (secondary) {
    mainSegments.push(secondary);
  } else if (surface) {
    mainSegments.push(surface);
  }

  if (tail) {
    mainSegments.push(`final ${tail}`);
  }

  if (mainSegments.length === 0) {
    return 'Conta sem identificacao';
  }

  return normalizeSpaces(mainSegments.join(' \u2022 '));
}
