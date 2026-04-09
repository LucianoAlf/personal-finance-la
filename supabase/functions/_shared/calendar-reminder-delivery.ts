export type ReminderChannel = 'whatsapp' | 'email' | 'push';

export interface BuildReminderScheduleEntryInput {
  eventId: string;
  reminderId: string;
  eventStartAt: string;
  remindOffsetMinutes: number;
  channel: ReminderChannel;
}

export interface NotificationPreferencesForReminder {
  whatsapp_enabled?: boolean | null;
  do_not_disturb_enabled?: boolean | null;
  do_not_disturb_start_time?: string | null;
  do_not_disturb_end_time?: string | null;
  do_not_disturb_days_of_week?: number[] | null;
}

export interface ReminderEventState {
  status: string;
  deleted_at: string | null;
}

export function buildReminderScheduleEntry(input: BuildReminderScheduleEntryInput) {
  const fireAt = new Date(new Date(input.eventStartAt).getTime() - input.remindOffsetMinutes * 60_000);
  const occurrenceKey = `${input.eventId}:${input.eventStartAt}`;
  return {
    event_id: input.eventId,
    reminder_id: input.reminderId,
    occurrence_key: occurrenceKey,
    fire_at: fireAt.toISOString(),
    channel: input.channel,
    idempotency_key: `${input.reminderId}:${occurrenceKey}:${input.channel}`,
    delivery_status: 'pending' as const,
  };
}

function getWeekdayInTimezone(now: Date, timezone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

function getTimeInTimezone(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

export function isWithinDoNotDisturb(input: {
  now: Date;
  timezone: string;
  enabled?: boolean | null;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: number[] | null;
}): boolean {
  if (!input.enabled) return false;

  const currentDay = getWeekdayInTimezone(input.now, input.timezone);
  const dndDays = input.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
  if (dndDays.length > 0 && !dndDays.includes(currentDay)) return false;

  const currentTime = getTimeInTimezone(input.now, input.timezone);
  const start = input.startTime ?? '22:00';
  const end = input.endTime ?? '08:00';

  if (start === end) return true;

  if (start < end) {
    return currentTime >= start && currentTime < end;
  }

  return currentTime >= start || currentTime < end;
}

export function evaluateReminderDispatch(input: {
  event: ReminderEventState;
  preferences: NotificationPreferencesForReminder | null;
  channel: ReminderChannel;
  now: Date;
  timezone: string;
}):
  | { action: 'send' }
  | { action: 'skip'; reason: string } {
  if (input.event.deleted_at) return { action: 'skip', reason: 'event_deleted' };
  if (input.event.status === 'cancelled') return { action: 'skip', reason: 'event_cancelled' };

  if (input.channel === 'whatsapp' && input.preferences?.whatsapp_enabled === false) {
    return { action: 'skip', reason: 'whatsapp_disabled' };
  }

  if (
    isWithinDoNotDisturb({
      now: input.now,
      timezone: input.timezone,
      enabled: input.preferences?.do_not_disturb_enabled,
      startTime: input.preferences?.do_not_disturb_start_time,
      endTime: input.preferences?.do_not_disturb_end_time,
      daysOfWeek: input.preferences?.do_not_disturb_days_of_week,
    })
  ) {
    return { action: 'skip', reason: 'dnd_active' };
  }

  return { action: 'send' };
}

export function computeReminderFailureUpdate(input: {
  now: Date;
  attemptCount: number;
  errorMessage: string;
  maxRetries?: number;
  backoffBaseMs?: number;
}) {
  const maxRetries = input.maxRetries ?? 3;
  const nextAttemptCount = input.attemptCount + 1;

  if (nextAttemptCount >= maxRetries) {
    return {
      delivery_status: 'failed' as const,
      attempt_count: nextAttemptCount,
      last_error: input.errorMessage,
    };
  }

  const backoffBaseMs = input.backoffBaseMs ?? 60_000;
  const nextFireAt = new Date(input.now.getTime() + backoffBaseMs * Math.pow(2, input.attemptCount));

  return {
    delivery_status: 'pending' as const,
    attempt_count: nextAttemptCount,
    fire_at: nextFireAt.toISOString(),
    last_error: input.errorMessage,
  };
}
