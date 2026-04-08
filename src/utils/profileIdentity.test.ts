import { describe, expect, it } from 'vitest';
import { resolveUserAvatarUrl, resolveUserDisplayName } from './profileIdentity';

describe('profile identity resolution', () => {
  it('prefers auth profile identity over duplicated settings fields', () => {
    expect(
      resolveUserDisplayName(
        { full_name: 'Luciano Perfil' },
        { display_name: 'Luciano Settings' },
        { email: 'luciano@example.com' },
      ),
    ).toBe('Luciano Perfil');
  });

  it('falls back to settings name and then email prefix when profile is unavailable', () => {
    expect(
      resolveUserDisplayName(
        null,
        { display_name: 'Luciano Settings' },
        { email: 'luciano@example.com' },
      ),
    ).toBe('Luciano Settings');

    expect(resolveUserDisplayName(null, null, { email: 'luciano@example.com' })).toBe('luciano');
  });

  it('prefers profile avatar and falls back to settings avatar', () => {
    expect(
      resolveUserAvatarUrl(
        { avatar_url: 'https://example.com/profile.png' },
        { avatar_url: 'https://example.com/settings.png' },
      ),
    ).toBe('https://example.com/profile.png');

    expect(
      resolveUserAvatarUrl(
        { avatar_url: null },
        { avatar_url: 'https://example.com/settings.png' },
      ),
    ).toBe('https://example.com/settings.png');
  });
});
