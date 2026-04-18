/**
 * Central toggle for leaking UUIDs / raw Pluggy payloads / low-level debug data
 * to the operational UI. Default is OFF so operators never see txId,
 * payable_bill_id, item_id, or raw heuristic strings. Engineers can flip it on
 * by appending ?debug=1 to the URL.
 */
export function isReconciliationDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('debug');
    return value === '1' || value === 'true';
  } catch {
    return false;
  }
}

/**
 * Masks a UUID-ish identifier so it can still be displayed under debug mode but
 * never leaks full internal IDs to end users. Example:
 *   "a7b4c2de-1234-5678-9abc-def012345678" -> "a7b4 \u2026 5678"
 */
export function maskIdentifier(id: string | null | undefined): string {
  if (!id) return '';
  const clean = id.trim();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} \u2026 ${clean.slice(-4)}`;
}
