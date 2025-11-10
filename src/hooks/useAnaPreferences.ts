export type AnaPreferences = {
  tone: 'formal' | 'casual' | 'motivacional';
  focus: { bills: boolean; investments: boolean; goals: boolean };
  insightCount: 3 | 2 | 1;
  disableCharts: boolean;
};

const STORAGE_KEY = 'ana_dashboard_preferences_v1';

export const defaultPreferences: AnaPreferences = {
  tone: 'motivacional',
  focus: { bills: true, investments: true, goals: true },
  insightCount: 3,
  disableCharts: false,
};

export function getPreferences(): AnaPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: AnaPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}
