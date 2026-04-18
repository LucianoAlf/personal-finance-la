import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import {
  DEFAULT_RECONCILIATION_WINDOW_START,
  resolveReconciliationWindow,
} from '@/lib/reconciliation-window';
import type {
  ReconciliationWindow,
  ReconciliationWindowPresetId,
} from '@/types/reconciliation';

const USER_SETTINGS_WINDOW_KEY = ['user-settings', 'reconciliation-window-start'] as const;

export interface ReconciliationWindowPreset {
  id: ReconciliationWindowPresetId;
  label: string;
  helper: string;
  /**
   * When true, the preset bypasses the per-user cutoff and pulls historical
   * data. We surface it as a dedicated visual state so the operator never
   * confuses "Tudo" with the default operational view.
   */
  historical?: boolean;
}

export const RECONCILIATION_WINDOW_PRESETS: ReconciliationWindowPreset[] = [
  {
    id: 'window_default',
    label: 'Abril/26 em diante',
    helper: 'Janela operacional padrão (default do sistema).',
  },
  {
    id: 'last_30d',
    label: 'Últimos 30 dias',
    helper: 'Janela móvel útil para operar o último mês.',
  },
  {
    id: 'last_90d',
    label: 'Últimos 90 dias',
    helper: 'Janela móvel trimestral para revisões pontuais.',
  },
  {
    id: 'all_time',
    label: 'Tudo (histórico)',
    helper: 'Visão histórica. Não use como operação diária.',
    historical: true,
  },
];

/**
 * Fetches the user's configured reconciliation cutoff. Returns the default
 * global cutoff when the row is missing so the UI never has to juggle
 * sentinel values.
 */
async function fetchUserWindowStart(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_RECONCILIATION_WINDOW_START;

  const { data, error } = await supabase
    .from('user_settings')
    .select('reconciliation_window_start')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return DEFAULT_RECONCILIATION_WINDOW_START;
  const raw = (data as { reconciliation_window_start?: string | null } | null)?.reconciliation_window_start;
  if (!raw) return DEFAULT_RECONCILIATION_WINDOW_START;
  return typeof raw === 'string' && raw.length >= 10 ? raw.slice(0, 10) : DEFAULT_RECONCILIATION_WINDOW_START;
}

export function useReconciliationWindow() {
  const queryClient = useQueryClient();
  const [presetId, setPresetId] = useState<ReconciliationWindowPresetId>('window_default');

  const { data: userWindowStart, isLoading } = useQuery({
    queryKey: USER_SETTINGS_WINDOW_KEY,
    queryFn: fetchUserWindowStart,
    staleTime: 5 * 60 * 1000,
  });

  const window: ReconciliationWindow = useMemo(
    () =>
      resolveReconciliationWindow({
        presetId,
        userWindowStart: userWindowStart ?? null,
      }),
    [presetId, userWindowStart],
  );

  const persistUserWindowStart = useCallback(
    async (nextStartIso: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_settings')
        .upsert(
          { user_id: user.id, reconciliation_window_start: nextStartIso },
          { onConflict: 'user_id' },
        );

      queryClient.setQueryData(USER_SETTINGS_WINDOW_KEY, nextStartIso);
    },
    [queryClient],
  );

  useEffect(() => {
    // No side effects for now. Reserved for future analytics hooks.
  }, [presetId]);

  return {
    window,
    presetId,
    setPresetId,
    persistUserWindowStart,
    userWindowStart: userWindowStart ?? DEFAULT_RECONCILIATION_WINDOW_START,
    isLoading,
    presets: RECONCILIATION_WINDOW_PRESETS,
  };
}
