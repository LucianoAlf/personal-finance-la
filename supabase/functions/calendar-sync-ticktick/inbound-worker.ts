import {
  mapTickTickTaskToCalendarEventInput,
  resolveInboundCalendarEventKind,
  shouldRouteInboundTaskToFinancialSurface,
  type CalendarEventInboundInput,
  type TickTickTaskInbound,
} from './ticktick-mapping.ts';

export interface UnlinkedInboundTaskRoutingConfig {
  ticktick_default_list_mappings: Record<string, { event_kind?: string } | undefined> | null;
}

export function resolveInboundSyncProjectIds(params: {
  ticktickDefaultListMappings: Record<string, { sync_enabled?: boolean } | undefined> | null;
  defaultProjectId: string;
  visibleProjectIds: string[];
}): string[] {
  const { ticktickDefaultListMappings, defaultProjectId, visibleProjectIds } = params;

  if (
    ticktickDefaultListMappings &&
    typeof ticktickDefaultListMappings === 'object' &&
    !Array.isArray(ticktickDefaultListMappings)
  ) {
    const enabled = Object.entries(ticktickDefaultListMappings)
      .filter(([pid, cfg]) => pid && cfg && cfg.sync_enabled !== false)
      .map(([pid]) => pid);
    if (enabled.length > 0) return enabled;
  }

  const visible = visibleProjectIds.filter((pid) => pid.trim() !== '');
  if (visible.length > 0) {
    return [...new Set(visible)];
  }

  return [defaultProjectId];
}

export function shouldSweepLinkForRemoteDeleted(params: {
  externalListId: string | null;
  syncedProjectIds: Set<string>;
  successfulProjectIds: Set<string>;
}): boolean {
  const { externalListId, syncedProjectIds, successfulProjectIds } = params;
  if (!externalListId || externalListId.trim() === '') {
    return syncedProjectIds.size > 0 && successfulProjectIds.size === syncedProjectIds.size;
  }
  if (!syncedProjectIds.has(externalListId)) return false;
  return successfulProjectIds.has(externalListId);
}

export function shouldFetchMissingLinkedTaskById(params: {
  originId: string | null;
  eventId: string | null;
  originType: string | null;
  externalObjectId: string | null;
  syncStatus: string | null;
}): boolean {
  const hasExternalObjectId = !!params.externalObjectId?.trim();
  const isFinancialLink = params.originType === 'payable_bill' && !!params.originId;
  return hasExternalObjectId && isFinancialLink && !params.eventId;
}

export function resolveCompletedBillPaidAmount(amount: number | string | null | undefined): number | null {
  if (amount == null) return null;
  if (typeof amount === 'string' && amount.trim() === '') return null;
  const parsed = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function processUnlinkedInboundTask(params: {
  task: TickTickTaskInbound;
  userId: string;
  config: UnlinkedInboundTaskRoutingConfig;
  onRouteFinancial: () => Promise<void>;
  onCreateCalendarEvent: (input: CalendarEventInboundInput) => Promise<void>;
}): Promise<void> {
  const mappedEventKind = params.config.ticktick_default_list_mappings?.[params.task.projectId]?.event_kind;

  if (
    shouldRouteInboundTaskToFinancialSurface({
      mappedEventKind,
      remoteTitle: params.task.title,
    })
  ) {
    await params.onRouteFinancial();
    return;
  }

  const eventKind = resolveInboundCalendarEventKind({
    mappedEventKind,
    remoteTitle: params.task.title,
  });
  const input = mapTickTickTaskToCalendarEventInput(params.task, params.userId, eventKind);
  await params.onCreateCalendarEvent(input);
}
