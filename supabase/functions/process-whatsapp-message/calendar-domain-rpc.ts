export const DEFAULT_CALENDAR_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_EVENT_START_TIME = '09:00:00';
export const DEFAULT_EVENT_END_TIME = '10:00:00';

export function buildCreateCalendarEventRpcArgs(params: {
  userId: string;
  title: string;
  date: string;
  timezone: string;
  startTime?: string;
  endTime?: string;
}) {
  return {
    p_title: params.title,
    p_date: params.date,
    p_timezone: params.timezone,
    p_all_day: false,
    p_description: null,
    p_start_time: params.startTime ?? DEFAULT_EVENT_START_TIME,
    p_end_time: params.endTime ?? DEFAULT_EVENT_END_TIME,
    p_location_text: null,
    p_event_kind: 'personal',
    p_created_by: 'ana_clara',
    p_user_id: params.userId,
  };
}

export function buildSetCalendarEventStatusRpcArgs(params: {
  userId: string;
  eventId: string;
  status: 'completed' | 'cancelled';
}) {
  return {
    p_event_id: params.eventId,
    p_new_status: params.status,
    p_user_id: params.userId,
  };
}

export function buildUpdateCalendarEventRpcArgs(params: {
  userId: string;
  eventId: string;
  title: string;
  date: string;
  timezone: string;
  allDay?: boolean;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  locationText?: string | null;
  eventKind?: string | null;
  priority?: string | null;
  tickTickTags?: string[] | null;
}) {
  return {
    p_event_id: params.eventId,
    p_title: params.title,
    p_date: params.date,
    p_timezone: params.timezone,
    p_all_day: params.allDay ?? false,
    p_description: params.description ?? null,
    p_start_time: params.allDay ? null : params.startTime ?? DEFAULT_EVENT_START_TIME,
    p_end_time: params.allDay ? null : params.endTime ?? DEFAULT_EVENT_END_TIME,
    p_location_text: params.locationText ?? null,
    p_event_kind: params.eventKind ?? 'personal',
    p_priority: params.priority ?? null,
    p_ticktick_tags: params.tickTickTags ?? [],
    p_user_id: params.userId,
  };
}

export function buildDeleteCalendarEventRpcArgs(params: {
  userId: string;
  eventId: string;
}) {
  return {
    p_event_id: params.eventId,
    p_user_id: params.userId,
  };
}

/** V1 reminder specs for `set_calendar_event_reminders` (whatsapp channel on schedule rows). */
export type CalendarReminderSpecV1 = {
  remind_offset_minutes: number;
  enabled?: boolean;
  reminder_kind?: 'default' | 'prep' | 'deadline';
};

export function buildSetCalendarEventRemindersRpcArgs(params: {
  userId: string;
  eventId: string;
  reminders: CalendarReminderSpecV1[];
}) {
  return {
    p_event_id: params.eventId,
    p_reminders: params.reminders,
    p_user_id: params.userId,
  };
}

/** Args para `set_calendar_event_recurrence` (service role / `p_user_id`). */
export function buildSetCalendarEventRecurrenceRpcArgs(params: {
  userId: string;
  eventId: string;
  removeRecurrence: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  intervalValue?: number;
  byWeekday?: string[] | null;
  byMonthday?: number[] | null;
  startsAt?: string | null;
  untilAt?: string | null;
  countLimit?: number | null;
  timezone?: string | null;
  confirmDropOverrides?: boolean;
  confirmDropReminders?: boolean;
}) {
  return {
    p_event_id: params.eventId,
    p_remove_recurrence: params.removeRecurrence,
    p_frequency: params.removeRecurrence ? null : params.frequency ?? null,
    p_interval_value: params.intervalValue ?? 1,
    p_by_weekday: params.byWeekday ?? null,
    p_by_monthday: params.byMonthday ?? null,
    p_starts_at: params.startsAt ?? null,
    p_until_at: params.untilAt ?? null,
    p_count_limit: params.countLimit ?? null,
    p_timezone: params.timezone ?? null,
    p_confirm_drop_overrides: params.confirmDropOverrides ?? false,
    p_confirm_drop_reminders: params.confirmDropReminders ?? false,
    p_user_id: params.userId,
  };
}

export function describeReminderOffset(reminderOffsetMinutes?: number): string | undefined {
  if (!reminderOffsetMinutes) return undefined;

  if (reminderOffsetMinutes % 1440 === 0) {
    const days = Math.floor(reminderOffsetMinutes / 1440);
    return `Lembrete ${days} dia${days > 1 ? 's' : ''} antes`;
  }

  if (reminderOffsetMinutes >= 60) {
    const hours = Math.floor(reminderOffsetMinutes / 60);
    return `Lembrete ${hours}h antes`;
  }

  return `Lembrete ${reminderOffsetMinutes} min antes`;
}

export function describeReminderOffsets(reminderOffsetsMinutes: number[] | undefined): string | undefined {
  if (!reminderOffsetsMinutes || reminderOffsetsMinutes.length === 0) return undefined;

  const labels = reminderOffsetsMinutes
    .map((minutes) => describeReminderOffset(minutes)?.replace(/^Lembrete\s+/, ''))
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) return undefined;
  if (labels.length === 1) return `Lembrete: ${labels[0]}`;
  return `Lembretes: ${labels.join(', ')}`;
}

export function getTomorrowDateInTimezone(timezone: string, now: Date = new Date()): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = dateParts.find((part) => part.type === 'year')?.value;
  const month = dateParts.find((part) => part.type === 'month')?.value;
  const day = dateParts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to resolve timezone date');
  }

  const anchor = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
  anchor.setUTCDate(anchor.getUTCDate() + 1);
  return anchor.toISOString().slice(0, 10);
}

export function getDateInTimezone(timezone: string, now: Date = new Date()): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = dateParts.find((part) => part.type === 'year')?.value;
  const month = dateParts.find((part) => part.type === 'month')?.value;
  const day = dateParts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Unable to resolve timezone date');
  }

  return `${year}-${month}-${day}`;
}

export function getNextWeekdayDateInTimezone(
  timezone: string,
  weekday: number,
  now: Date = new Date(),
): string {
  const currentYmd = getDateInTimezone(timezone, now);
  const anchor = new Date(`${currentYmd}T12:00:00.000Z`);
  const currentWeekday = new Date(instantUtcIsoForWallClockInTimeZone(currentYmd, '12:00:00', timezone)).getUTCDay();
  let daysAhead = (weekday - currentWeekday + 7) % 7;
  if (daysAhead === 0) daysAhead = 7;
  anchor.setUTCDate(anchor.getUTCDate() + daysAhead);
  return anchor.toISOString().slice(0, 10);
}

export function getEndOfWeekDateInTimezone(timezone: string, now: Date = new Date()): string {
  const currentYmd = getDateInTimezone(timezone, now);
  const anchor = new Date(`${currentYmd}T12:00:00.000Z`);
  const currentWeekday = new Date(
    instantUtcIsoForWallClockInTimeZone(currentYmd, '12:00:00', timezone),
  ).getUTCDay();
  const daysAhead = currentWeekday === 0 ? 0 : 7 - currentWeekday;
  anchor.setUTCDate(anchor.getUTCDate() + daysAhead);
  return anchor.toISOString().slice(0, 10);
}

/** Wall clock in `timeZone` for an instant (sv-SE parts → sortable ymd + hms). */
export function formatZonedYmdHms(ms: number, timeZone: string): { ymd: string; hms: string } {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const g = (t: Intl.DateTimeFormatPart['type']) => parts.find((p) => p.type === t)?.value ?? '00';
  return {
    ymd: `${g('year')}-${g('month')}-${g('day')}`,
    hms: `${g('hour')}:${g('minute')}:${g('second')}`,
  };
}

/**
 * UTC instant (ISO string) for a civil date + time interpreted in `timeZone`.
 * Uses binary search; may fail around ambiguous DST folds (rare for America/Sao_Paulo).
 */
export function instantUtcIsoForWallClockInTimeZone(ymd: string, hms: string, timeZone: string): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    throw new Error('wall_clock_resolve_failed');
  }
  let lo = Date.UTC(y, mo - 1, d) - 36 * 3600 * 1000;
  let hi = Date.UTC(y, mo - 1, d) + 36 * 3600 * 1000;
  const target = `${ymd} ${hms}`;

  const key = (ms: number) => {
    const z = formatZonedYmdHms(ms, timeZone);
    return `${z.ymd} ${z.hms}`;
  };

  for (let i = 0; i < 64; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const k = key(mid);
    if (k === target) return new Date(mid).toISOString();
    if (k < target) lo = mid + 1;
    else hi = mid - 1;
    if (lo > hi) break;
  }
  throw new Error('wall_clock_resolve_failed');
}

/** Next calendar day in `timeZone`, same local clock as the displayed occurrence; preserves duration. */
export function buildOverrideRangeRescheduleToNextCalendarDay(params: {
  displayStartIso: string;
  displayEndIso: string | null;
  timeZone: string;
  now?: Date;
}): { overrideStartAt: string; overrideEndAt: string } {
  const startMs = Date.parse(params.displayStartIso);
  if (!Number.isFinite(startMs)) throw new Error('invalid_display_start');
  const endMs = params.displayEndIso ? Date.parse(params.displayEndIso) : startMs + 3600 * 1000;
  const durationMs = Math.max(0, endMs - startMs);

  const tz = params.timeZone;
  const tomorrowYmd = getTomorrowDateInTimezone(tz, params.now ?? new Date());
  const { hms } = formatZonedYmdHms(startMs, tz);
  const overrideStartAt = instantUtcIsoForWallClockInTimeZone(tomorrowYmd, hms, tz);
  const overrideEndAt = new Date(Date.parse(overrideStartAt) + durationMs).toISOString();
  return { overrideStartAt, overrideEndAt };
}

export function buildRescheduleCalendarOccurrenceRpcArgs(params: {
  userId: string;
  eventId: string;
  originalStartAt: string;
  overrideStartAt: string;
  overrideEndAt: string;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
}) {
  return {
    p_event_id: params.eventId,
    p_original_start_at: params.originalStartAt,
    p_override_start_at: params.overrideStartAt,
    p_override_end_at: params.overrideEndAt,
    p_title_override: params.titleOverride ?? null,
    p_description_override: params.descriptionOverride ?? null,
    p_user_id: params.userId,
  };
}
