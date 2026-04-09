import { supabase } from '@/lib/supabase';

interface RequestTickTickSyncOptions {
  reason: string;
}

const MIN_TICKTICK_SYNC_INTERVAL_MS = 5000;

let lastSyncStartedAt = 0;
let inFlightSync: Promise<void> | null = null;

export async function requestTickTickSync({
  reason,
}: RequestTickTickSyncOptions): Promise<void> {
  const now = Date.now();
  if (inFlightSync) {
    return inFlightSync;
  }
  if (now - lastSyncStartedAt < MIN_TICKTICK_SYNC_INTERVAL_MS) {
    return;
  }

  lastSyncStartedAt = now;
  inFlightSync = (async () => {
    const { error } = await supabase.functions.invoke('calendar-sync-ticktick', {
      body: { reason },
    });
    if (error) {
      throw error;
    }
  })()
    .catch((error) => {
      console.warn('[ticktick-sync] sync-now request failed:', error);
    })
    .finally(() => {
      inFlightSync = null;
    });

  return inFlightSync;
}
