/**
 * Pure mapping functions for calendar_events -> TickTick task payloads.
 * No Deno or network dependencies — fully testable under Vitest.
 */

export const TICKTICK_BASE = 'https://api.ticktick.com/open/v1';
export const DEFAULT_TICKTICK_PROJECT_ID = '643c0518525047536b6594d0';
export const TICKTICK_PROJECT_IDS = {
  financial: '67158c51db647de6536f46dc',
  personal: '643c0518525047536b6594d0',
  work: '643c0518525047536b6594d1',
  mentoring: '67fbc6398f08b12415f506c4',
} as const;

export interface CalendarEventForSync {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  status: string;
  location_text: string | null;
  event_kind: string;
  sync_eligible: boolean;
  deleted_at: string | null;
  metadata?: Record<string, unknown> | null;
}

export function formatDateForTickTick(isoDate: string): string {
  const d = new Date(isoDate);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+0000`;
}

function formatAllDayDueDateForTickTick(isoDate: string, timezone: string | null | undefined): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone?.trim() || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(isoDate));

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return formatDateForTickTick(isoDate);
  }

  return `${year}-${month}-${day}T00:00:00+0000`;
}

/** Optional fields mirrored to TickTick Open API (relative reminders only, RRULE, numeric priority). */
export interface TickTickOutboundEnrichment {
  relativeReminderTriggers?: string[];
  repeatFlag?: string | null;
  explicitRepeatFlagClear?: boolean;
  priority?: number;
}

function readTickTickTagsFromMetadata(metadata: Record<string, unknown> | null | undefined): string[] {
  const raw = metadata?.ticktick_tags;
  if (!Array.isArray(raw)) return [];
  return raw.map((value) => String(value).trim()).filter((value) => value.length > 0);
}

function mapCalendarStatusToTickTick(status: string | null | undefined): number {
  return status === 'completed' ? 2 : 0;
}

export function resolveTickTickProjectIdForEventKind(
  eventKind: string | null | undefined,
  fallbackProjectId: string,
): string {
  switch ((eventKind ?? '').trim()) {
    case 'financial':
      return TICKTICK_PROJECT_IDS.financial;
    case 'work':
      return TICKTICK_PROJECT_IDS.work;
    case 'mentoring':
      return TICKTICK_PROJECT_IDS.mentoring;
    case 'personal':
      return TICKTICK_PROJECT_IDS.personal;
    default:
      return TICKTICK_PROJECT_IDS.personal || fallbackProjectId;
  }
}

export function buildOutboundRecurrenceEnrichment(params: {
  isExistingTask: boolean;
  recurrenceReadState: 'absent' | 'present_serialized' | 'present_unserializable' | 'error';
  repeatFlag?: string | null;
}): Pick<TickTickOutboundEnrichment, 'repeatFlag' | 'explicitRepeatFlagClear'> {
  return {
    repeatFlag: params.repeatFlag?.trim() ? params.repeatFlag.trim() : undefined,
    explicitRepeatFlagClear: params.isExistingTask && params.recurrenceReadState === 'absent',
  };
}

export function resolveOutboundRepeatFlagContract(params: {
  repeatFlag?: string | null;
  explicitRepeatFlagClear?: boolean;
}): string | undefined {
  if (params.explicitRepeatFlagClear) {
    return '';
  }
  const repeatFlag = params.repeatFlag?.trim();
  return repeatFlag ? repeatFlag : undefined;
}

export function buildTickTickPayload(
  event: CalendarEventForSync,
  projectId: string,
  existingTaskId?: string,
  enrichment?: TickTickOutboundEnrichment,
): Record<string, unknown> {
  const ticktickTags = readTickTickTagsFromMetadata(event.metadata ?? null);
  const payload: Record<string, unknown> = {
    title: event.title,
    projectId,
    isAllDay: event.all_day,
    timeZone: event.timezone || 'America/Sao_Paulo',
    status: mapCalendarStatusToTickTick(event.status),
  };

  if (existingTaskId) {
    payload.id = existingTaskId;
  }

  if (event.description) {
    payload.content = event.description;
  }

  if (event.start_at) {
    payload.startDate = formatDateForTickTick(event.start_at);
  }

  if (event.all_day && event.start_at) {
    payload.dueDate = formatAllDayDueDateForTickTick(event.start_at, event.timezone);
  } else if (event.end_at) {
    payload.dueDate = formatDateForTickTick(event.end_at);
  } else if (event.all_day && event.start_at) {
    payload.dueDate = formatDateForTickTick(event.start_at);
  }

  if (enrichment?.relativeReminderTriggers && enrichment.relativeReminderTriggers.length > 0) {
    payload.reminders = [...enrichment.relativeReminderTriggers];
  }

  const repeatFlagForPayload = resolveOutboundRepeatFlagContract({
    repeatFlag: enrichment?.repeatFlag,
    explicitRepeatFlagClear: enrichment?.explicitRepeatFlagClear,
  });
  if (repeatFlagForPayload !== undefined) {
    payload.repeatFlag = repeatFlagForPayload;
  }

  if (enrichment?.priority !== undefined && enrichment.priority !== null) {
    payload.priority = enrichment.priority;
  }

  if (ticktickTags.length > 0) {
    payload.tags = ticktickTags;
  }

  return payload;
}

export function isEventEligibleForSync(event: CalendarEventForSync): boolean {
  return event.sync_eligible && event.status !== 'cancelled' && event.deleted_at === null;
}

// --- Relative TRIGGER (iCal) <-> offset minutes (TickTick reminders) ---
// Only durations before start are supported; absolute TRIGGER values are out of scope for V1.

const TRIGGER_REGEX = /^TRIGGER:P(\d+)DT(\d+)H(\d+)M(\d+)S$/;
const TRIGGER_SHORT_REGEX = /^TRIGGER:PT(?:(\d+)H)?(\d+)M(\d+)S$/;
const TRIGGER_ZERO_REGEX = /^TRIGGER:PT0S$/;
const RRULE_WEEKDAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);
const POSITIVE_INTEGER_REGEX = /^\d+$/;
const RRULE_UNTIL_REGEX =
  /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;

function parseByDayList(byDay: string): string[] | null {
  const values = byDay.split(',');
  if (values.length === 0) return null;
  for (const value of values) {
    if (!RRULE_WEEKDAYS.has(value)) return null;
  }
  return values;
}

function parseByMonthDayList(byMonthDay: string): number[] | null {
  const values = byMonthDay.split(',');
  if (values.length === 0) return null;

  const parsed: number[] = [];
  for (const value of values) {
    if (!POSITIVE_INTEGER_REGEX.test(value)) return null;
    const day = Number(value);
    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    parsed.push(day);
  }

  return parsed;
}

function parseUntilValue(until: string): string | null {
  const match = until.match(RRULE_UNTIL_REGEX);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second
  ) {
    return null;
  }

  return until;
}

function isValidPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function assertValidRecurrenceFields(fields: RecurrenceFields): void {
  if (!SUPPORTED_FREQS.has(fields.frequency.toUpperCase())) {
    throw new Error('invalid_recurrence_fields');
  }
  if (!isValidPositiveInteger(fields.interval_value)) {
    throw new Error('invalid_recurrence_fields');
  }
  if (fields.count_limit != null && !isValidPositiveInteger(fields.count_limit)) {
    throw new Error('invalid_recurrence_fields');
  }

  const by_weekday =
    fields.by_weekday == null ? null : parseByDayList(fields.by_weekday.join(','));
  const by_monthday =
    fields.by_monthday == null ? null : parseByMonthDayList(fields.by_monthday.join(','));
  const until_at = fields.until_at == null ? null : parseUntilValue(fields.until_at);

  if ((fields.by_weekday && !by_weekday) || (fields.by_monthday && !by_monthday)) {
    throw new Error('invalid_recurrence_fields');
  }
  if (fields.until_at && !until_at) {
    throw new Error('invalid_recurrence_fields');
  }
  if (fields.count_limit != null && fields.until_at) {
    throw new Error('invalid_recurrence_fields');
  }

  if (fields.frequency === 'daily' && (by_weekday || by_monthday)) {
    throw new Error('invalid_recurrence_fields');
  }
  if (fields.frequency === 'weekly' && by_monthday) {
    throw new Error('invalid_recurrence_fields');
  }
  if (fields.frequency === 'monthly' && by_weekday) {
    throw new Error('invalid_recurrence_fields');
  }
  if (by_weekday && by_monthday) {
    throw new Error('invalid_recurrence_fields');
  }
}

export function parseTriggerToOffsetMinutes(trigger: string): number | null {
  if (!trigger) return null;
  if (TRIGGER_ZERO_REGEX.test(trigger)) return 0;
  const full = trigger.match(TRIGGER_REGEX);
  if (full) {
    const seconds = parseInt(full[4], 10);
    if (seconds !== 0) return null;
    const days = parseInt(full[1], 10);
    const hours = parseInt(full[2], 10);
    const minutes = parseInt(full[3], 10);
    return days * 1440 + hours * 60 + minutes;
  }
  const short = trigger.match(TRIGGER_SHORT_REGEX);
  if (short) {
    const seconds = parseInt(short[3], 10);
    if (seconds !== 0) return null;
    const hours = short[1] ? parseInt(short[1], 10) : 0;
    const minutes = parseInt(short[2], 10);
    return hours * 60 + minutes;
  }
  return null;
}

export function offsetMinutesToTrigger(offsetMinutes: number): string {
  if (!Number.isFinite(offsetMinutes) || !Number.isInteger(offsetMinutes) || offsetMinutes < 0) {
    throw new Error('invalid_remind_offset_minutes');
  }
  if (offsetMinutes === 0) return 'TRIGGER:PT0S';
  const days = Math.floor(offsetMinutes / 1440);
  const remaining = offsetMinutes % 1440;
  const hours = Math.floor(remaining / 60);
  const minutes = remaining % 60;
  return `TRIGGER:P${days}DT${hours}H${minutes}M0S`;
}

// --- RRULE <-> recurrence fields ---

export interface RecurrenceFields {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_value: number;
  by_weekday: string[] | null;
  by_monthday: number[] | null;
  until_at: string | null;
  count_limit: number | null;
}

const SUPPORTED_FREQS = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const ALLOWED_RRULE_PARAMS = new Set([
  'FREQ',
  'INTERVAL',
  'BYDAY',
  'BYMONTHDAY',
  'UNTIL',
  'COUNT',
]);

export function parseRruleToRecurrenceFields(rrule: string): RecurrenceFields | null {
  if (!rrule) return null;
  const raw = rrule.replace(/^RRULE:/, '');
  const parts = raw.split(';');
  const params: Record<string, string> = {};
  for (const part of parts) {
    const segments = part.split('=');
    if (segments.length !== 2) return null;
    const [key, value] = segments;
    if (!key || !value) return null;
    if (params[key] !== undefined) return null;
    params[key] = value;
  }

  if (!params.FREQ || !SUPPORTED_FREQS.has(params.FREQ)) return null;
  for (const key of Object.keys(params)) {
    if (!ALLOWED_RRULE_PARAMS.has(key)) return null;
  }

  if (params.INTERVAL && !POSITIVE_INTEGER_REGEX.test(params.INTERVAL)) return null;
  const intervalRaw = params.INTERVAL ? parseInt(params.INTERVAL, 10) : 1;
  if (!Number.isFinite(intervalRaw) || intervalRaw < 1) return null;

  let count_limit: number | null = null;
  if (params.COUNT) {
    if (!POSITIVE_INTEGER_REGEX.test(params.COUNT)) return null;
    const c = parseInt(params.COUNT, 10);
    if (!Number.isFinite(c) || c < 1) return null;
    count_limit = c;
  }

  const by_weekday = params.BYDAY ? parseByDayList(params.BYDAY) : null;
  if (params.BYDAY && !by_weekday) return null;

  const by_monthday = params.BYMONTHDAY ? parseByMonthDayList(params.BYMONTHDAY) : null;
  if (params.BYMONTHDAY && !by_monthday) return null;

  const until_at = params.UNTIL ? parseUntilValue(params.UNTIL) : null;
  if (params.UNTIL && !until_at) return null;
  if (count_limit != null && until_at) return null;

  if (params.FREQ === 'DAILY' && (by_weekday || by_monthday)) return null;
  if (params.FREQ === 'WEEKLY' && by_monthday) return null;
  if (params.FREQ === 'MONTHLY' && by_weekday) return null;
  if (params.FREQ === 'YEARLY' && (by_weekday || by_monthday)) return null;
  if (by_weekday && by_monthday) return null;

  return {
    frequency: params.FREQ.toLowerCase() as RecurrenceFields['frequency'],
    interval_value: intervalRaw,
    by_weekday,
    by_monthday,
    until_at,
    count_limit,
  };
}

export function recurrenceFieldsToRrule(fields: RecurrenceFields): string {
  assertValidRecurrenceFields(fields);
  let rrule = `RRULE:FREQ=${fields.frequency.toUpperCase()};INTERVAL=${fields.interval_value}`;
  if (fields.by_weekday?.length) rrule += `;BYDAY=${fields.by_weekday.join(',')}`;
  if (fields.by_monthday?.length) rrule += `;BYMONTHDAY=${fields.by_monthday.join(',')}`;
  if (fields.until_at) rrule += `;UNTIL=${fields.until_at}`;
  if (fields.count_limit != null && fields.count_limit > 0) rrule += `;COUNT=${fields.count_limit}`;
  return rrule;
}

// --- Priority (TickTick API <-> app metadata labels) ---

const TICKTICK_PRIORITY_MAP: Record<number, string | null> = {
  0: null,
  1: 'low',
  3: 'medium',
  5: 'high',
};
const APP_PRIORITY_MAP: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 5,
};

export function mapTickTickPriority(priority: number): string | null {
  return TICKTICK_PRIORITY_MAP[priority] ?? null;
}

export function mapAppPriorityToTickTick(priority: string | null): number {
  if (!priority) return 0;
  return APP_PRIORITY_MAP[priority] ?? 0;
}

// --- Snapshot hash for poll-based remote change detection ---

export interface HashableTaskFields {
  title: string;
  content?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  isAllDay?: boolean | null;
  timeZone?: string | null;
  projectId?: string | null;
  repeatFlag?: string | null;
  reminders?: string[] | null;
  priority?: number | null;
  status?: number | null;
  tags?: string[] | null;
}

export function buildExternalPayloadHash(task: HashableTaskFields): string {
  const canonical = JSON.stringify([
    task.title,
    task.content ?? '',
    task.startDate ?? '',
    task.dueDate ?? '',
    task.isAllDay === true ? 1 : 0,
    task.timeZone ?? '',
    task.projectId ?? '',
    task.repeatFlag ?? '',
    (task.reminders ?? []).slice().sort().join(','),
    task.priority ?? 0,
    task.status ?? 0,
    (task.tags ?? []).slice().sort().join(','),
  ]);
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}

/** Align TickTick date strings to the same +0000 wire form used in outbound payloads (stable hash). */
export function normalizeTickTickDateForHash(dateStr: string | undefined | null): string {
  const raw = dateStr?.trim();
  if (!raw) return '';
  const normalized = raw.replace(/\+0000$/, 'Z');
  const ms = new Date(normalized).getTime();
  if (Number.isNaN(ms)) return raw;
  return formatDateForTickTick(new Date(ms).toISOString());
}

/** Normalize a TickTick inbound task into the snapshot used for `buildExternalPayloadHash`. */
export function hashableTaskFromInbound(task: TickTickTaskInbound): HashableTaskFields {
  return {
    title: task.title,
    content: combineTickTickContentAndDesc(task) ?? '',
    startDate: normalizeTickTickDateForHash(task.startDate),
    dueDate: normalizeTickTickDateForHash(task.dueDate),
    isAllDay: task.isAllDay ?? false,
    timeZone: task.timeZone || 'America/Sao_Paulo',
    projectId: task.projectId ?? '',
    repeatFlag: task.repeatFlag?.trim() ?? '',
    reminders: task.reminders ?? [],
    priority: task.priority ?? 0,
    status: task.status ?? 0,
    tags: task.tags ?? [],
  };
}

/** Build hash input from canonical event + outbound enrichment (matches TickTick wire fields). */
export function hashableFieldsForOutboundSync(params: {
  event: CalendarEventForSync;
  projectId: string;
  relativeReminderTriggers: string[];
  repeatFlag: string | null;
  tickTickPriority: number;
}): HashableTaskFields {
  const { event, projectId, relativeReminderTriggers, repeatFlag, tickTickPriority } = params;
  return {
    title: event.title,
    content: event.description ?? '',
    startDate: event.start_at ? formatDateForTickTick(event.start_at) : '',
    dueDate: event.end_at
      ? formatDateForTickTick(event.end_at)
      : event.all_day && event.start_at
        ? formatDateForTickTick(event.start_at)
        : '',
    isAllDay: event.all_day,
    timeZone: event.timezone || 'America/Sao_Paulo',
    projectId,
    repeatFlag: repeatFlag?.trim() ?? '',
    reminders: relativeReminderTriggers,
    priority: tickTickPriority,
    status: mapCalendarStatusToTickTick(event.status),
    tags: readTickTickTagsFromMetadata(event.metadata ?? null),
  };
}

export type InboundRecurrenceMutation =
  | { action: 'clear' }
  | { action: 'set'; fields: RecurrenceFields }
  | { action: 'unsupported'; repeatFlag: string };

export function resolveInboundRecurrenceMutation(input: {
  repeatFlag?: string | null;
}): InboundRecurrenceMutation {
  const repeatFlag = input.repeatFlag?.trim();
  if (!repeatFlag) {
    return { action: 'clear' };
  }

  const fields = parseRruleToRecurrenceFields(repeatFlag);
  if (!fields) {
    return { action: 'unsupported', repeatFlag };
  }

  return { action: 'set', fields };
}

export function buildInboundMetadataMutation(input: {
  priority?: number | null;
  tags?: string[] | null;
}): {
  set: Record<string, unknown>;
  unset: string[];
} {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];

  if (input.priority != null && input.priority > 0) {
    const label = mapTickTickPriority(input.priority);
    if (label) {
      set.priority = label;
    } else {
      unset.push('priority');
    }
  } else {
    unset.push('priority');
  }

  const tags = (input.tags ?? [])
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0);
  if (tags.length > 0) {
    set.ticktick_tags = tags;
  } else {
    unset.push('ticktick_tags');
  }

  return { set, unset };
}

export function buildInboundRecurrenceMetadataMutation(
  mutation: InboundRecurrenceMutation,
): {
  set: Record<string, unknown>;
  unset: string[];
} {
  if (mutation.action === 'unsupported') {
    return {
      set: {
        ticktick_rrule_import_status: 'unsupported_v1',
        ticktick_rrule_unsupported_raw: mutation.repeatFlag,
      },
      unset: [],
    };
  }

  return {
    set: {},
    unset: ['ticktick_rrule_import_status', 'ticktick_rrule_unsupported_raw'],
  };
}

export function buildInboundExtrasPersistenceResult(params: {
  recurrenceOk: boolean;
  remindersOk: boolean;
  metadataOk: boolean;
}): {
  success: boolean;
  failedSteps: string[];
} {
  const failedSteps: string[] = [];
  if (!params.recurrenceOk) failedSteps.push('recurrence');
  if (!params.remindersOk) failedSteps.push('reminders');
  if (!params.metadataOk) failedSteps.push('metadata');
  return {
    success: failedSteps.length === 0,
    failedSteps,
  };
}

export function buildInboundExtrasFailureObservationUpdate(
  remoteModified: string,
  currentHash: string,
  observedAt: string,
  failedSteps: string[],
): {
  sync_status: string;
  last_remote_updated_at: string;
  last_synced_at: string;
  external_payload_hash: string;
  last_error: string;
} {
  return {
    sync_status: 'partial_failed',
    last_remote_updated_at: remoteModified,
    last_synced_at: observedAt,
    external_payload_hash: currentHash,
    last_error: `inbound_extras_persist_failed:${failedSteps.join(',')}`,
  };
}

export function buildInboundHealSuccessLinkUpdate(
  remoteModified: string,
  currentHash: string,
  externalListId: string,
  observedAt: string,
): {
  sync_status: string;
  last_remote_updated_at: string;
  last_synced_at: string;
  external_list_id: string;
  external_payload_hash: string;
  last_error: null;
} {
  return {
    sync_status: 'synced',
    last_remote_updated_at: remoteModified,
    last_synced_at: observedAt,
    external_list_id: externalListId,
    external_payload_hash: currentHash,
    last_error: null,
  };
}

export function buildHandleUpsertLinkWrite(params: {
  eventId: string;
  taskId: string;
  listId: string;
  outboundHash: string;
  observedAt: string;
  existingSyncDirection?: string | null;
}): {
  event_id: string;
  provider: 'ticktick';
  external_object_id: string;
  external_list_id: string;
  sync_direction: string;
  sync_status: 'synced';
  last_synced_at: string;
  last_error: null;
  external_payload_hash: string;
} {
  return {
    event_id: params.eventId,
    provider: 'ticktick',
    external_object_id: params.taskId,
    external_list_id: params.listId,
    sync_direction: params.existingSyncDirection ?? 'outbound',
    sync_status: 'synced',
    last_synced_at: params.observedAt,
    last_error: null,
    external_payload_hash: params.outboundHash,
  };
}

export function buildRemoteDeletedRecoveryObservationUpdate(remoteModified: string): {
  sync_status: 'remote_deleted';
  last_remote_updated_at: string;
  last_error: string;
} {
  return {
    sync_status: 'remote_deleted',
    last_remote_updated_at: remoteModified,
    last_error: 'remote_deleted_recovery_pending_v1',
  };
}

export function buildInboundCanonicalUpdateFailureObservationUpdate(
  remoteModified: string,
  target: 'calendar_event' | 'payable_bill',
  errorMessage: string,
): {
  last_remote_updated_at: string;
  last_error: string;
} {
  return {
    last_remote_updated_at: remoteModified,
    last_error: `inbound_${target}_update_failed:${errorMessage}`,
  };
}

function isFinancialEventKind(eventKind: string | null | undefined): boolean {
  const normalized = eventKind?.trim().toLowerCase();
  return normalized != null && normalized.startsWith('financial');
}

export function shouldRouteInboundTaskToFinancialSurface(params: {
  mappedEventKind?: string | null;
  remoteTitle: string;
}): boolean {
  return isFinancialTitle(params.remoteTitle) || isFinancialEventKind(params.mappedEventKind);
}

export function resolveInboundCalendarEventKind(params: {
  mappedEventKind?: string | null;
  currentEventKind?: string | null;
  remoteTitle: string;
}): string {
  const mappedEventKind = params.mappedEventKind?.trim() || 'external';
  if (isFinancialTitle(params.remoteTitle) || isFinancialEventKind(mappedEventKind)) {
    return params.currentEventKind?.trim() || 'external';
  }
  return mappedEventKind;
}

export function buildPayableBillInboundUpdateObservationUpdate(
  remoteModified: string,
  externalListId: string,
): {
  last_remote_updated_at: string;
  external_list_id: string;
  last_error: string;
} {
  return {
    last_remote_updated_at: remoteModified,
    external_list_id: externalListId,
    last_error: 'payable_bill_inbound_update_not_supported_v1',
  };
}

export function assertCalendarExternalLinkWriteSucceeded(
  operation: string,
  errorMessage?: string | null,
): void {
  if (!errorMessage) return;
  throw new Error(`calendar_external_event_links_${operation}_failed:${errorMessage}`);
}

export function shouldCompensateRemoteCreateAfterLinkWriteFailure(
  hadExistingLink: boolean,
): boolean {
  return !hadExistingLink;
}

export function buildPayableBillOutboundPushObservationUpdate(remoteModified: string): {
  last_remote_updated_at: string;
  last_error: string;
} {
  return {
    last_remote_updated_at: remoteModified,
    last_error: 'payable_bill_outbound_sync_not_supported_v1',
  };
}

export function buildCalendarEventOutboundPushObservationUpdate(remoteModified: string): {
  last_remote_updated_at: string;
  last_error: string;
} {
  return {
    last_remote_updated_at: remoteModified,
    last_error: 'calendar_event_outbound_repair_pending_v1',
  };
}

export function buildCalendarEventConflictRepairJob(params: {
  userId: string;
  eventId: string;
  externalObjectId: string;
  currentHash: string;
  remoteModified: string;
  runAfterIso: string;
}): {
  user_id: string;
  event_id: string;
  provider: 'ticktick';
  job_type: 'upsert_event';
  idempotency_key: string;
  status: 'pending';
  run_after: string;
} {
  return {
    user_id: params.userId,
    event_id: params.eventId,
    provider: 'ticktick',
    job_type: 'upsert_event',
    idempotency_key:
      `sync:${params.eventId}:upsert_event:app_wins_conflict:` +
      `${params.externalObjectId}:${params.currentHash}:${params.remoteModified}`,
    status: 'pending',
    run_after: params.runAfterIso,
  };
}

export function buildCalendarEventConflictObservationUpdate(remoteModified: string): {
  last_remote_updated_at: string;
  last_error: string;
} {
  return {
    last_remote_updated_at: remoteModified,
    last_error: 'calendar_event_conflict_repair_pending_v1',
  };
}

export function buildPayableBillConflictObservationUpdate(remoteModified: string): {
  last_remote_updated_at: string;
  last_error: string;
} {
  return {
    last_remote_updated_at: remoteModified,
    last_error: 'payable_bill_conflict_unresolved_v1',
  };
}

/** DB recurrence row -> `RecurrenceFields` for RRULE emission. */
export function calendarRecurrenceRowToFields(row: {
  frequency: string;
  interval_value: number;
  by_weekday: string[] | null;
  by_monthday: number[] | null;
  until_at: string | null;
  count_limit: number | null;
}): RecurrenceFields | null {
  const f = String(row.frequency || '').toLowerCase();
  if (f !== 'daily' && f !== 'weekly' && f !== 'monthly' && f !== 'yearly') return null;
  return {
    frequency: f as RecurrenceFields['frequency'],
    interval_value: row.interval_value,
    by_weekday: row.by_weekday,
    by_monthday: row.by_monthday,
    until_at: row.until_at ? isoTimestamptzToRruleUntil(row.until_at) : null,
    count_limit: row.count_limit,
  };
}

/** UTC instant -> RRULE UNTIL compact form (YYYYMMDDTHHMMSSZ). */
export function isoTimestamptzToRruleUntil(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error('invalid_timestamptz_for_rrule_until');
  }
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** RRULE UNTIL compact UTC -> ISO string for `set_calendar_event_recurrence.p_until_at`. */
export function rruleUntilUtcToIso(untilCompact: string): string | null {
  if (!parseUntilValue(untilCompact)) return null;
  const m = untilCompact.match(RRULE_UNTIL_REGEX);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
}

// --- Inbound types and functions (TickTick -> calendar_events) ---

/** TickTick task shape used when pulling tasks inbound (bidirectional sync). */
export interface TickTickTaskInbound {
  id: string;
  title: string;
  content?: string;
  /** Raw TickTick `desc` (alias of content in some payloads). */
  desc?: string;
  startDate?: string;
  dueDate?: string;
  isAllDay?: boolean;
  timeZone?: string;
  projectId: string;
  modifiedTime?: string;
  /** 0 = normal, 2 = completed (TickTick API) */
  status: number;
  /** RRULE string when task repeats. */
  repeatFlag?: string;
  /** iCal TRIGGER strings (relative durations only in V1). */
  reminders?: string[];
  /** TickTick numeric priority (0 none, 1 low, 3 medium, 5 high). */
  priority?: number;
  /** TickTick free-form tags (overwrite semantics on update). */
  tags?: string[];
  items?: unknown[];
  sortOrder?: number;
}

export function normalizeTickTickContentFields(input: {
  content?: unknown;
  desc?: unknown;
}): {
  content?: string;
  desc?: string;
} {
  return {
    content: input.content != null ? String(input.content) : undefined,
    desc: input.desc != null ? String(input.desc) : undefined,
  };
}

export function combineTickTickContentAndDesc(input: {
  content?: string | null;
  desc?: string | null;
}): string | null {
  const content = input.content?.trim() ?? '';
  const desc = input.desc?.trim() ?? '';

  if (content && desc) return `${content}\n\n${desc}`;
  if (content) return content;
  if (desc) return desc;
  return null;
}

/** Insert/update payload for `calendar_events` from an external provider. */
export interface CalendarEventInboundInput {
  user_id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  status: string;
  source: string;
  created_by: string;
  event_kind: string;
  sync_eligible: boolean;
}

// Mirrors `FINANCIAL_COUNTER_PATTERNS` in process-whatsapp-message/calendar-intent-parser.ts
// so financial-looking titles route to payable_bills, not calendar_events.
const FINANCIAL_COUNTER_PATTERNS = [
  /\b(pagar|pagamento|pago|vencer|vence|vencimento|fatura|boleto)\b/i,
  /\b(aluguel|condom[ií]nio|luz|[áa]gua|internet|telefone|celular|g[aá]s)\b/i,
  /\b(netflix|spotify|disney|iptu|ipva|seguro|mensalidade|assinatura)\b/i,
  /\b(conta|contas)\s+(de|do|da)\b/i,
  /\bdia\s*\d+\b/i,
  /\btodo\s*m[eê]s\b/i,
  /\bmensal\b/i,
  /\brecorrente\b/i,
  /\br\$\s*\d+\b/i,
  /\d+[\.,]?\d*\s*(reais?|real)\b/i,
];

export function isFinancialTitle(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return FINANCIAL_COUNTER_PATTERNS.some((pattern) => pattern.test(lower));
}

function parseTickTickDate(dateStr: string): string {
  const normalized = dateStr.replace(/\+0000$/, 'Z');
  const ms = new Date(normalized).getTime();
  if (Number.isNaN(ms)) {
    throw new Error('ticktick_task_invalid_date');
  }
  return new Date(ms).toISOString();
}

function resolveTickTickStartSource(task: TickTickTaskInbound): string {
  const start = task.startDate?.trim();
  if (start) return start;
  const due = task.dueDate?.trim();
  if (due) return due;
  throw new Error('ticktick_task_missing_dates');
}

export function mapTickTickTaskToCalendarEventInput(
  task: TickTickTaskInbound,
  userId: string,
  eventKind = 'external',
): CalendarEventInboundInput {
  if (isFinancialTitle(task.title)) {
    throw new Error('financial_titles_must_route_to_payable_bills');
  }

  const startSource = resolveTickTickStartSource(task);

  return {
    user_id: userId,
    title: task.title,
    description: combineTickTickContentAndDesc(task),
    start_at: parseTickTickDate(startSource),
    end_at: task.dueDate?.trim() ? parseTickTickDate(task.dueDate.trim()) : null,
    all_day: task.isAllDay ?? false,
    timezone: task.timeZone || 'America/Sao_Paulo',
    status: task.status === 2 ? 'completed' : 'scheduled',
    source: 'external',
    created_by: 'system',
    event_kind: eventKind,
    sync_eligible: true,
  };
}

export type SyncAction = 'no_change' | 'inbound_update' | 'outbound_push' | 'conflict';

function assertValidSyncTimestamp(iso: string): number {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) {
    throw new Error('invalid_sync_timestamp');
  }
  return ms;
}

export function detectSyncAction(params: {
  localUpdatedAt: string;
  remoteModifiedAt: string;
  lastSyncedAt: string;
}): SyncAction {
  const local = assertValidSyncTimestamp(params.localUpdatedAt);
  const remote = assertValidSyncTimestamp(params.remoteModifiedAt);
  const synced = assertValidSyncTimestamp(params.lastSyncedAt);

  const localChanged = local > synced;
  const remoteChanged = remote > synced;

  if (!localChanged && !remoteChanged) return 'no_change';
  if (!localChanged && remoteChanged) return 'inbound_update';
  if (localChanged && !remoteChanged) return 'outbound_push';
  return 'conflict';
}

/** Inbound sync: remote side detected via payload hash vs `external_payload_hash`; local side still uses `updated_at` vs `last_synced_at`. */
export function resolveHashBasedSyncAction(params: {
  storedHash: string | null;
  currentHash: string;
  localUpdatedAt: string;
  lastSyncedAt: string;
  forceRemoteRetry?: boolean;
}): SyncAction {
  const local = assertValidSyncTimestamp(params.localUpdatedAt);
  const synced = assertValidSyncTimestamp(params.lastSyncedAt);
  const localChanged = local > synced;
  const remoteChanged =
    params.forceRemoteRetry === true ||
    params.storedHash == null ||
    params.currentHash !== params.storedHash;

  if (!localChanged && !remoteChanged) return 'no_change';
  if (!localChanged && remoteChanged) return 'inbound_update';
  if (localChanged && !remoteChanged) return 'outbound_push';
  return 'conflict';
}
