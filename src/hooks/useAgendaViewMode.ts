import { useEffect, useState } from 'react';

export type CalendarViewMode = 'month' | 'week' | 'day';

const STORAGE_KEY = 'agenda-view-mode';
const VALID: ReadonlySet<CalendarViewMode> = new Set(['month', 'week', 'day']);

function readStored(fallback: CalendarViewMode): CalendarViewMode {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as CalendarViewMode) ? (raw as CalendarViewMode) : fallback;
}

export function useAgendaViewMode(defaultMode: CalendarViewMode = 'month') {
  const [mode, setMode] = useState<CalendarViewMode>(() => readStored(defaultMode));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return [mode, setMode] as const;
}
