import { describe, expect, it } from 'vitest';
import {
  buildCreateCalendarEventRpcArgs,
  buildOverrideRangeRescheduleToNextCalendarDay,
  buildRescheduleCalendarOccurrenceRpcArgs,
  buildSetCalendarEventRecurrenceRpcArgs,
  buildSetCalendarEventRemindersRpcArgs,
  buildSetCalendarEventStatusRpcArgs,
  describeReminderOffset,
  formatZonedYmdHms,
  getTomorrowDateInTimezone,
  instantUtcIsoForWallClockInTimeZone,
} from '../calendar-domain-rpc.ts';

describe('calendar-domain-rpc helpers', () => {
  it('buildCreateCalendarEventRpcArgs preserves semantic RPC path for Ana Clara', () => {
    const args = buildCreateCalendarEventRpcArgs({
      userId: 'user-123',
      title: 'Dentista',
      date: '2026-04-10',
      timezone: 'America/Sao_Paulo',
    });

    expect(args).toEqual({
      p_title: 'Dentista',
      p_date: '2026-04-10',
      p_timezone: 'America/Sao_Paulo',
      p_all_day: false,
      p_description: null,
      p_start_time: '09:00:00',
      p_end_time: '10:00:00',
      p_location_text: null,
      p_event_kind: 'personal',
      p_created_by: 'ana_clara',
      p_user_id: 'user-123',
    });
  });

  it('buildSetCalendarEventStatusRpcArgs forwards user context for service role callers', () => {
    expect(
      buildSetCalendarEventStatusRpcArgs({
        userId: 'user-123',
        eventId: 'event-999',
        status: 'cancelled',
      }),
    ).toEqual({
      p_event_id: 'event-999',
      p_new_status: 'cancelled',
      p_user_id: 'user-123',
    });
  });

  it('buildSetCalendarEventRemindersRpcArgs maps V1 payload for set_calendar_event_reminders', () => {
    expect(
      buildSetCalendarEventRemindersRpcArgs({
        userId: 'user-123',
        eventId: 'event-abc',
        reminders: [
          { remind_offset_minutes: 30, enabled: true, reminder_kind: 'default' },
          { remind_offset_minutes: 120, enabled: false },
        ],
      }),
    ).toEqual({
      p_event_id: 'event-abc',
      p_user_id: 'user-123',
      p_reminders: [
        { remind_offset_minutes: 30, enabled: true, reminder_kind: 'default' },
        { remind_offset_minutes: 120, enabled: false },
      ],
    });
  });

  it('describeReminderOffset returns human readable labels', () => {
    expect(describeReminderOffset(30)).toBe('Lembrete 30 min antes');
    expect(describeReminderOffset(120)).toBe('Lembrete 2h antes');
  });

  it('getTomorrowDateInTimezone advances one calendar day in target timezone', () => {
    expect(
      getTomorrowDateInTimezone('America/Sao_Paulo', new Date('2026-04-08T23:30:00.000Z')),
    ).toBe('2026-04-09');
  });

  it('buildSetCalendarEventRecurrenceRpcArgs forwards service-role user and recurrence fields', () => {
    expect(
      buildSetCalendarEventRecurrenceRpcArgs({
        userId: 'user-123',
        eventId: 'event-abc',
        removeRecurrence: false,
        frequency: 'weekly',
        intervalValue: 1,
        byWeekday: ['mon', 'wed'],
        confirmDropReminders: true,
      }),
    ).toEqual({
      p_event_id: 'event-abc',
      p_remove_recurrence: false,
      p_frequency: 'weekly',
      p_interval_value: 1,
      p_by_weekday: ['mon', 'wed'],
      p_by_monthday: null,
      p_starts_at: null,
      p_until_at: null,
      p_count_limit: null,
      p_timezone: null,
      p_confirm_drop_overrides: false,
      p_confirm_drop_reminders: true,
      p_user_id: 'user-123',
    });
  });

  it('instantUtcIsoForWallClockInTimeZone resolves America/Sao_Paulo wall clock', () => {
    const iso = instantUtcIsoForWallClockInTimeZone('2026-04-10', '15:30:00', 'America/Sao_Paulo');
    const z = formatZonedYmdHms(Date.parse(iso), 'America/Sao_Paulo');
    expect(z.ymd).toBe('2026-04-10');
    expect(z.hms).toBe('15:30:00');
  });

  it('buildOverrideRangeRescheduleToNextCalendarDay preserves duration and shifts to tomorrow', () => {
    const now = new Date('2026-04-08T12:00:00.000Z');
    const out = buildOverrideRangeRescheduleToNextCalendarDay({
      displayStartIso: '2026-04-10T18:00:00.000Z',
      displayEndIso: '2026-04-10T19:30:00.000Z',
      timeZone: 'America/Sao_Paulo',
      now,
    });
    expect(getTomorrowDateInTimezone('America/Sao_Paulo', now)).toBe('2026-04-09');
    const startMs = Date.parse(out.overrideStartAt);
    const endMs = Date.parse(out.overrideEndAt);
    expect(endMs - startMs).toBe(90 * 60 * 1000);
    const z = formatZonedYmdHms(startMs, 'America/Sao_Paulo');
    expect(z.ymd).toBe('2026-04-09');
  });

  it('buildRescheduleCalendarOccurrenceRpcArgs matches reschedule_calendar_occurrence surface', () => {
    expect(
      buildRescheduleCalendarOccurrenceRpcArgs({
        userId: 'u1',
        eventId: 'e1',
        originalStartAt: '2026-04-10T12:00:00.000Z',
        overrideStartAt: '2026-04-11T12:00:00.000Z',
        overrideEndAt: '2026-04-11T13:00:00.000Z',
        titleOverride: null,
      }),
    ).toEqual({
      p_event_id: 'e1',
      p_original_start_at: '2026-04-10T12:00:00.000Z',
      p_override_start_at: '2026-04-11T12:00:00.000Z',
      p_override_end_at: '2026-04-11T13:00:00.000Z',
      p_title_override: null,
      p_description_override: null,
      p_user_id: 'u1',
    });
  });
});
