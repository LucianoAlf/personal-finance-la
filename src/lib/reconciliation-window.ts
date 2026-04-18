import type {
  ReconciliationWindow,
  ReconciliationWindowPresetId,
} from '@/types/reconciliation';

export const DEFAULT_RECONCILIATION_WINDOW_START = '2026-04-01';

export interface ResolveWindowInput {
  presetId: ReconciliationWindowPresetId;
  /**
   * Per-user cutoff coming from `user_settings.reconciliation_window_start`.
   * Falls back to `DEFAULT_RECONCILIATION_WINDOW_START` when null/undefined.
   */
  userWindowStart?: string | null;
  /** Injectable for deterministic tests. */
  now?: Date;
}

function isoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatBrDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Resolves the active reconciliation window for the UI.
 *
 * Contract:
 *   - `window_default`  : respect the user's configured cutoff (today: 01/04/2026).
 *   - `last_30d`        : rolling 30-day window ending today.
 *   - `last_90d`        : rolling 90-day window ending today.
 *   - `all_time`        : no filter \u2013 historical / audit view only.
 */
export function resolveReconciliationWindow(input: ResolveWindowInput): ReconciliationWindow {
  const now = input.now ?? new Date();
  const userCutoff = input.userWindowStart?.slice(0, 10) || DEFAULT_RECONCILIATION_WINDOW_START;

  switch (input.presetId) {
    case 'all_time':
      return {
        presetId: 'all_time',
        startDate: null,
        endDate: null,
        label: 'Tudo (histórico)',
      };
    case 'last_30d': {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 29);
      const startIso = isoDate(start);
      return {
        presetId: 'last_30d',
        startDate: startIso,
        endDate: null,
        label: `Últimos 30 dias (${formatBrDate(startIso)} em diante)`,
      };
    }
    case 'last_90d': {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 89);
      const startIso = isoDate(start);
      return {
        presetId: 'last_90d',
        startDate: startIso,
        endDate: null,
        label: `Últimos 90 dias (${formatBrDate(startIso)} em diante)`,
      };
    }
    case 'window_default':
    default:
      return {
        presetId: 'window_default',
        startDate: userCutoff,
        endDate: null,
        label: `${formatBrDate(userCutoff)} em diante`,
      };
  }
}

/** Returns true when `dateIso` falls inside the window. null startDate means "no limit". */
export function isWithinWindow(dateIso: string | null | undefined, window: ReconciliationWindow): boolean {
  if (!window.startDate) return true;
  if (!dateIso) return false;
  const normalized = dateIso.slice(0, 10);
  if (window.startDate && normalized < window.startDate) return false;
  if (window.endDate && normalized > window.endDate) return false;
  return true;
}
