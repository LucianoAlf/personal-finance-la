import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RECONCILIATION_WINDOW_START,
  isWithinWindow,
  resolveReconciliationWindow,
} from './reconciliation-window';

describe('resolveReconciliationWindow', () => {
  it('falls back to the configured user cutoff when preset is window_default', () => {
    const window = resolveReconciliationWindow({
      presetId: 'window_default',
      userWindowStart: '2026-04-01',
      now: new Date('2026-04-16T12:00:00Z'),
    });

    expect(window.startDate).toBe('2026-04-01');
    expect(window.endDate).toBeNull();
    expect(window.label).toMatch(/01\/04\/2026/);
  });

  it('uses the global default when the user has no configured cutoff', () => {
    const window = resolveReconciliationWindow({
      presetId: 'window_default',
      userWindowStart: null,
      now: new Date('2026-04-16T12:00:00Z'),
    });

    expect(window.startDate).toBe(DEFAULT_RECONCILIATION_WINDOW_START);
  });

  it('computes rolling windows for last_30d', () => {
    const window = resolveReconciliationWindow({
      presetId: 'last_30d',
      userWindowStart: '2026-04-01',
      now: new Date('2026-04-30T00:00:00Z'),
    });

    expect(window.startDate).toBe('2026-04-01');
  });

  it('computes rolling windows for last_90d', () => {
    const window = resolveReconciliationWindow({
      presetId: 'last_90d',
      userWindowStart: '2026-04-01',
      now: new Date('2026-04-30T00:00:00Z'),
    });

    expect(window.startDate).toBe('2026-01-31');
  });

  it('exposes all_time with null bounds so callers know they are in historical mode', () => {
    const window = resolveReconciliationWindow({
      presetId: 'all_time',
      userWindowStart: '2026-04-01',
    });

    expect(window.startDate).toBeNull();
    expect(window.endDate).toBeNull();
    expect(window.presetId).toBe('all_time');
  });
});

describe('isWithinWindow', () => {
  const window = resolveReconciliationWindow({
    presetId: 'window_default',
    userWindowStart: '2026-04-01',
  });

  it('accepts dates on or after the window start', () => {
    expect(isWithinWindow('2026-04-01', window)).toBe(true);
    expect(isWithinWindow('2026-05-13', window)).toBe(true);
  });

  it('rejects dates before the window start', () => {
    expect(isWithinWindow('2026-03-31', window)).toBe(false);
    expect(isWithinWindow('2025-12-22', window)).toBe(false);
  });

  it('returns true for null-start windows (all_time)', () => {
    const allTime = resolveReconciliationWindow({ presetId: 'all_time' });
    expect(isWithinWindow('2020-01-01', allTime)).toBe(true);
  });

  it('rejects undefined/empty dates when a window is active', () => {
    expect(isWithinWindow(null, window)).toBe(false);
    expect(isWithinWindow(undefined, window)).toBe(false);
  });
});
