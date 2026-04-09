/**
 * Parse `occurrence_key` from DB (`event_id` + ':' + JSON-ish timestamptz suffix).
 * Must match `public.calendar_occurrence_key` / reminder schedule rows.
 */
export function parseCalendarOccurrenceKey(
  occurrenceKey: string,
  expectedEventId: string,
): Date | null {
  const prefix = `${expectedEventId}:`;
  if (!occurrenceKey.startsWith(prefix)) return null;
  const raw = occurrenceKey.slice(prefix.length);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface OccurrenceOverrideLike {
  is_cancelled?: boolean | null;
  override_start_at?: string | null;
}

/**
 * Effective start time for reminder copy: rescheduled override wins; else original from key.
 * Cancelled single-occurrence overrides should not notify (shouldSkip).
 */
export function resolveCalendarReminderDisplayStart(params: {
  occurrenceKey: string;
  eventId: string;
  eventStartAt: string;
  override?: OccurrenceOverrideLike | null;
}): { displayAt: Date; shouldSkip: boolean } {
  if (params.override?.is_cancelled === true) {
    return { displayAt: new Date(params.eventStartAt), shouldSkip: true };
  }
  const fromKey = parseCalendarOccurrenceKey(params.occurrenceKey, params.eventId);
  const base = fromKey ?? new Date(params.eventStartAt);
  const ov = params.override?.override_start_at;
  if (ov) {
    const moved = new Date(ov);
    if (!Number.isNaN(moved.getTime())) {
      return { displayAt: moved, shouldSkip: false };
    }
  }
  return { displayAt: base, shouldSkip: false };
}
