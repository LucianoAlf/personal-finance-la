import { describe, it, expect } from 'vitest';

import {

  detectSyncAction,

  isFinancialTitle,

  mapTickTickTaskToCalendarEventInput,

  type TickTickTaskInbound,

} from '../ticktick-mapping';



describe('isFinancialTitle', () => {

  it('returns true for bill-like / financial titles', () => {

    expect(isFinancialTitle('Pagar fatura do cartão')).toBe(true);

    expect(isFinancialTitle('Boleto Nubank')).toBe(true);

    expect(isFinancialTitle('Conta de luz')).toBe(true);

    expect(isFinancialTitle('Lembrete dia 10')).toBe(true);

    expect(isFinancialTitle('Assinatura Netflix')).toBe(true);

  });



  it('returns false for agenda-like titles', () => {

    expect(isFinancialTitle('Reunião com cliente')).toBe(false);

    expect(isFinancialTitle('Consulta médica')).toBe(false);

    expect(isFinancialTitle('Almoço com equipe')).toBe(false);

  });

});



describe('mapTickTickTaskToCalendarEventInput', () => {

  const baseTask: TickTickTaskInbound = {

    id: 'tt-123',

    title: 'Reunião com cliente',

    content: 'Discutir proposta',

    startDate: '2026-04-15T14:00:00+0000',

    dueDate: '2026-04-15T15:00:00+0000',

    isAllDay: false,

    timeZone: 'America/Sao_Paulo',

    projectId: 'proj-abc',

    modifiedTime: '2026-04-10T10:00:00+0000',

    status: 0,

  };



  it('maps TickTick task to calendar event input', () => {

    const result = mapTickTickTaskToCalendarEventInput(baseTask, 'user-uuid');

    expect(result.title).toBe('Reunião com cliente');

    expect(result.description).toBe('Discutir proposta');

    expect(result.user_id).toBe('user-uuid');

    expect(result.source).toBe('external');

    expect(result.created_by).toBe('system');

    expect(result.sync_eligible).toBe(true);

    expect(result.event_kind).toBe('external');

    expect(result.start_at).toBe('2026-04-15T14:00:00.000Z');

    expect(result.end_at).toBe('2026-04-15T15:00:00.000Z');

    expect(result.all_day).toBe(false);

    expect(result.timezone).toBe('America/Sao_Paulo');

    expect(result.status).toBe('scheduled');

  });

  it('combines content and desc when both are present', () => {

    const result = mapTickTickTaskToCalendarEventInput(
      { ...baseTask, content: 'Discutir proposta', desc: 'Levar anexos' },
      'user-uuid',
    );

    expect(result.description).toBe('Discutir proposta\n\nLevar anexos');

  });

  it('uses desc once when content is absent', () => {

    const result = mapTickTickTaskToCalendarEventInput(
      { ...baseTask, content: undefined, desc: 'Levar anexos' },
      'user-uuid',
    );

    expect(result.description).toBe('Levar anexos');

  });



  it('maps completed TickTick task with status=2 to completed', () => {

    const completed = { ...baseTask, status: 2 };

    const result = mapTickTickTaskToCalendarEventInput(completed, 'user-uuid');

    expect(result.status).toBe('completed');

  });



  it('respects optional eventKind', () => {

    const result = mapTickTickTaskToCalendarEventInput(baseTask, 'user-uuid', 'work');

    expect(result.event_kind).toBe('work');

  });

  it('defaults to external when eventKind is omitted', () => {

    const result = mapTickTickTaskToCalendarEventInput(baseTask, 'user-uuid');

    expect(result.event_kind).toBe('external');

  });



  it('throws when title is financial (must route to payable_bills)', () => {

    const financial = { ...baseTask, title: 'Pagar boleto' };

    expect(() => mapTickTickTaskToCalendarEventInput(financial, 'user-uuid')).toThrow(

      'financial_titles_must_route_to_payable_bills',

    );

  });



  it('uses dueDate as start_at when startDate is missing', () => {

    const onlyDue: TickTickTaskInbound = {

      ...baseTask,

      startDate: undefined,

      dueDate: '2026-04-20T09:30:00+0000',

    };

    const result = mapTickTickTaskToCalendarEventInput(onlyDue, 'user-uuid');

    expect(result.start_at).toBe('2026-04-20T09:30:00.000Z');

    expect(result.end_at).toBe('2026-04-20T09:30:00.000Z');

  });



  it('throws ticktick_task_missing_dates when both startDate and dueDate are absent', () => {

    const noDates: TickTickTaskInbound = {

      ...baseTask,

      startDate: undefined,

      dueDate: undefined,

    };

    expect(() => mapTickTickTaskToCalendarEventInput(noDates, 'user-uuid')).toThrow(

      'ticktick_task_missing_dates',

    );

  });



  it('throws ticktick_task_missing_dates when startDate and dueDate are blank', () => {

    const blank: TickTickTaskInbound = {

      ...baseTask,

      startDate: '   ',

      dueDate: '',

    };

    expect(() => mapTickTickTaskToCalendarEventInput(blank, 'user-uuid')).toThrow(

      'ticktick_task_missing_dates',

    );

  });



  it('throws ticktick_task_invalid_date when a date string does not parse', () => {

    const bad: TickTickTaskInbound = { ...baseTask, startDate: 'not-a-date', dueDate: undefined };

    expect(() => mapTickTickTaskToCalendarEventInput(bad, 'user-uuid')).toThrow(

      'ticktick_task_invalid_date',

    );

  });

});



describe('detectSyncAction', () => {

  it('returns no_change when timestamps match', () => {

    const result = detectSyncAction({

      localUpdatedAt: '2026-04-10T10:00:00Z',

      remoteModifiedAt: '2026-04-10T10:00:00Z',

      lastSyncedAt: '2026-04-10T10:00:00Z',

    });

    expect(result).toBe('no_change');

  });



  it('returns inbound_update when only remote changed', () => {

    const result = detectSyncAction({

      localUpdatedAt: '2026-04-10T10:00:00Z',

      remoteModifiedAt: '2026-04-10T12:00:00Z',

      lastSyncedAt: '2026-04-10T10:00:00Z',

    });

    expect(result).toBe('inbound_update');

  });



  it('returns outbound_push when only local changed', () => {

    const result = detectSyncAction({

      localUpdatedAt: '2026-04-10T12:00:00Z',

      remoteModifiedAt: '2026-04-10T10:00:00Z',

      lastSyncedAt: '2026-04-10T10:00:00Z',

    });

    expect(result).toBe('outbound_push');

  });



  it('returns conflict when both changed', () => {

    const result = detectSyncAction({

      localUpdatedAt: '2026-04-10T12:00:00Z',

      remoteModifiedAt: '2026-04-10T11:00:00Z',

      lastSyncedAt: '2026-04-10T10:00:00Z',

    });

    expect(result).toBe('conflict');

  });



  it('throws invalid_sync_timestamp when a value is not a valid date', () => {

    expect(() =>

      detectSyncAction({

        localUpdatedAt: 'not-a-date',

        remoteModifiedAt: '2026-04-10T10:00:00Z',

        lastSyncedAt: '2026-04-10T10:00:00Z',

      }),

    ).toThrow('invalid_sync_timestamp');

  });



  it('throws invalid_sync_timestamp for empty string timestamps', () => {

    expect(() =>

      detectSyncAction({

        localUpdatedAt: '',

        remoteModifiedAt: '2026-04-10T10:00:00Z',

        lastSyncedAt: '2026-04-10T10:00:00Z',

      }),

    ).toThrow('invalid_sync_timestamp');

  });

});


