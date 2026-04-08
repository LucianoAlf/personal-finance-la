/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { formatCurrency as formatLegacyCurrency } from '@/utils/formatters';
import {
  getAppliedUserPreferences,
  resetAppliedUserPreferences,
  setAppliedUserPreferences,
} from './appliedUserPreferences';

describe('applied user preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppliedUserPreferences();
  });

  afterEach(() => {
    localStorage.clear();
    resetAppliedUserPreferences();
  });

  it('stores and reads the canonical applied preferences', () => {
    setAppliedUserPreferences({
      language: 'en-US',
      currency: 'USD',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      theme: 'dark',
    });

    expect(getAppliedUserPreferences()).toMatchObject({
      language: 'en-US',
      currency: 'USD',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      theme: 'dark',
    });
  });

  it('makes legacy currency formatting follow the active applied preferences', () => {
    setAppliedUserPreferences({
      language: 'en-US',
      currency: 'USD',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      theme: 'light',
    });

    expect(formatLegacyCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats dates and datetimes using the configured timezone', () => {
    const iso = '2026-04-07T02:30:00Z';

    expect(formatDate(iso, 'DD/MM/YYYY', 'pt-BR', 'America/Sao_Paulo')).toBe('06/04/2026');
    expect(formatDateTime(iso, 'DD/MM/YYYY', 'pt-BR', 'America/Sao_Paulo')).toBe('06/04/2026 23:30');
  });
});
