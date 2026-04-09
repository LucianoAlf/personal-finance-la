import { describe, expect, it } from 'vitest';
import {
  parseCalendarOccurrenceKey,
  resolveCalendarReminderDisplayStart,
} from '../calendar-occurrence-display';

describe('calendar-occurrence-display', () => {
  it('parses occurrence_key suffix as ISO instant after event id', () => {
    const eventId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = `${eventId}:2026-04-12T15:30:00.000Z`;
    expect(parseCalendarOccurrenceKey(key, eventId)?.toISOString()).toBe('2026-04-12T15:30:00.000Z');
  });

  it('returns null when event id prefix does not match', () => {
    const eventId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = '00000000-0000-0000-0000-000000000001:2026-04-12T15:30:00.000Z';
    expect(parseCalendarOccurrenceKey(key, eventId)).toBeNull();
  });

  it('uses override_start_at when present and not cancelled', () => {
    const eventId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = `${eventId}:2026-04-12T13:00:00.000Z`;
    const r = resolveCalendarReminderDisplayStart({
      occurrenceKey: key,
      eventId,
      eventStartAt: '2026-01-01T10:00:00.000Z',
      override: { is_cancelled: false, override_start_at: '2026-04-12T18:00:00.000Z' },
    });
    expect(r.shouldSkip).toBe(false);
    expect(r.displayAt.toISOString()).toBe('2026-04-12T18:00:00.000Z');
  });

  it('skips when override marks occurrence cancelled', () => {
    const eventId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = `${eventId}:2026-04-12T13:00:00.000Z`;
    const r = resolveCalendarReminderDisplayStart({
      occurrenceKey: key,
      eventId,
      eventStartAt: '2026-01-01T10:00:00.000Z',
      override: { is_cancelled: true, override_start_at: null },
    });
    expect(r.shouldSkip).toBe(true);
  });

  it('falls back to parsed original start from key when no override', () => {
    const eventId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = `${eventId}:2026-04-12T13:00:00.000Z`;
    const r = resolveCalendarReminderDisplayStart({
      occurrenceKey: key,
      eventId,
      eventStartAt: '2026-01-01T10:00:00.000Z',
      override: null,
    });
    expect(r.shouldSkip).toBe(false);
    expect(r.displayAt.toISOString()).toBe('2026-04-12T13:00:00.000Z');
  });
});
