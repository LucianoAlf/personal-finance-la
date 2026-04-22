import { useEffect, useState } from 'react';

export type GoalsTab = 'savings' | 'spending' | 'investments' | 'progress' | 'config';

const STORAGE_KEY = 'metas-active-tab';
const VALID: ReadonlySet<GoalsTab> = new Set([
  'savings', 'spending', 'investments', 'progress', 'config',
]);

function readStored(fallback: GoalsTab): GoalsTab {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as GoalsTab) ? (raw as GoalsTab) : fallback;
}

export function useGoalsActiveTab(defaultTab: GoalsTab = 'savings') {
  const [tab, setTab] = useState<GoalsTab>(() => readStored(defaultTab));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  return [tab, setTab] as const;
}
