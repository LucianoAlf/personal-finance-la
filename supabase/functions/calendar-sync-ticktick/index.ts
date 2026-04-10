/**
 * calendar-sync-ticktick
 *
 * Cron-triggered edge function that consumes calendar_sync_jobs for
 * the TickTick provider. Resolves credentials from integration_configs,
 * syncs events outbound via the TickTick Open API, and updates
 * calendar_external_event_links.
 *
 * V1 scope: event-level sync only (create, update, delete).
 * Occurrence-level sync is marked skipped_unsupported.
 *
 * Triggered by pg_cron every 10 minutes.
 *
 * Secrets: defina INTEGRATION_SECRETS_KEY (secret da função) para tokens no formato enc1:...
 * em integration_configs.ticktick_api_key_encrypted; valores sem prefixo continuam como legado.
 *
 * TickTick Open API endpoints used:
 *   GET    /open/v1/project                              (list projects)
 *   GET    /open/v1/project/{projectId}/data            (project + tasks)
 *   POST   /open/v1/task                                 (create)
 *   POST   /open/v1/task/{taskId}                        (update)
 *   DELETE  /open/v1/project/{projectId}/task/{taskId}    (delete)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  assertCalendarExternalLinkWriteSucceeded,
  buildOutboundRecurrenceEnrichment,
  buildCalendarEventOutboundPushObservationUpdate,
  buildCalendarEventConflictObservationUpdate,
  buildCalendarEventConflictRepairJob,
  buildExternalPayloadHash,
  buildInboundCanonicalUpdateFailureObservationUpdate,
  buildInboundExtrasFailureObservationUpdate,
  buildInboundHealSuccessLinkUpdate,
  buildHandleUpsertLinkWrite,
  buildInboundExtrasPersistenceResult,
  buildInboundMetadataMutation,
  buildInboundRecurrenceMetadataMutation,
  buildPayableBillInboundUpdateObservationUpdate,
  buildPayableBillConflictObservationUpdate,
  buildPayableBillOutboundPushObservationUpdate,
  buildRemoteDeletedRecoveryObservationUpdate,
  buildTickTickPayload,
  calendarRecurrenceRowToFields,
  combineTickTickContentAndDesc,
  hashableFieldsForOutboundSync,
  hashableTaskFromInbound,
  isEventEligibleForSync,
  isFinancialTitle,
  mapAppPriorityToTickTick,
  mapTickTickTaskToCalendarEventInput,
  offsetMinutesToTrigger,
  parseTriggerToOffsetMinutes,
  recurrenceFieldsToRrule,
  resolveInboundCalendarEventKind,
  resolveInboundRecurrenceMutation,
  resolveTickTickProjectIdForEventKind,
  resolveHashBasedSyncAction,
  shouldRouteInboundTaskToFinancialSurface,
  rruleUntilUtcToIso,
  normalizeTickTickContentFields,
  shouldCompensateRemoteCreateAfterLinkWriteFailure,
  TICKTICK_BASE,
  DEFAULT_TICKTICK_PROJECT_ID,
  type CalendarEventForSync,
  type TickTickOutboundEnrichment,
  type TickTickTaskInbound,
} from './ticktick-mapping.ts';
import { resolveTickTickApiToken } from '../_shared/integration-token.ts';
import {
  processUnlinkedInboundTask,
  resolveInboundSyncProjectIds,
  shouldSweepLinkForRemoteDeleted,
} from './inbound-worker.ts';
import { processOutboundUpsertLink } from './outbound-worker.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 60_000;
const BATCH_LIMIT = 20;

// ---------------------------------------------------------------------------
// TickTick API helpers
// ---------------------------------------------------------------------------

interface TickTickTask {
  id: string;
  projectId: string;
  title: string;
  [key: string]: unknown;
}

interface IntegrationConfigRow {
  ticktick_api_key_encrypted: string | null;
  ticktick_default_project_id: string | null;
  ticktick_default_list_mappings: Record<string, { sync_enabled?: boolean; event_kind?: string }> | null;
  is_active: boolean;
}

interface InboundPassStats {
  usersTouched: number;
  tasksSeen: number;
  created: number;
  updated: number;
  financialRouted: number;
  conflicts: number;
  remoteDeleted: number;
  errors: number;
}

const EPOCH_SYNC = '1970-01-01T00:00:00.000Z';
const FINANCIAL_DUE_MATCH_DAYS = 3;
const DESC_ILIKE_MAX_LEN = 40;

async function tickTickRequest(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: unknown; errorText: string }> {
  const url = `${TICKTICK_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const init: RequestInit = { method, headers };
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);
  let data: unknown = null;
  let errorText = '';

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      errorText = 'Failed to parse JSON response';
    }
  } else {
    errorText = await response.text();
  }

  return { ok: response.ok, status: response.status, data, errorText };
}

async function updateCalendarEventMetadataFields(
  supabase: SupabaseClient,
  eventId: string,
  params: {
    set?: Record<string, unknown>;
    unset?: string[];
  },
): Promise<boolean> {
  const { data } = await supabase.from('calendar_events').select('metadata').eq('id', eventId).maybeSingle();
  const metadata =
    data?.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? { ...(data.metadata as Record<string, unknown>) }
      : {};
  for (const key of params.unset ?? []) {
    delete metadata[key];
  }
  Object.assign(metadata, params.set ?? {});
  const { error } = await supabase
    .from('calendar_events')
    .update({ metadata })
    .eq('id', eventId);
  if (error) {
    console.warn(`[ticktick-inbound] metadata update failed for ${eventId}:`, error.message);
    return false;
  }
  return true;
}

async function persistInboundTickTickExtrasForCalendarEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  task: TickTickTaskInbound,
): Promise<{ success: boolean; failedSteps: string[] }> {
  const tz = task.timeZone || 'America/Sao_Paulo';
  let recurrenceOk = true;
  let remindersOk = true;
  let metadataOk = true;

  const recurrenceMutation = resolveInboundRecurrenceMutation(task);
  const recurrenceMetadataMutation = buildInboundRecurrenceMetadataMutation(recurrenceMutation);
  if (recurrenceMutation.action === 'set') {
    const untilIso = recurrenceMutation.fields.until_at
      ? rruleUntilUtcToIso(recurrenceMutation.fields.until_at)
      : null;
    const { error } = await supabase.rpc('set_calendar_event_recurrence', {
      p_event_id: eventId,
      p_remove_recurrence: false,
      p_frequency: recurrenceMutation.fields.frequency,
      p_interval_value: recurrenceMutation.fields.interval_value,
      p_by_weekday: recurrenceMutation.fields.by_weekday,
      p_by_monthday: recurrenceMutation.fields.by_monthday,
      p_starts_at: null,
      p_until_at: untilIso,
      p_count_limit: recurrenceMutation.fields.count_limit,
      p_timezone: tz,
      p_confirm_drop_overrides: false,
      p_confirm_drop_reminders: true,
      p_user_id: userId,
    } as never);
    if (error) {
      console.warn(`[ticktick-inbound] set_calendar_event_recurrence (${eventId}):`, error.message);
      recurrenceOk = false;
    }
  } else {
    const { error } = await supabase.rpc('set_calendar_event_recurrence', {
      p_event_id: eventId,
      p_remove_recurrence: true,
      p_frequency: null,
      p_interval_value: 1,
      p_by_weekday: null,
      p_by_monthday: null,
      p_starts_at: null,
      p_until_at: null,
      p_count_limit: null,
      p_timezone: tz,
      p_confirm_drop_overrides: false,
      p_confirm_drop_reminders: false,
      p_user_id: userId,
    } as never);
    if (error) {
      console.warn(`[ticktick-inbound] clear_calendar_event_recurrence (${eventId}):`, error.message);
      recurrenceOk = false;
    }
    if (recurrenceMutation.action === 'unsupported') {
      console.warn(
        `[ticktick-inbound] rrule_unsupported_v1 task=${task.id}: ${recurrenceMutation.repeatFlag}`,
      );
    }
  }

  if (task.reminders !== undefined) {
    const offsets = task.reminders
      .map(parseTriggerToOffsetMinutes)
      .filter((v): v is number => v !== null);
    const { error } = await supabase.rpc('set_calendar_event_reminders', {
      p_event_id: eventId,
      p_reminders: offsets.map((remind_offset_minutes) => ({
        remind_offset_minutes,
        enabled: true,
        reminder_kind: 'default',
      })),
      p_user_id: userId,
    } as never);
    if (error) {
      console.warn(`[ticktick-inbound] set_calendar_event_reminders (${eventId}):`, error.message);
      remindersOk = false;
    }
  }

  const metadataMutation = buildInboundMetadataMutation(task);
  const metadataSet: Record<string, unknown> = {
    ...metadataMutation.set,
    ...recurrenceMetadataMutation.set,
  };
  const metadataUnset = [
    ...metadataMutation.unset,
    ...recurrenceMetadataMutation.unset,
  ];
  if (task.items !== undefined && task.items.length > 0) {
    metadataSet.ticktick_items = task.items;
  }
  if (task.sortOrder !== undefined) {
    metadataSet.ticktick_sort_order = task.sortOrder;
  }
  if (Object.keys(metadataSet).length > 0 || metadataUnset.length > 0) {
    metadataOk = await updateCalendarEventMetadataFields(supabase, eventId, {
      set: metadataSet,
      unset: metadataUnset,
    });
  }

  return buildInboundExtrasPersistenceResult({
    recurrenceOk,
    remindersOk,
    metadataOk,
  });
}

async function buildOutboundTickTickContext(
  supabase: SupabaseClient,
  event: CalendarEventForSync,
  options: {
    isExistingTask: boolean;
  },
): Promise<{
  enrichment: TickTickOutboundEnrichment;
  relativeReminderTriggers: string[];
  repeatFlag: string | null;
  tickTickPriority: number;
}> {
  const relativeReminderTriggers: string[] = [];
  const { data: reminderRows } = await supabase
    .from('calendar_event_reminders')
    .select('remind_offset_minutes')
    .eq('event_id', event.id)
    .eq('enabled', true);

  for (const row of reminderRows ?? []) {
    try {
      const mins = Number((row as { remind_offset_minutes: number }).remind_offset_minutes);
      relativeReminderTriggers.push(offsetMinutesToTrigger(mins));
    } catch {
      /* skip invalid offset */
    }
  }

  let repeatFlag: string | null = null;
  let recurrenceReadState: 'absent' | 'present_serialized' | 'present_unserializable' | 'error' = 'absent';
  const { data: rule, error: recurrenceReadError } = await supabase
    .from('calendar_event_recurrence_rules')
    .select('frequency, interval_value, by_weekday, by_monthday, until_at, count_limit')
    .eq('event_id', event.id)
    .maybeSingle();

  if (recurrenceReadError) {
    recurrenceReadState = 'error';
  } else if (rule) {
    const fields = calendarRecurrenceRowToFields(rule as never);
    if (fields) {
      try {
        repeatFlag = recurrenceFieldsToRrule(fields);
        recurrenceReadState = 'present_serialized';
      } catch {
        recurrenceReadState = 'present_unserializable';
      }
    } else {
      recurrenceReadState = 'present_unserializable';
    }
  }

  const meta = event.metadata;
  const pr =
    meta && typeof meta === 'object' && meta !== null && !Array.isArray(meta)
      ? (meta as Record<string, unknown>).priority
      : null;
  const tickTickPriority = mapAppPriorityToTickTick(typeof pr === 'string' ? pr : null);

  const recurrenceEnrichment = buildOutboundRecurrenceEnrichment({
    isExistingTask: options.isExistingTask,
    recurrenceReadState,
    repeatFlag,
  });

  const enrichment: TickTickOutboundEnrichment = {
    relativeReminderTriggers,
    repeatFlag: recurrenceEnrichment.repeatFlag,
    explicitRepeatFlagClear: recurrenceEnrichment.explicitRepeatFlagClear,
    priority: tickTickPriority,
  };

  return { enrichment, relativeReminderTriggers, repeatFlag, tickTickPriority };
}

async function createTickTickTask(
  token: string,
  event: CalendarEventForSync,
  projectId: string,
  enrichment?: TickTickOutboundEnrichment,
): Promise<TickTickTask> {
  const payload = buildTickTickPayload(event, projectId, undefined, enrichment);
  console.log(`[ticktick-api] POST /task: "${event.title}" -> project ${projectId}`);

  const { ok, status, data, errorText } = await tickTickRequest('POST', '/task', token, payload);
  if (!ok) {
    throw new Error(`TickTick create failed (${status}): ${errorText || JSON.stringify(data)}`);
  }
  return data as TickTickTask;
}

async function updateTickTickTask(
  token: string,
  event: CalendarEventForSync,
  projectId: string,
  taskId: string,
  enrichment?: TickTickOutboundEnrichment,
): Promise<TickTickTask> {
  const payload = buildTickTickPayload(event, projectId, taskId, enrichment);
  console.log(`[ticktick-api] POST /task/${taskId}: update "${event.title}"`);

  const { ok, status, data, errorText } = await tickTickRequest(
    'POST',
    `/task/${taskId}`,
    token,
    payload,
  );
  if (!ok) {
    throw new Error(`TickTick update failed (${status}): ${errorText || JSON.stringify(data)}`);
  }
  return data as TickTickTask;
}

async function deleteTickTickTask(
  token: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  console.log(`[ticktick-api] DELETE /project/${projectId}/task/${taskId}`);

  const { ok, status, errorText, data } = await tickTickRequest(
    'DELETE',
    `/project/${projectId}/task/${taskId}`,
    token,
  );

  if (!ok && status !== 404) {
    throw new Error(`TickTick delete failed (${status}): ${errorText || JSON.stringify(data)}`);
  }
}

/** GET /open/v1/project — list projects (used for diagnostics / token validation). */
async function listTickTickProjects(token: string): Promise<Array<{ id: string }>> {
  const { ok, data } = await tickTickRequest('GET', '/project', token);
  if (!ok || !Array.isArray(data)) {
    console.warn('[ticktick-inbound] list projects failed or unexpected shape');
    return [];
  }
  return (data as Array<{ id?: string }>)
    .map((p) => ({ id: String(p.id ?? '') }))
    .filter((p) => p.id.length > 0);
}

/** GET /open/v1/project/{projectId}/data — tasks for one list/project. Second tuple element is true when HTTP/shape succeeded (tasks may still be empty). */
async function fetchTickTickTasksForProject(
  token: string,
  projectId: string,
): Promise<[Record<string, unknown>[], boolean]> {
  const { ok, data } = await tickTickRequest('GET', `/project/${projectId}/data`, token);
  if (!ok || data === null || typeof data !== 'object') {
    console.warn(`[ticktick-inbound] project data failed for ${projectId}`);
    return [[], false];
  }
  const tasks = (data as Record<string, unknown>).tasks;
  return [Array.isArray(tasks) ? (tasks as Record<string, unknown>[]) : [], true];
}

function parseTickTickDateInbound(dateStr: string): string {
  const normalized = dateStr.replace(/\+0000$/, 'Z');
  const ms = new Date(normalized).getTime();
  if (Number.isNaN(ms)) {
    throw new Error('ticktick_task_invalid_date');
  }
  return new Date(ms).toISOString();
}

function resolveTickTickStartSourceInbound(task: TickTickTaskInbound): string {
  const start = task.startDate?.trim();
  if (start) return start;
  const due = task.dueDate?.trim();
  if (due) return due;
  throw new Error('ticktick_task_missing_dates');
}

/** Calendar field updates from a TickTick task (no financial-title guard; used when a link already targets `calendar_events`). */
function calendarFieldsFromTickTickTask(task: TickTickTaskInbound): {
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  status: string;
} {
  const startSource = resolveTickTickStartSourceInbound(task);
  return {
    title: task.title,
    description: combineTickTickContentAndDesc(task),
    start_at: parseTickTickDateInbound(startSource),
    end_at: task.dueDate?.trim() ? parseTickTickDateInbound(task.dueDate.trim()) : null,
    all_day: task.isAllDay ?? false,
    timezone: task.timeZone || 'America/Sao_Paulo',
    status: task.status === 2 ? 'completed' : 'scheduled',
  };
}

function remoteModifiedIso(task: TickTickTaskInbound): string {
  const mt = task.modifiedTime?.trim();
  if (mt) {
    try {
      return parseTickTickDateInbound(mt);
    } catch {
      /* fall through */
    }
  }
  const st = task.startDate?.trim();
  if (st) {
    try {
      return parseTickTickDateInbound(st);
    } catch {
      /* fall through */
    }
  }
  return new Date().toISOString();
}

function taskDueDateOnly(task: TickTickTaskInbound): string {
  try {
    const iso = parseTickTickDateInbound(resolveTickTickStartSourceInbound(task));
    return iso.slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function normalizeRawTickTickTask(
  raw: Record<string, unknown>,
  fallbackProjectId: string,
): TickTickTaskInbound | null {
  const id = raw.id != null ? String(raw.id) : '';
  if (!id) return null;
  const title = raw.title != null ? String(raw.title) : '';
  const { content, desc } = normalizeTickTickContentFields({
    content: raw.content,
    desc: raw.desc,
  });
  const projectId = raw.projectId != null ? String(raw.projectId) : fallbackProjectId;
  const statusNum = typeof raw.status === 'number' ? raw.status : Number(raw.status) || 0;
  const modifiedTime = raw.modifiedTime != null ? String(raw.modifiedTime) : undefined;

  const repeatRaw = raw.repeatFlag ?? raw.repeat_flag;
  const repeatFlag =
    repeatRaw != null && String(repeatRaw).trim() !== '' ? String(repeatRaw) : undefined;

  let reminders: string[] | undefined;
  if (raw.reminders !== undefined) {
    reminders = Array.isArray(raw.reminders)
      ? (raw.reminders as unknown[]).map((r) => String(r)).filter((s) => s.startsWith('TRIGGER:'))
      : [];
  }

  let priority: number | undefined;
  if (raw.priority !== undefined && raw.priority !== null) {
    const p = typeof raw.priority === 'number' ? raw.priority : Number(raw.priority);
    if (Number.isFinite(p)) priority = p;
  }

  let tags: string[] | undefined;
  if (raw.tags !== undefined) {
    tags = Array.isArray(raw.tags)
      ? (raw.tags as unknown[]).map((value) => String(value).trim()).filter((value) => value.length > 0)
      : [];
  }

  const items = Array.isArray(raw.items) ? (raw.items as unknown[]) : undefined;
  const sortOrderRaw = raw.sortOrder ?? raw.sort_order;
  const sortOrder =
    sortOrderRaw !== undefined && sortOrderRaw !== null && Number.isFinite(Number(sortOrderRaw))
      ? Number(sortOrderRaw)
      : undefined;

  return {
    id,
    title,
    content,
    desc,
    startDate: raw.startDate != null ? String(raw.startDate) : undefined,
    dueDate: raw.dueDate != null ? String(raw.dueDate) : undefined,
    isAllDay: raw.isAllDay === true,
    timeZone: raw.timeZone != null ? String(raw.timeZone) : undefined,
    projectId,
    modifiedTime,
    status: statusNum,
    repeatFlag,
    reminders,
    priority,
    tags,
    items,
    sortOrder,
  };
}

async function insertCalendarSyncJobAudit(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    event_id?: string | null;
    provider: string;
    job_type: string;
    idempotency_key: string;
    status: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const eventId =
    row.event_id != null && String(row.event_id).trim() !== '' ? String(row.event_id).trim() : null;
  const payload: Record<string, unknown> = {
    user_id: row.user_id,
    event_id: eventId,
    provider: row.provider,
    job_type: row.job_type,
    idempotency_key: row.idempotency_key,
    status: row.status,
    metadata: row.metadata ?? {},
    run_after: new Date().toISOString(),
    attempt_count: row.status === 'succeeded' ? 1 : 0,
  };
  const { error } = await supabase.from('calendar_sync_jobs').insert(payload as never);
  if (error) {
    console.warn(
      `[ticktick-inbound] calendar_sync_jobs audit insert failed (${row.job_type}):`,
      error.message,
    );
  }
}

async function findMatchingPayableBill(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  taskDateYmd: string,
): Promise<{ id: string } | null> {
  const needle = title
    .toLowerCase()
    .trim()
    .slice(0, DESC_ILIKE_MAX_LEN)
    .replace(/[%_\\]/g, ' ')
    .trim();
  if (!needle) return null;
  const center = new Date(`${taskDateYmd}T12:00:00.000Z`).getTime();
  const from = new Date(center - FINANCIAL_DUE_MATCH_DAYS * 86400000).toISOString().slice(0, 10);
  const to = new Date(center + FINANCIAL_DUE_MATCH_DAYS * 86400000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from('payable_bills')
    .select('id')
    .eq('user_id', userId)
    .ilike('description', `%${needle}%`)
    .gte('due_date', from)
    .lte('due_date', to)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function routeFinancialInboundTickTick(
  supabase: SupabaseClient,
  userId: string,
  task: TickTickTaskInbound,
  remoteModified: string,
  stats: InboundPassStats,
): Promise<void> {
  const taskDate = taskDueDateOnly(task);
  const existingBill = await findMatchingPayableBill(supabase, userId, task.title, taskDate);
  let billId: string;
  let createdNewBill = false;

  if (existingBill) {
    billId = existingBill.id;
  } else {
    const { data: newBill, error } = await supabase
      .from('payable_bills')
      .insert({
        user_id: userId,
        description: task.title,
        due_date: taskDate,
        status: 'pending',
        bill_type: 'other',
        is_recurring: false,
        source: 'external_import',
        amount: null,
      })
      .select('id')
      .single();

    if (error || !newBill) {
      console.error(`[ticktick-inbound] payable_bills insert failed for task ${task.id}:`, error);
      stats.errors++;
      return;
    }
    billId = newBill.id as string;
    createdNewBill = true;
  }

  const { error: linkErr } = await supabase.from('calendar_external_event_links').insert({
    event_id: null,
    origin_type: 'payable_bill',
    origin_id: billId,
    provider: 'ticktick',
    external_object_id: task.id,
    external_list_id: task.projectId,
    sync_direction: 'inbound',
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    last_remote_updated_at: remoteModified,
    external_payload_hash: buildExternalPayloadHash(hashableTaskFromInbound(task)),
  });

  if (linkErr) {
    console.error(`[ticktick-inbound] financial link insert failed for task ${task.id}:`, linkErr);
    stats.errors++;
    return;
  }

  stats.financialRouted++;
  await insertCalendarSyncJobAudit(supabase, {
    user_id: userId,
    provider: 'ticktick',
    job_type: 'inbound_financial_routed',
    idempotency_key: `financial_route:${task.id}:${Date.now()}`,
    status: 'succeeded',
    metadata: {
      external_object_id: task.id,
      external_title: task.title,
      bill_id: billId,
      created_new_bill: createdNewBill,
    },
  });
}

async function processInboundTickTickForUser(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  config: IntegrationConfigRow,
  stats: InboundPassStats,
): Promise<void> {
  const defaultPid =
    (config.ticktick_default_project_id || '').trim() || DEFAULT_TICKTICK_PROJECT_ID;
  const visibleProjects = await listTickTickProjects(token);
  const projectIds = resolveInboundSyncProjectIds({
    ticktickDefaultListMappings: config.ticktick_default_list_mappings,
    defaultProjectId: defaultPid,
    visibleProjectIds: visibleProjects.map((project) => project.id),
  });
  const syncedProjectIds = new Set(projectIds);
  if (visibleProjects.length === 0) {
    console.warn(
      `[ticktick-inbound] user ${userId}: GET /project returned no lists (check token scope); continuing with configured project ids`,
    );
  } else {
    console.log(
      `[ticktick-inbound] user ${userId}: TickTick lists visible=${visibleProjects.length}, syncing ${projectIds.length} project(s)`,
    );
  }

  const tasksById = new Map<string, TickTickTaskInbound>();
  let anyProjectDataFetchSucceeded = false;
  const successfulProjectIds = new Set<string>();
  for (const pid of projectIds) {
    const [raws, projectOk] = await fetchTickTickTasksForProject(token, pid);
    if (projectOk) {
      anyProjectDataFetchSucceeded = true;
      successfulProjectIds.add(pid);
    }
    for (const raw of raws) {
      const t = normalizeRawTickTickTask(raw, pid);
      if (t) tasksById.set(t.id, t);
    }
  }

  stats.tasksSeen += tasksById.size;

  const { data: userEventIds } = await supabase.from('calendar_events').select('id').eq('user_id', userId);
  const eventIdSet = new Set((userEventIds ?? []).map((r) => r.id as string));

  const { data: userBillIds } = await supabase.from('payable_bills').select('id').eq('user_id', userId);
  const billIdSet = new Set((userBillIds ?? []).map((r) => r.id as string));

  for (const task of tasksById.values()) {
    const remoteModified = remoteModifiedIso(task);

    const { data: existingLink } = await supabase
      .from('calendar_external_event_links')
      .select(
        'id, event_id, origin_id, origin_type, last_synced_at, last_remote_updated_at, sync_status, external_payload_hash',
      )
      .eq('provider', 'ticktick')
      .eq('external_object_id', task.id)
      .maybeSingle();

    let linkRow = existingLink;
    if (existingLink?.sync_status === 'remote_deleted') {
      await supabase
        .from('calendar_external_event_links')
        .update(buildRemoteDeletedRecoveryObservationUpdate(remoteModified))
        .eq('id', existingLink.id);
      linkRow = {
        ...existingLink,
        sync_status: 'remote_deleted',
        last_remote_updated_at: remoteModified,
      };
    }

    if (linkRow?.event_id) {
      const { data: localEvent } = await supabase
        .from('calendar_events')
        .select('id, updated_at, deleted_at, event_kind')
        .eq('id', linkRow.event_id)
        .maybeSingle();

      if (!localEvent || localEvent.deleted_at) {
        continue;
      }

      const lastSynced = (linkRow.last_synced_at as string) || EPOCH_SYNC;
      const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(task));
      const storedHash = (linkRow.external_payload_hash as string | null) ?? null;
      let action: ReturnType<typeof resolveHashBasedSyncAction>;
      try {
        action = resolveHashBasedSyncAction({
          storedHash,
          currentHash,
          localUpdatedAt: localEvent.updated_at as string,
          lastSyncedAt: lastSynced,
          forceRemoteRetry: linkRow.sync_status === 'partial_failed',
        });
      } catch {
        stats.errors++;
        continue;
      }

      if (action === 'no_change') {
        const noChangeUpdate =
          linkRow.sync_status === 'remote_deleted'
            ? buildInboundHealSuccessLinkUpdate(
                remoteModified,
                currentHash,
                task.projectId,
                new Date().toISOString(),
              )
            : {
                last_remote_updated_at: remoteModified,
                ...(storedHash == null ? { external_payload_hash: currentHash } : {}),
              };
        await supabase.from('calendar_external_event_links').update(noChangeUpdate).eq('id', linkRow.id);
        continue;
      }

      if (action === 'inbound_update') {
        const fields = calendarFieldsFromTickTickTask(task);
        const inboundEventKind = resolveInboundCalendarEventKind({
          mappedEventKind: config.ticktick_default_list_mappings?.[task.projectId]?.event_kind as
            | string
            | undefined,
          currentEventKind: localEvent.event_kind as string | undefined,
          remoteTitle: task.title,
        });
        const { error: eventUpdateError } = await supabase
          .from('calendar_events')
          .update({
            title: fields.title,
            description: fields.description,
            start_at: fields.start_at,
            end_at: fields.end_at,
            all_day: fields.all_day,
            timezone: fields.timezone,
            status: fields.status,
            event_kind: inboundEventKind,
          })
          .eq('id', linkRow.event_id);
        if (eventUpdateError) {
          console.error(
            `[ticktick-inbound] calendar_events update failed for ${String(linkRow.event_id)} (${task.id}):`,
            eventUpdateError,
          );
          await supabase
            .from('calendar_external_event_links')
            .update(
              buildInboundCanonicalUpdateFailureObservationUpdate(
                remoteModified,
                'calendar_event',
                eventUpdateError.message,
              ),
            )
            .eq('id', linkRow.id);
          stats.errors++;
          continue;
        }

        const extrasResult = await persistInboundTickTickExtrasForCalendarEvent(
          supabase,
          userId,
          linkRow.event_id as string,
          task,
        );

        if (!extrasResult.success) {
          const observedAt = new Date().toISOString();
          await supabase
            .from('calendar_external_event_links')
            .update(
              buildInboundExtrasFailureObservationUpdate(
                remoteModified,
                currentHash,
                observedAt,
                extrasResult.failedSteps,
              ),
            )
            .eq('id', linkRow.id);
          stats.errors++;
          continue;
        }

        await supabase
          .from('calendar_external_event_links')
          .update(
            buildInboundHealSuccessLinkUpdate(
              remoteModified,
              currentHash,
              task.projectId,
              new Date().toISOString(),
            ),
          )
          .eq('id', linkRow.id);
        stats.updated++;
        continue;
      }

      if (action === 'outbound_push') {
        await supabase
          .from('calendar_external_event_links')
          .update(buildCalendarEventOutboundPushObservationUpdate(remoteModified))
          .eq('id', linkRow.id);
        continue;
      }

      if (action === 'conflict') {
        await insertCalendarSyncJobAudit(supabase, {
          user_id: userId,
          event_id: linkRow.event_id as string,
          provider: 'ticktick',
          job_type: 'conflict_detected',
          idempotency_key: `conflict:${linkRow.event_id}:${task.id}:${remoteModified}`,
          status: 'succeeded',
          metadata: {
            external_object_id: task.id,
            remote_title: task.title,
            remote_modified: remoteModified,
            local_updated: localEvent.updated_at,
          },
        });

        const repairJob = buildCalendarEventConflictRepairJob({
          userId,
          eventId: linkRow.event_id as string,
          externalObjectId: task.id,
          currentHash,
          remoteModified,
          runAfterIso: new Date().toISOString(),
        });
        const { error: enqueueErr } = await supabase.from('calendar_sync_jobs').insert(repairJob as never);
        if (enqueueErr && enqueueErr.code !== '23505') {
          console.warn('[ticktick-inbound] conflict repush enqueue:', enqueueErr.message);
        }

        await supabase
          .from('calendar_external_event_links')
          .update(buildCalendarEventConflictObservationUpdate(remoteModified))
          .eq('id', linkRow.id);
        stats.conflicts++;
        continue;
      }
    }

    if (linkRow?.origin_id && linkRow.origin_type === 'payable_bill') {
      const { data: bill } = await supabase
        .from('payable_bills')
        .select('id, updated_at, amount, status')
        .eq('id', linkRow.origin_id)
        .maybeSingle();

      if (!bill) continue;

      const lastSynced = (linkRow.last_synced_at as string) || EPOCH_SYNC;
      const currentHash = buildExternalPayloadHash(hashableTaskFromInbound(task));
      const storedHash = (linkRow.external_payload_hash as string | null) ?? null;
      let action: ReturnType<typeof resolveHashBasedSyncAction>;
      try {
        action = resolveHashBasedSyncAction({
          storedHash,
          currentHash,
          localUpdatedAt: bill.updated_at as string,
          lastSyncedAt: lastSynced,
        });
      } catch {
        stats.errors++;
        continue;
      }

      if (action === 'no_change') {
        await supabase
          .from('calendar_external_event_links')
          .update({
            last_remote_updated_at: remoteModified,
            ...(storedHash == null ? { external_payload_hash: currentHash } : {}),
          })
          .eq('id', linkRow.id);
        continue;
      }

      if (action === 'inbound_update') {
        await supabase
          .from('calendar_external_event_links')
          .update(buildPayableBillInboundUpdateObservationUpdate(remoteModified, task.projectId))
          .eq('id', linkRow.id);

        // When TickTick task is completed (status 2), propagate to payable_bills
        if (
          task.status === 2 &&
          linkRow.origin_id &&
          bill &&
          (bill.status === 'pending' || bill.status === 'overdue')
        ) {
          const paidAmount = Number(bill.amount) || 0;
          const { error: billUpdateErr } = await supabase
            .from('payable_bills')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              paid_amount: paidAmount,
            })
            .eq('id', linkRow.origin_id)
            .eq('user_id', userId)
            .in('status', ['pending', 'overdue']);

          if (!billUpdateErr) {
            console.log(
              `[ticktick-sync] Marked payable_bill ${linkRow.origin_id} as paid (R$${paidAmount}) from TickTick task ${task.id}`,
            );
            stats.updatedEvents++;
          } else {
            console.error(
              `[ticktick-sync] Failed to mark payable_bill ${linkRow.origin_id} as paid:`,
              billUpdateErr,
            );
          }
        }

        continue;
      }

      if (action === 'outbound_push') {
        await supabase
          .from('calendar_external_event_links')
          .update(buildPayableBillOutboundPushObservationUpdate(remoteModified))
          .eq('id', linkRow.id);
        continue;
      }

      if (action === 'conflict') {
        await insertCalendarSyncJobAudit(supabase, {
          user_id: userId,
          provider: 'ticktick',
          job_type: 'conflict_detected',
          idempotency_key: `conflict:bill:${linkRow.origin_id}:${task.id}:${remoteModified}`,
          status: 'succeeded',
          metadata: {
            external_object_id: task.id,
            origin_type: 'payable_bill',
            origin_id: linkRow.origin_id,
            remote_title: task.title,
            remote_modified: remoteModified,
            local_updated: bill.updated_at,
          },
        });
        await supabase
          .from('calendar_external_event_links')
          .update(buildPayableBillConflictObservationUpdate(remoteModified))
          .eq('id', linkRow.id);
        stats.conflicts++;
        continue;
      }
    }

    if (linkRow && !linkRow.event_id && linkRow.origin_id) {
      continue;
    }

    try {
      await processUnlinkedInboundTask({
        task,
        userId,
        config: {
          ticktick_default_list_mappings: config.ticktick_default_list_mappings,
        },
        onRouteFinancial: async () => {
          await routeFinancialInboundTickTick(supabase, userId, task, remoteModified, stats);
        },
        onCreateCalendarEvent: async (input) => {
          const { data: newEvent, error: insertErr } = await supabase
            .from('calendar_events')
            .insert(input)
            .select('id')
            .single();

          if (insertErr || !newEvent) {
            console.error(`[ticktick-inbound] calendar_events insert failed for ${task.id}:`, insertErr);
            stats.errors++;
            return;
          }

          const extrasResult = await persistInboundTickTickExtrasForCalendarEvent(
            supabase,
            userId,
            newEvent.id as string,
            task,
          );

          const inboundHash = buildExternalPayloadHash(hashableTaskFromInbound(task));
          const observedAt = new Date().toISOString();

          const { error: linkInsertErr } = await supabase.from('calendar_external_event_links').insert({
            event_id: newEvent.id,
            provider: 'ticktick',
            external_object_id: task.id,
            external_list_id: task.projectId,
            sync_direction: 'bidirectional',
            ...(extrasResult.success
              ? {
                  sync_status: 'synced',
                  last_synced_at: observedAt,
                  last_remote_updated_at: remoteModified,
                  external_payload_hash: inboundHash,
                  last_error: null,
                }
              : buildInboundExtrasFailureObservationUpdate(
                  remoteModified,
                  inboundHash,
                  observedAt,
                  extrasResult.failedSteps,
                )),
          });

          if (linkInsertErr) {
            console.error(`[ticktick-inbound] link insert failed for ${task.id}:`, linkInsertErr);
            const { error: undoErr } = await supabase
              .from('calendar_events')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', newEvent.id)
              .eq('user_id', userId);
            if (undoErr) {
              console.error(
                `[ticktick-inbound] orphan event cleanup failed for event ${newEvent.id} (task ${task.id}):`,
                undoErr,
              );
            }
            stats.errors++;
            return;
          }

          if (!extrasResult.success) {
            stats.errors++;
            return;
          }

          stats.created++;
        },
      });
    } catch (e) {
      console.warn(`[ticktick-inbound] skip task ${task.id}:`, e);
      stats.errors++;
    }
    continue;
  }

  const { data: allLinks } = await supabase
    .from('calendar_external_event_links')
    .select('id, external_object_id, event_id, origin_id, external_list_id, sync_status')
    .eq('provider', 'ticktick')
    .neq('sync_status', 'remote_deleted');

  const scopedLinks = (allLinks ?? []).filter((l) => {
    const ownEvent = l.event_id && eventIdSet.has(l.event_id as string);
    const ownBill = l.origin_id && billIdSet.has(l.origin_id as string);
    if (!ownEvent && !ownBill) return false;
    return shouldSweepLinkForRemoteDeleted({
      externalListId: l.external_list_id as string | null,
      syncedProjectIds,
      successfulProjectIds,
    });
  });

  const seenIds = new Set(tasksById.keys());
  if (!anyProjectDataFetchSucceeded && projectIds.length > 0) {
    console.warn(
      `[ticktick-inbound] user ${userId}: skipping remote_deleted pass (all GET .../project/{id}/data calls failed; avoiding false positives)`,
    );
  } else {
    for (const link of scopedLinks) {
      if (seenIds.has(link.external_object_id as string)) continue;

      await supabase
        .from('calendar_external_event_links')
        .update({
          sync_status: 'remote_deleted',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', link.id);

      await insertCalendarSyncJobAudit(supabase, {
        user_id: userId,
        event_id: (link.event_id as string) || null,
        provider: 'ticktick',
        job_type: 'inbound_delete',
        idempotency_key: `inbound_delete:${userId}:${link.external_object_id}:${Date.now()}`,
        status: 'succeeded',
        metadata: {
          external_object_id: link.external_object_id,
          event_id: link.event_id,
          origin_id: link.origin_id,
          detected_at: new Date().toISOString(),
        },
      });
      stats.remoteDeleted++;
    }
  }

  await supabase
    .from('integration_configs')
    .update({ last_inbound_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('integration_type', 'ticktick');
}

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

async function handleUpsertEvent(
  supabase: SupabaseClient,
  job: Record<string, unknown>,
  event: CalendarEventForSync,
  token: string,
  projectId: string,
): Promise<void> {
  const desiredProjectId = resolveTickTickProjectIdForEventKind(event.event_kind, projectId);

  if (!isEventEligibleForSync(event)) {
    console.log(`[calendar-sync-ticktick] Event ${event.id} not eligible, marking succeeded (no-op)`);
    await markJobSucceeded(supabase, job);
    return;
  }

  const { data: existingLink } = await supabase
    .from('calendar_external_event_links')
    .select('external_object_id, external_list_id, sync_direction, sync_status')
    .eq('event_id', event.id)
    .eq('provider', 'ticktick')
    .maybeSingle();

  const { enrichment, relativeReminderTriggers, repeatFlag, tickTickPriority } =
    await buildOutboundTickTickContext(supabase, event, {
    isExistingTask: !!existingLink?.external_object_id,
  });

  const outboundUpsert = await processOutboundUpsertLink({
    existingLink,
    onUpdateExisting: async (link) => {
      const result = await updateTickTickTask(
        token,
        event,
        desiredProjectId,
        link.external_object_id as string,
        enrichment,
      );
      return {
        taskId: result.id,
        listId: result.projectId || desiredProjectId,
      };
    },
    onCreateNew: async () => {
      const result = await createTickTickTask(token, event, desiredProjectId, enrichment);
      return {
        taskId: result.id,
        listId: result.projectId || desiredProjectId,
      };
    },
  });

  if (outboundUpsert.kind === 'suspended_remote_deleted') {
    console.log(
      `[calendar-sync-ticktick] Event ${event.id} outbound upsert suspended because link is remote_deleted`,
    );
    await markJobSucceeded(supabase, job);
    return;
  }

  const { taskId, listId } = outboundUpsert;

  const outboundHash = buildExternalPayloadHash(
    hashableFieldsForOutboundSync({
      event,
      projectId: listId,
      relativeReminderTriggers,
      repeatFlag,
      tickTickPriority,
    }),
  );

  const { error: linkWriteError } = await supabase
    .from('calendar_external_event_links')
    .upsert(
      buildHandleUpsertLinkWrite({
        eventId: event.id,
        taskId,
        listId,
        outboundHash,
        observedAt: new Date().toISOString(),
        existingSyncDirection: (existingLink?.sync_direction as string | null) ?? null,
      }),
      { onConflict: 'event_id,provider' },
    );
  if (linkWriteError) {
    if (shouldCompensateRemoteCreateAfterLinkWriteFailure(!!existingLink?.external_object_id)) {
      try {
        await deleteTickTickTask(token, listId, taskId);
      } catch (cleanupError) {
        throw new Error(
          `calendar_external_event_links_upsert_failed:${linkWriteError.message};` +
            `remote_create_compensation_failed:${String(cleanupError)}`,
        );
      }
    }
    assertCalendarExternalLinkWriteSucceeded('upsert', linkWriteError.message);
  }

  await markJobSucceeded(supabase, job);
}

async function handleDeleteEvent(
  supabase: SupabaseClient,
  job: Record<string, unknown>,
  _event: CalendarEventForSync,
  token: string,
  projectId: string,
): Promise<void> {
  const { data: existingLink } = await supabase
    .from('calendar_external_event_links')
    .select('external_object_id, external_list_id, sync_status')
    .eq('event_id', _event.id)
    .eq('provider', 'ticktick')
    .maybeSingle();

  if (!existingLink?.external_object_id) {
    await markJobSucceeded(supabase, job);
    return;
  }

  if (existingLink.sync_status === 'deleted') {
    await markJobSucceeded(supabase, job);
    return;
  }

  await deleteTickTickTask(
    token,
    existingLink.external_list_id || projectId,
    existingLink.external_object_id,
  );

  const { error: linkWriteError } = await supabase
    .from('calendar_external_event_links')
    .update({
      sync_status: 'deleted',
      last_synced_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('event_id', _event.id)
    .eq('provider', 'ticktick');
  assertCalendarExternalLinkWriteSucceeded('delete_update', linkWriteError?.message);

  await markJobSucceeded(supabase, job);
}

async function markJobSucceeded(
  supabase: SupabaseClient,
  job: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('calendar_sync_jobs')
    .update({
      status: 'succeeded',
      attempt_count: (job.attempt_count as number) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const hasJwtAuth = !!authHeader && /^Bearer\s+.+/.test(authHeader);

    if (expectedSecret && !hasJwtAuth && cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!expectedSecret && !hasJwtAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const inboundStats: InboundPassStats = {
      usersTouched: 0,
      tasksSeen: 0,
      created: 0,
      updated: 0,
      financialRouted: 0,
      conflicts: 0,
      remoteDeleted: 0,
      errors: 0,
    };

    const { data: ticktickConfigs, error: inboundCfgErr } = await supabase
      .from('integration_configs')
      .select(
        'user_id, ticktick_api_key_encrypted, ticktick_default_project_id, ticktick_default_list_mappings, is_active',
      )
      .eq('integration_type', 'ticktick')
      .eq('is_active', true);

    if (inboundCfgErr) {
      console.error('[calendar-sync-ticktick] Inbound config fetch error:', inboundCfgErr);
    } else if (ticktickConfigs && ticktickConfigs.length > 0) {
      for (const cfg of ticktickConfigs) {
        if (!String(cfg.ticktick_api_key_encrypted ?? '').trim()) continue;
        try {
          const token = await resolveTickTickApiToken(
            cfg.ticktick_api_key_encrypted as string | null,
          );
          if (!token) continue;
          inboundStats.usersTouched++;
          await processInboundTickTickForUser(
            supabase,
            cfg.user_id as string,
            token,
            cfg as IntegrationConfigRow,
            inboundStats,
          );
        } catch (inboundErr) {
          console.error(`[ticktick-inbound] user ${cfg.user_id}:`, inboundErr);
          inboundStats.errors++;
        }
      }
    }

    // Fetch pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('calendar_sync_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('provider', 'ticktick')
      .lte('run_after', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error('[calendar-sync-ticktick] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          processed: 0,
          message: 'No pending sync jobs',
          inbound: inboundStats,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[calendar-sync-ticktick] Processing ${jobs.length} jobs`);

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const job of jobs) {
      try {
        // Mark processing
        await supabase
          .from('calendar_sync_jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', job.id);

        // Resolve integration config
        const { data: config } = await supabase
          .from('integration_configs')
          .select('*')
          .eq('user_id', job.user_id)
          .eq('integration_type', 'ticktick')
          .eq('is_active', true)
          .single();

        if (!config || !String(config.ticktick_api_key_encrypted ?? '').trim()) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: 'No active TickTick integration found for user',
              attempt_count: job.attempt_count + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        let tickTickToken: string;
        try {
          const resolved = await resolveTickTickApiToken(config.ticktick_api_key_encrypted);
          if (!resolved) {
            throw new Error('ticktick_token_missing');
          }
          tickTickToken = resolved;
        } catch (tokenErr) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: `TickTick token: ${String(tokenErr)}`,
              attempt_count: job.attempt_count + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        const tickTickProjectId =
          (config as IntegrationConfigRow).ticktick_default_project_id || DEFAULT_TICKTICK_PROJECT_ID;

        // Occurrence-level: skip in V1
        if (
          job.occurrence_override_id &&
          (job.job_type === 'upsert_occurrence_override' || job.job_type === 'cancel_occurrence')
        ) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'skipped_unsupported',
              last_error: 'Occurrence-level sync not yet implemented for TickTick V1',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          skipped++;
          continue;
        }

        // Load canonical event
        const { data: event } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('id', job.event_id)
          .single();

        if (!event) {
          await supabase
            .from('calendar_sync_jobs')
            .update({
              status: 'failed',
              last_error: 'Canonical event not found',
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
          continue;
        }

        // Dispatch by job type
        switch (job.job_type) {
          case 'upsert_event':
            await handleUpsertEvent(
              supabase,
              job,
              event as CalendarEventForSync,
              tickTickToken,
              tickTickProjectId,
            );
            break;

          case 'delete_event':
            await handleDeleteEvent(
              supabase,
              job,
              event as CalendarEventForSync,
              tickTickToken,
              tickTickProjectId,
            );
            break;

          case 'upsert_occurrence_override':
          case 'cancel_occurrence':
            await supabase
              .from('calendar_sync_jobs')
              .update({
                status: 'skipped_unsupported',
                last_error: `${job.job_type} not yet implemented for TickTick V1`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id);
            skipped++;
            continue;

          default:
            await supabase
              .from('calendar_sync_jobs')
              .update({
                status: 'failed',
                last_error: `Unknown job_type: ${job.job_type}`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id);
            failed++;
            continue;
        }

        succeeded++;
      } catch (jobError) {
        console.error(`[calendar-sync-ticktick] Job ${job.id} error:`, jobError);

        const newAttemptCount = job.attempt_count + 1;
        const newStatus = newAttemptCount >= MAX_RETRIES ? 'failed' : 'pending';
        const runAfter =
          newAttemptCount < MAX_RETRIES
            ? new Date(Date.now() + BACKOFF_BASE_MS * Math.pow(2, newAttemptCount)).toISOString()
            : undefined;

        await supabase
          .from('calendar_sync_jobs')
          .update({
            status: newStatus,
            attempt_count: newAttemptCount,
            last_error: String(jobError),
            ...(runAfter ? { run_after: runAfter } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        failed++;
      }
    }

    console.log(`[calendar-sync-ticktick] Done: succeeded=${succeeded}, skipped=${skipped}, failed=${failed}`);

    return new Response(
      JSON.stringify({ succeeded, skipped, failed, total: jobs.length, inbound: inboundStats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[calendar-sync-ticktick] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
