import { describe, it, expect } from 'vitest';
import {
  buildTickTickPayload,
  formatDateForTickTick,
  isEventEligibleForSync,
  DEFAULT_TICKTICK_PROJECT_ID,
  parseTriggerToOffsetMinutes,
  offsetMinutesToTrigger,
  parseRruleToRecurrenceFields,
  recurrenceFieldsToRrule,
  mapTickTickPriority,
  mapAppPriorityToTickTick,
  buildExternalPayloadHash,
  calendarRecurrenceRowToFields,
  type CalendarEventForSync,
} from '../ticktick-mapping';

function makeEvent(overrides: Partial<CalendarEventForSync> = {}): CalendarEventForSync {
  return {
    id: 'evt-001',
    title: 'Consulta smoke',
    description: null,
    start_at: '2026-04-10T12:00:00.000Z',
    end_at: '2026-04-10T13:00:00.000Z',
    all_day: false,
    timezone: 'America/Sao_Paulo',
    status: 'scheduled',
    location_text: null,
    event_kind: 'personal',
    sync_eligible: true,
    deleted_at: null,
    ...overrides,
  };
}

describe('ticktick-mapping', () => {
  describe('formatDateForTickTick', () => {
    it('formats ISO date to TickTick format', () => {
      const result = formatDateForTickTick('2026-04-10T12:00:00.000Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0000$/);
    });
    it('preserves UTC clock time when serializing +0000', () => {
      expect(formatDateForTickTick('2026-04-10T12:34:56.000Z')).toBe('2026-04-10T12:34:56+0000');
    });
  });

  describe('isEventEligibleForSync', () => {
    it('returns true for scheduled, sync_eligible, non-deleted event', () => {
      expect(isEventEligibleForSync(makeEvent())).toBe(true);
    });

    it('returns false when sync_eligible is false', () => {
      expect(isEventEligibleForSync(makeEvent({ sync_eligible: false }))).toBe(false);
    });

    it('returns false for cancelled events', () => {
      expect(isEventEligibleForSync(makeEvent({ status: 'cancelled' }))).toBe(false);
    });

    it('returns false for soft-deleted events', () => {
      expect(
        isEventEligibleForSync(makeEvent({ deleted_at: '2026-04-09T00:00:00Z' })),
      ).toBe(false);
    });

    it('returns true for completed events (they still mirror)', () => {
      expect(isEventEligibleForSync(makeEvent({ status: 'completed' }))).toBe(true);
    });
  });

  describe('buildTickTickPayload', () => {
    it('creates payload with required fields for new task', () => {
      const event = makeEvent();
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.title).toBe('Consulta smoke');
      expect(payload.projectId).toBe(DEFAULT_TICKTICK_PROJECT_ID);
      expect(payload.isAllDay).toBe(false);
      expect(payload.timeZone).toBe('America/Sao_Paulo');
      expect(payload.startDate).toBeDefined();
      expect(payload.dueDate).toBeDefined();
      expect(payload.id).toBeUndefined();
    });

    it('includes existingTaskId when provided (update)', () => {
      const event = makeEvent();
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID, 'tt-task-123');

      expect(payload.id).toBe('tt-task-123');
    });

    it('includes content when description is present', () => {
      const event = makeEvent({ description: 'Levar documentos' });
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.content).toBe('Levar documentos');
    });

    it('omits content when description is null', () => {
      const event = makeEvent({ description: null });
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.content).toBeUndefined();
    });

    it('marks isAllDay true for all-day events', () => {
      const event = makeEvent({ all_day: true });
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.isAllDay).toBe(true);
    });

    it('serializes all-day dueDate as midnight UTC of the local calendar date', () => {
      const event = makeEvent({
        all_day: true,
        timezone: 'America/Fortaleza',
        start_at: '2026-11-21T03:00:00.000Z',
        end_at: '2026-11-22T02:59:59.000Z',
      });
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.startDate).toBe('2026-11-21T03:00:00+0000');
      expect(payload.dueDate).toBe('2026-11-21T00:00:00+0000');
    });

    it('omits startDate and dueDate when not set', () => {
      const event = makeEvent({ start_at: '', end_at: null });
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.startDate).toBeUndefined();
      expect(payload.dueDate).toBeUndefined();
    });

    it('defaults timezone to America/Sao_Paulo when empty', () => {
      const event = makeEvent({ timezone: '' });
      const payload = buildTickTickPayload(event, DEFAULT_TICKTICK_PROJECT_ID);

      expect(payload.timeZone).toBe('America/Sao_Paulo');
    });
  });

  describe('DEFAULT_TICKTICK_PROJECT_ID', () => {
    it('matches Pessoal Alf project', () => {
      expect(DEFAULT_TICKTICK_PROJECT_ID).toBe('643c0518525047536b6594d0');
    });
  });

  describe('parseTriggerToOffsetMinutes', () => {
    it('parses PT0S as 0', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:PT0S')).toBe(0);
    });
    it('parses P0DT9H0M0S as 540', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:P0DT9H0M0S')).toBe(540);
    });
    it('parses P1DT0H0M0S as 1440', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:P1DT0H0M0S')).toBe(1440);
    });
    it('parses PT30M0S as 30', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:PT30M0S')).toBe(30);
    });
    it('parses PT1H0M0S as 60', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:PT1H0M0S')).toBe(60);
    });
    it('returns null for invalid format', () => {
      expect(parseTriggerToOffsetMinutes('not-a-trigger')).toBeNull();
    });
    it('returns null for empty string', () => {
      expect(parseTriggerToOffsetMinutes('')).toBeNull();
    });
    it('returns null when trigger includes non-zero seconds', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:PT30M15S')).toBeNull();
    });
    it('returns null when full trigger includes non-zero seconds', () => {
      expect(parseTriggerToOffsetMinutes('TRIGGER:P0DT1H0M5S')).toBeNull();
    });
  });

  describe('offsetMinutesToTrigger', () => {
    it('converts 0 to TRIGGER:PT0S', () => {
      expect(offsetMinutesToTrigger(0)).toBe('TRIGGER:PT0S');
    });
    it('converts 30 to TRIGGER:P0DT0H30M0S', () => {
      expect(offsetMinutesToTrigger(30)).toBe('TRIGGER:P0DT0H30M0S');
    });
    it('converts 540 to TRIGGER:P0DT9H0M0S', () => {
      expect(offsetMinutesToTrigger(540)).toBe('TRIGGER:P0DT9H0M0S');
    });
    it('converts 1440 to TRIGGER:P1DT0H0M0S', () => {
      expect(offsetMinutesToTrigger(1440)).toBe('TRIGGER:P1DT0H0M0S');
    });
    it('converts 2910 (2d 0h 30m) to TRIGGER:P2DT0H30M0S', () => {
      expect(offsetMinutesToTrigger(2910)).toBe('TRIGGER:P2DT0H30M0S');
    });
    it('round-trips with parseTriggerToOffsetMinutes for sample offsets', () => {
      for (const m of [0, 15, 90, 540, 1440, 2910]) {
        expect(parseTriggerToOffsetMinutes(offsetMinutesToTrigger(m))).toBe(m);
      }
    });
    it('throws for negative offsets', () => {
      expect(() => offsetMinutesToTrigger(-1)).toThrow('invalid_remind_offset_minutes');
    });
    it('throws for non-integer offsets', () => {
      expect(() => offsetMinutesToTrigger(30.5)).toThrow('invalid_remind_offset_minutes');
    });
    it('throws for non-finite offsets', () => {
      expect(() => offsetMinutesToTrigger(Number.POSITIVE_INFINITY)).toThrow(
        'invalid_remind_offset_minutes',
      );
      expect(() => offsetMinutesToTrigger(Number.NaN)).toThrow('invalid_remind_offset_minutes');
    });
  });

  describe('parseRruleToRecurrenceFields', () => {
    it('parses FREQ=DAILY;INTERVAL=1', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1')).toEqual({
        frequency: 'daily',
        interval_value: 1,
        by_weekday: null,
        by_monthday: null,
        until_at: null,
        count_limit: null,
      });
    });
    it('parses FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR'),
      ).toEqual({
        frequency: 'weekly',
        interval_value: 1,
        by_weekday: ['MO', 'WE', 'FR'],
        by_monthday: null,
        until_at: null,
        count_limit: null,
      });
    });
    it('parses FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15'),
      ).toEqual({
        frequency: 'monthly',
        interval_value: 1,
        by_weekday: null,
        by_monthday: [15],
        until_at: null,
        count_limit: null,
      });
    });
    it('parses valid UNTIL in UTC basic format', () => {
      const result = parseRruleToRecurrenceFields(
        'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231T235959Z',
      );
      expect(result?.until_at).toBe('20261231T235959Z');
    });
    it('parses COUNT', () => {
      const result = parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10');
      expect(result?.count_limit).toBe(10);
    });
    it('returns null when COUNT and UNTIL are both present', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5;UNTIL=20261231T235959Z'),
      ).toBeNull();
    });
    it('parses FREQ=YEARLY using the same annual anchor semantics as TickTick', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=YEARLY;INTERVAL=1')).toEqual({
        frequency: 'yearly',
        interval_value: 1,
        by_weekday: null,
        by_monthday: null,
        until_at: null,
        count_limit: null,
      });
    });
    it('returns null for empty string', () => {
      expect(parseRruleToRecurrenceFields('')).toBeNull();
    });
    it('returns null for BYSETPOS (unsupported V1)', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;BYSETPOS=2;BYDAY=TU'),
      ).toBeNull();
    });
    it('returns null for BYHOUR (unsupported V1)', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;BYHOUR=9')).toBeNull();
    });
    it('returns null for BYMINUTE (unsupported V1)', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;BYMINUTE=30')).toBeNull();
    });
    it('returns null for unsupported BYMONTH param', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;BYMONTH=1')).toBeNull();
    });
    it('returns null for empty param value', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;BYHOUR=')).toBeNull();
    });
    it('returns null for malformed param with multiple equals', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1=2')).toBeNull();
    });
    it('returns null for malformed part without equals', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL')).toBeNull();
    });
    it('returns null for duplicate FREQ', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;FREQ=WEEKLY;INTERVAL=1')).toBeNull();
    });
    it('returns null for duplicate COUNT', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;COUNT=5;COUNT=6')).toBeNull();
    });
    it('returns null for duplicate UNTIL', () => {
      expect(
        parseRruleToRecurrenceFields(
          'RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231T235959Z;UNTIL=20270101T000000Z',
        ),
      ).toBeNull();
    });
    it('returns null for invalid BYDAY token', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,XY')).toBeNull();
    });
    it('returns null for malformed BYDAY token', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MON')).toBeNull();
    });
    it('returns null for BYMONTHDAY zero', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=0')).toBeNull();
    });
    it('returns null for BYMONTHDAY above valid range', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=32'),
      ).toBeNull();
    });
    it('returns null for malformed BYMONTHDAY token', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15,abc'),
      ).toBeNull();
    });
    it('returns null for malformed UNTIL shape', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=2026-12-31T23:59:59Z'),
      ).toBeNull();
    });
    it('returns null for impossible UNTIL date', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20260230T235959Z'),
      ).toBeNull();
    });
    it('returns null for DAILY combined with BYDAY', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=DAILY;INTERVAL=1;BYDAY=MO')).toBeNull();
    });
    it('returns null for WEEKLY combined with BYMONTHDAY', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=WEEKLY;INTERVAL=1;BYMONTHDAY=15'),
      ).toBeNull();
    });
    it('returns null for MONTHLY combined with BYDAY', () => {
      expect(parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=MO')).toBeNull();
    });
    it('returns null when BYDAY and BYMONTHDAY are both present', () => {
      expect(
        parseRruleToRecurrenceFields('RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=MO;BYMONTHDAY=15'),
      ).toBeNull();
    });
  });

  describe('recurrenceFieldsToRrule', () => {
    it('builds daily RRULE', () => {
      expect(
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 1,
          by_weekday: null,
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toBe('RRULE:FREQ=DAILY;INTERVAL=1');
    });
    it('builds weekly with BYDAY', () => {
      expect(
        recurrenceFieldsToRrule({
          frequency: 'weekly',
          interval_value: 1,
          by_weekday: ['MO', 'WE', 'FR'],
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR');
    });
    it('builds monthly with BYMONTHDAY', () => {
      expect(
        recurrenceFieldsToRrule({
          frequency: 'monthly',
          interval_value: 1,
          by_weekday: null,
          by_monthday: [15],
          until_at: null,
          count_limit: null,
        }),
      ).toBe('RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15');
    });
    it('builds yearly RRULE', () => {
      expect(
        recurrenceFieldsToRrule({
          frequency: 'yearly',
          interval_value: 1,
          by_weekday: null,
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toBe('RRULE:FREQ=YEARLY;INTERVAL=1');
    });
    it('includes COUNT', () => {
      expect(
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 2,
          by_weekday: null,
          by_monthday: null,
          until_at: null,
          count_limit: 5,
        }),
      ).toBe('RRULE:FREQ=DAILY;INTERVAL=2;COUNT=5');
    });
    it('includes UNTIL', () => {
      expect(
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 1,
          by_weekday: null,
          by_monthday: null,
          until_at: '20261231T235959Z',
          count_limit: null,
        }),
      ).toBe('RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231T235959Z');
    });
    it('round-trips parse for supported rules', () => {
      const original = 'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;COUNT=8';
      const fields = parseRruleToRecurrenceFields(original);
      expect(fields).not.toBeNull();
      expect(recurrenceFieldsToRrule(fields!)).toBe(original);
    });
    it('throws when count_limit and until_at are both present', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 1,
          by_weekday: null,
          by_monthday: null,
          until_at: '20261231T235959Z',
          count_limit: 5,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws when daily includes by_weekday', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 1,
          by_weekday: ['MO'],
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws when daily includes by_monthday', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 1,
          by_weekday: null,
          by_monthday: [15],
          until_at: null,
          count_limit: null,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws when weekly includes by_monthday', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'weekly',
          interval_value: 1,
          by_weekday: null,
          by_monthday: [15],
          until_at: null,
          count_limit: null,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws when monthly includes by_weekday', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'monthly',
          interval_value: 1,
          by_weekday: ['MO'],
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws when by_weekday and by_monthday are both present', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'weekly',
          interval_value: 1,
          by_weekday: ['MO'],
          by_monthday: [15],
          until_at: null,
          count_limit: null,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws for invalid interval_value', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 0,
          by_weekday: null,
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
    it('throws for invalid count_limit', () => {
      expect(() =>
        recurrenceFieldsToRrule({
          frequency: 'daily',
          interval_value: 1,
          by_weekday: null,
          by_monthday: null,
          until_at: null,
          count_limit: 0,
        }),
      ).toThrow('invalid_recurrence_fields');
    });
  });

  describe('calendarRecurrenceRowToFields', () => {
    it('maps yearly rows so outbound sync can emit RRULE:FREQ=YEARLY', () => {
      expect(
        calendarRecurrenceRowToFields({
          frequency: 'yearly',
          interval_value: 1,
          by_weekday: null,
          by_monthday: null,
          until_at: null,
          count_limit: null,
        }),
      ).toEqual({
        frequency: 'yearly',
        interval_value: 1,
        by_weekday: null,
        by_monthday: null,
        until_at: null,
        count_limit: null,
      });
    });
  });

  describe('mapTickTickPriority', () => {
    it('maps 0 to null', () => {
      expect(mapTickTickPriority(0)).toBeNull();
    });
    it('maps 1 to low', () => {
      expect(mapTickTickPriority(1)).toBe('low');
    });
    it('maps 3 to medium', () => {
      expect(mapTickTickPriority(3)).toBe('medium');
    });
    it('maps 5 to high', () => {
      expect(mapTickTickPriority(5)).toBe('high');
    });
    it('maps unknown to null', () => {
      expect(mapTickTickPriority(99)).toBeNull();
    });
  });

  describe('mapAppPriorityToTickTick', () => {
    it('maps null to 0', () => {
      expect(mapAppPriorityToTickTick(null)).toBe(0);
    });
    it('maps low to 1', () => {
      expect(mapAppPriorityToTickTick('low')).toBe(1);
    });
    it('maps medium to 3', () => {
      expect(mapAppPriorityToTickTick('medium')).toBe(3);
    });
    it('maps high to 5', () => {
      expect(mapAppPriorityToTickTick('high')).toBe(5);
    });
    it('maps unknown label to 0', () => {
      expect(mapAppPriorityToTickTick('urgent')).toBe(0);
    });
  });

  describe('buildExternalPayloadHash', () => {
    const task = {
      title: 'Test',
      startDate: '2026-04-15T09:00:00.000+0000',
      dueDate: '2026-04-15T11:00:00.000+0000',
      repeatFlag: 'RRULE:FREQ=DAILY;INTERVAL=1',
      reminders: ['TRIGGER:PT30M0S'],
      priority: 3,
      status: 0,
    };
    it('returns a consistent string hash', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash(task);
      expect(h1).toBe(h2);
      expect(typeof h1).toBe('string');
      expect(h1.length).toBeGreaterThan(0);
    });
    it('changes when a field changes', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({ ...task, title: 'Changed' });
      expect(h1).not.toBe(h2);
    });
    it('changes when startDate changes', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({
        ...task,
        startDate: '2026-04-15T10:00:00.000+0000',
      });
      expect(h1).not.toBe(h2);
    });
    it('changes when dueDate changes', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({
        ...task,
        dueDate: '2026-04-15T12:00:00.000+0000',
      });
      expect(h1).not.toBe(h2);
    });
    it('changes when reminders change', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({ ...task, reminders: ['TRIGGER:PT1H0M0S'] });
      expect(h1).not.toBe(h2);
    });
    it('is order-insensitive for reminders', () => {
      const a = buildExternalPayloadHash({ ...task, reminders: ['TRIGGER:PT30M0S', 'TRIGGER:PT0S'] });
      const b = buildExternalPayloadHash({ ...task, reminders: ['TRIGGER:PT0S', 'TRIGGER:PT30M0S'] });
      expect(a).toBe(b);
    });
    it('changes when repeatFlag changes', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({
        ...task,
        repeatFlag: 'RRULE:FREQ=WEEKLY;INTERVAL=1',
      });
      expect(h1).not.toBe(h2);
    });
    it('changes when status changes because outbound payload syncs completion state', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({ ...task, status: 2 });
      expect(h1).not.toBe(h2);
    });
    it('changes when priority changes', () => {
      const h1 = buildExternalPayloadHash(task);
      const h2 = buildExternalPayloadHash({ ...task, priority: 5 });
      expect(h1).not.toBe(h2);
    });
  });
});
