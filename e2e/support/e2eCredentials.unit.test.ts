import { describe, expect, it } from 'vitest';

import { loadE2ECredentials } from './e2eCredentials';

describe('loadE2ECredentials', () => {
  it('prefers explicit environment variables over file fallback', () => {
    const credentials = loadE2ECredentials({
      env: {
        E2E_EMAIL: 'env@example.com',
        E2E_PASSWORD: 'env-secret',
      },
      fileExists: () => true,
      readFile: () => 'E2E_EMAIL=file@example.com\nE2E_PASSWORD=file-secret\n',
    });

    expect(credentials).toEqual({
      email: 'env@example.com',
      password: 'env-secret',
      source: 'env',
    });
  });

  it('loads credentials from .env-style content when env vars are absent', () => {
    const credentials = loadE2ECredentials({
      env: {},
      fileExists: () => true,
      readFile: () => 'E2E_EMAIL=file@example.com\nE2E_PASSWORD=file-secret\n',
    });

    expect(credentials).toEqual({
      email: 'file@example.com',
      password: 'file-secret',
      source: 'file',
    });
  });
});
