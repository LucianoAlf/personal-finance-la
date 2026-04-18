import { describe, expect, it } from 'vitest';

import {
  createAccountLabelResolver,
  resolveDisplayAccountLabel,
} from './reconciliation-account-label';

describe('resolveDisplayAccountLabel', () => {
  it('replaces ultraviolet-black codename with Nubank institution', () => {
    const label = resolveDisplayAccountLabel({
      storedName: 'ultraviolet-black',
      institutionName: 'Nubank',
      sourceHint: 'pluggy',
    });
    expect(label).toBe('Nubank');
  });

  it('pairs institution with surface when surface token is present', () => {
    const label = resolveDisplayAccountLabel({
      storedName: 'ultraviolet-black-credito',
      institutionName: 'Nubank',
      sourceHint: 'pluggy',
    });
    expect(label).toBe('Nubank \u2022 cartao de credito');
  });

  it('keeps real, operator-friendly names untouched (title-cased)', () => {
    const label = resolveDisplayAccountLabel({
      storedName: 'conta corrente bradesco',
      institutionName: 'Bradesco',
    });
    expect(label).toBe('Conta Corrente Bradesco');
  });

  it('falls back to a generic label when nothing is known', () => {
    const label = resolveDisplayAccountLabel({
      storedName: 'platinum-gold',
      institutionName: null,
      sourceHint: 'pluggy',
    });
    expect(label).toBe('Conta Pluggy nao identificada');
  });

  it('never leaks the raw codename even without institution context', () => {
    const label = resolveDisplayAccountLabel({
      storedName: 'ultraviolet-black',
    });
    expect(label.toLowerCase()).not.toContain('ultraviolet');
    expect(label.toLowerCase()).not.toContain('-');
  });
});

describe('createAccountLabelResolver', () => {
  it('maps source_item_id to institution and applies the sanitizer', () => {
    const resolve = createAccountLabelResolver([
      {
        id: 'conn-1',
        user_id: 'user-1',
        item_id: 'item-42',
        institution_name: 'Itau',
        status: 'UPDATED',
        last_synced_at: null,
        staleness_threshold_hours: 24,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ]);

    expect(
      resolve({
        account_name: 'ultraviolet-black',
        source: 'pluggy',
        source_item_id: 'item-42',
      }),
    ).toBe('Itau');

    expect(resolve(null)).toBe('Conta nao identificada');
  });
});
