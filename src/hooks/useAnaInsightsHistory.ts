export type StoredInsight = {
  timestamp: string;
  priority: 'celebration' | 'warning' | 'info' | 'critical';
  type: 'goal_achievement' | 'bill_alert' | 'investment_opportunity' | 'budget_warning' | 'portfolio_health' | 'savings_tip';
  headline: string;
  description: string;
};

const STORAGE_KEY = 'ana_insights_history_v1';

export function logInsights(primary: StoredInsight) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: StoredInsight[] = raw ? JSON.parse(raw) : [];
    const newItem = { ...primary, timestamp: new Date().toISOString() };
    const next = [newItem, ...list].slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function getInsightsHistory(days = 7): StoredInsight[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: StoredInsight[] = raw ? JSON.parse(raw) : [];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return list.filter((i) => new Date(i.timestamp).getTime() >= cutoff);
  } catch {
    return [];
  }
}

export function clearInsightsHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
