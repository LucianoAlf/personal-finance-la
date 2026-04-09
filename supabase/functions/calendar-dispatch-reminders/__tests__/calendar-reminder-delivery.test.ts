import { describe, expect, it } from 'vitest';
import {
  buildReminderScheduleEntry,
  computeReminderFailureUpdate,
  evaluateReminderDispatch,
  isWithinDoNotDisturb,
} from '../../_shared/calendar-reminder-delivery';

describe('calendar-reminder-delivery', () => {
  it('builds reminder schedule row with fire_at, occurrence_key and idempotency key', () => {
    const row = buildReminderScheduleEntry({
      eventId: 'evt-1',
      reminderId: 'rem-1',
      eventStartAt: '2026-04-12T13:00:00.000Z',
      remindOffsetMinutes: 15,
      channel: 'whatsapp',
    });

    expect(row.occurrence_key).toBe('evt-1:2026-04-12T13:00:00.000Z');
    expect(row.idempotency_key).toBe('rem-1:evt-1:2026-04-12T13:00:00.000Z:whatsapp');
    expect(row.fire_at).toBe('2026-04-12T12:45:00.000Z');
    expect(row.delivery_status).toBe('pending');
  });

  it('detects overnight DND windows correctly', () => {
    expect(
      isWithinDoNotDisturb({
        now: new Date('2026-04-08T02:30:00.000Z'),
        timezone: 'America/Sao_Paulo',
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      }),
    ).toBe(true);
  });

  it('detects same-day DND windows correctly', () => {
    expect(
      isWithinDoNotDisturb({
        now: new Date('2026-04-08T15:00:00.000Z'),
        timezone: 'America/Sao_Paulo',
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      }),
    ).toBe(true);
  });

  it('skips cancelled events before any delivery attempt', () => {
    const result = evaluateReminderDispatch({
      event: { status: 'cancelled', deleted_at: null },
      preferences: { whatsapp_enabled: true, do_not_disturb_enabled: false },
      channel: 'whatsapp',
      now: new Date('2026-04-08T15:00:00.000Z'),
      timezone: 'America/Sao_Paulo',
    });

    expect(result).toEqual({ action: 'skip', reason: 'event_cancelled' });
  });

  it('skips when whatsapp is disabled in notification preferences', () => {
    const result = evaluateReminderDispatch({
      event: { status: 'scheduled', deleted_at: null },
      preferences: { whatsapp_enabled: false, do_not_disturb_enabled: false },
      channel: 'whatsapp',
      now: new Date('2026-04-08T15:00:00.000Z'),
      timezone: 'America/Sao_Paulo',
    });

    expect(result).toEqual({ action: 'skip', reason: 'whatsapp_disabled' });
  });

  it('skips while DND is active', () => {
    const result = evaluateReminderDispatch({
      event: { status: 'scheduled', deleted_at: null },
      preferences: {
        whatsapp_enabled: true,
        do_not_disturb_enabled: true,
        do_not_disturb_start_time: '22:00',
        do_not_disturb_end_time: '08:00',
        do_not_disturb_days_of_week: [0, 1, 2, 3, 4, 5, 6],
      },
      channel: 'whatsapp',
      now: new Date('2026-04-08T02:30:00.000Z'),
      timezone: 'America/Sao_Paulo',
    });

    expect(result).toEqual({ action: 'skip', reason: 'dnd_active' });
  });

  it('allows send when event and preferences are eligible', () => {
    const result = evaluateReminderDispatch({
      event: { status: 'scheduled', deleted_at: null },
      preferences: { whatsapp_enabled: true, do_not_disturb_enabled: false },
      channel: 'whatsapp',
      now: new Date('2026-04-08T15:00:00.000Z'),
      timezone: 'America/Sao_Paulo',
    });

    expect(result).toEqual({ action: 'send' });
  });

  it('keeps transient failures pending with backoff before max retries', () => {
    const result = computeReminderFailureUpdate({
      now: new Date('2026-04-08T15:00:00.000Z'),
      attemptCount: 0,
      errorMessage: 'UAZAPI 500',
    });

    expect(result.delivery_status).toBe('pending');
    expect(result.attempt_count).toBe(1);
    expect(result.last_error).toContain('UAZAPI 500');
  });

  it('marks reminder as failed after max retries', () => {
    const result = computeReminderFailureUpdate({
      now: new Date('2026-04-08T15:00:00.000Z'),
      attemptCount: 2,
      errorMessage: 'timeout',
      maxRetries: 3,
    });

    expect(result.delivery_status).toBe('failed');
    expect(result.attempt_count).toBe(3);
    expect(result.last_error).toContain('timeout');
  });
});
