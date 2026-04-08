import type { UserSettings } from '@/types/settings.types';

export interface AppliedUserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
}

const STORAGE_KEY = 'PF_APPLIED_USER_PREFERENCES';

export const DEFAULT_APPLIED_USER_PREFERENCES: AppliedUserPreferences = {
  theme: 'auto',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'pt-BR',
};

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadStoredPreferences(): AppliedUserPreferences {
  if (!isBrowser()) {
    return { ...DEFAULT_APPLIED_USER_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_APPLIED_USER_PREFERENCES };
    }

    return {
      ...DEFAULT_APPLIED_USER_PREFERENCES,
      ...(JSON.parse(raw) as Partial<AppliedUserPreferences>),
    };
  } catch {
    return { ...DEFAULT_APPLIED_USER_PREFERENCES };
  }
}

let currentAppliedUserPreferences = loadStoredPreferences();

function persistAppliedUserPreferences() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAppliedUserPreferences));
}

export function getAppliedUserPreferences(): AppliedUserPreferences {
  return { ...currentAppliedUserPreferences };
}

export function setAppliedUserPreferences(
  next: Partial<AppliedUserPreferences>,
): AppliedUserPreferences {
  currentAppliedUserPreferences = {
    ...currentAppliedUserPreferences,
    ...next,
  };

  persistAppliedUserPreferences();
  return getAppliedUserPreferences();
}

export function resetAppliedUserPreferences() {
  currentAppliedUserPreferences = { ...DEFAULT_APPLIED_USER_PREFERENCES };
}

export function mapUserSettingsToAppliedUserPreferences(
  userSettings: Pick<
    UserSettings,
    'theme' | 'language' | 'timezone' | 'currency' | 'date_format' | 'number_format'
  >,
): AppliedUserPreferences {
  return {
    theme: userSettings.theme || DEFAULT_APPLIED_USER_PREFERENCES.theme,
    language: userSettings.language || DEFAULT_APPLIED_USER_PREFERENCES.language,
    timezone: userSettings.timezone || DEFAULT_APPLIED_USER_PREFERENCES.timezone,
    currency: userSettings.currency || DEFAULT_APPLIED_USER_PREFERENCES.currency,
    dateFormat: userSettings.date_format || DEFAULT_APPLIED_USER_PREFERENCES.dateFormat,
    numberFormat: userSettings.number_format || DEFAULT_APPLIED_USER_PREFERENCES.numberFormat,
  };
}
