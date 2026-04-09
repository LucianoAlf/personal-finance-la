import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptIntegrationSecretPlain,
  resolveTickTickApiToken,
} from '../integration-token';

describe('integration-token (TickTick)', () => {
  const prev = process.env.INTEGRATION_SECRETS_KEY;

  beforeEach(() => {
    process.env.INTEGRATION_SECRETS_KEY = 'test-key-material-for-vitest-only-32bytes!!';
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.INTEGRATION_SECRETS_KEY;
    else process.env.INTEGRATION_SECRETS_KEY = prev;
  });

  it('round-trips plaintext via enc1 prefix', async () => {
    const enc = await encryptIntegrationSecretPlain('tp_secret_abc');
    expect(enc.startsWith('enc1:')).toBe(true);
    const out = await resolveTickTickApiToken(enc);
    expect(out).toBe('tp_secret_abc');
  });

  it('passes through legacy plaintext when no enc1 prefix', async () => {
    const out = await resolveTickTickApiToken('tp_plain_legacy');
    expect(out).toBe('tp_plain_legacy');
  });

  it('returns undefined for empty stored value', async () => {
    expect(await resolveTickTickApiToken(null)).toBeUndefined();
    expect(await resolveTickTickApiToken('')).toBeUndefined();
  });
});
