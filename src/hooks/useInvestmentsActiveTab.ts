import { useEffect, useState } from 'react';

export type InvestmentTab = 'portfolio' | 'transactions' | 'dividends' | 'alerts' | 'overview';

const STORAGE_KEY = 'investments-active-tab';
const VALID: ReadonlySet<InvestmentTab> = new Set([
  'portfolio',
  'transactions',
  'dividends',
  'alerts',
  'overview',
]);

function readStored(fallback: InvestmentTab): InvestmentTab {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as InvestmentTab) ? (raw as InvestmentTab) : fallback;
}

export function useInvestmentsActiveTab(defaultTab: InvestmentTab = 'portfolio') {
  const [tab, setTab] = useState<InvestmentTab>(() => readStored(defaultTab));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, tab);
  }, [tab]);

  return [tab, setTab] as const;
}
