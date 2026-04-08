type ProfileSource = {
  full_name?: string | null;
  avatar_url?: string | null;
} | null | undefined;

type SettingsSource = {
  display_name?: string | null;
  avatar_url?: string | null;
} | null | undefined;

type UserSource = {
  email?: string | null;
} | null | undefined;

function normalizeText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function resolveUserDisplayName(
  profile?: ProfileSource,
  settings?: SettingsSource,
  user?: UserSource,
): string {
  return (
    normalizeText(profile?.full_name) ||
    normalizeText(settings?.display_name) ||
    normalizeText(user?.email)?.split('@')[0] ||
    'Usuário'
  );
}

export function resolveUserAvatarUrl(
  profile?: ProfileSource,
  settings?: SettingsSource,
): string | null {
  return normalizeText(profile?.avatar_url) || normalizeText(settings?.avatar_url);
}

export function getUserInitials(name?: string | null, email?: string | null): string {
  const resolvedName = normalizeText(name);
  if (!resolvedName) {
    return email?.charAt(0).toUpperCase() || 'U';
  }

  return resolvedName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
