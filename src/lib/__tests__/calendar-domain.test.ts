import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock('@/utils/appliedUserPreferences', () => ({
  getAppliedUserPreferences: () => ({
    timezone: 'America/Fortaleza',
    language: 'pt-BR',
    theme: 'auto',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'pt-BR',
  }),
}));

import {
  cancelCalendarOccurrenceDomain,
  createCalendarEventDomain,
  deleteCalendarEventDomain,
  deleteOccurrenceOverridesForEventDomain,
  mapCalendarDomainRpcError,
  rescheduleCalendarOccurrenceDomain,
  setCalendarEventRecurrenceDomain,
  setCalendarEventRemindersDomain,
  setCalendarEventStatusDomain,
  updateCalendarEventDomain,
} from '../calendar-domain';

describe('calendar-domain', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it('createCalendarEventDomain chama RPC com timezone das preferências e horários normalizados', async () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    rpcMock.mockResolvedValue({ data: eventId, error: null });

    const result = await createCalendarEventDomain({
      title:  'Reunião',
      description: null,
      date: '2026-04-15',
      startTime: '09:00',
      endTime: '10:30',
      allDay: false,
      locationText: null,
    });

    expect(result.eventId).toBe(eventId);
    expect(rpcMock).toHaveBeenCalledWith('create_calendar_event', {
      p_title: 'Reunião',
      p_description: null,
      p_date: '2026-04-15',
      p_start_time: '09:00:00',
      p_end_time: '10:30:00',
      p_all_day: false,
      p_timezone: 'America/Fortaleza',
      p_location_text: null,
      p_event_kind: 'personal',
    });
  });

  it('createCalendarEventDomain envia horários nulos em dia inteiro', async () => {
    rpcMock.mockResolvedValue({ data: 'uuid-here', error: null });

    await createCalendarEventDomain({
      title: 'Feriado',
      description: null,
      date: '2026-04-20',
      startTime: '09:00',
      endTime: '10:00',
      allDay: true,
      locationText: null,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'create_calendar_event',
      expect.objectContaining({
        p_all_day: true,
        p_start_time: null,
        p_end_time: null,
      }),
    );
  });

  it('setCalendarEventStatusDomain chama RPC de status', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await setCalendarEventStatusDomain('evt-1', 'completed');

    expect(rpcMock).toHaveBeenCalledWith('set_calendar_event_status', {
      p_event_id: 'evt-1',
      p_new_status: 'completed',
    });
  });

  it('updateCalendarEventDomain chama RPC de update com timezone, metadata e acting user opcionais', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await updateCalendarEventDomain({
      eventId: 'evt-9',
      title: 'Reunião editada',
      description: 'Descrição nova',
      date: '2026-04-20',
      startTime: '14:00',
      endTime: '15:30',
      allDay: false,
      locationText: 'Sala 2',
      eventKind: 'work',
      priority: 'high',
      tickTickTags: ['cliente vip', 'follow-up'],
      actingUserId: '770e8400-e29b-41d4-a716-446655440099',
    });

    expect(rpcMock).toHaveBeenCalledWith('update_calendar_event', {
      p_event_id: 'evt-9',
      p_title: 'Reunião editada',
      p_description: 'Descrição nova',
      p_date: '2026-04-20',
      p_start_time: '14:00:00',
      p_end_time: '15:30:00',
      p_all_day: false,
      p_timezone: 'America/Fortaleza',
      p_location_text: 'Sala 2',
      p_event_kind: 'work',
      p_priority: 'high',
      p_ticktick_tags: ['cliente vip', 'follow-up'],
      p_user_id: '770e8400-e29b-41d4-a716-446655440099',
    });
  });

  it('deleteCalendarEventDomain chama RPC de delete', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await deleteCalendarEventDomain({ eventId: 'evt-del' });

    expect(rpcMock).toHaveBeenCalledWith('delete_calendar_event', {
      p_event_id: 'evt-del',
      p_user_id: null,
    });
  });

  it('setCalendarEventRecurrenceDomain envia flags e frequência', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const id = '550e8400-e29b-41d4-a716-446655440000';

    await setCalendarEventRecurrenceDomain({
      eventId: id,
      frequency: 'daily',
      intervalValue: 2,
      confirmDropOverrides: true,
    });

    expect(rpcMock).toHaveBeenCalledWith('set_calendar_event_recurrence', {
      p_event_id: id,
      p_remove_recurrence: false,
      p_frequency: 'daily',
      p_interval_value: 2,
      p_by_weekday: null,
      p_by_monthday: null,
      p_starts_at: null,
      p_until_at: null,
      p_count_limit: null,
      p_timezone: null,
      p_confirm_drop_overrides: true,
      p_confirm_drop_reminders: false,
      p_user_id: null,
    });
  });

  it('rescheduleCalendarOccurrenceDomain retorna override id', async () => {
    const oid = '660e8400-e29b-41d4-a716-446655440001';
    rpcMock.mockResolvedValue({ data: oid, error: null });
    const id = '550e8400-e29b-41d4-a716-446655440000';

    const out = await rescheduleCalendarOccurrenceDomain({
      eventId: id,
      originalStartAt: '2026-04-10T12:00:00Z',
      overrideStartAt: '2026-04-10T15:00:00Z',
      overrideEndAt: '2026-04-10T16:00:00Z',
    });

    expect(out.overrideId).toBe(oid);
    expect(rpcMock).toHaveBeenCalledWith('reschedule_calendar_occurrence', {
      p_event_id: id,
      p_original_start_at: '2026-04-10T12:00:00Z',
      p_override_start_at: '2026-04-10T15:00:00Z',
      p_override_end_at: '2026-04-10T16:00:00Z',
      p_title_override: null,
      p_description_override: null,
      p_user_id: null,
    });
  });

  it('cancelCalendarOccurrenceDomain chama RPC', async () => {
    rpcMock.mockResolvedValue({ data: 'ov-1', error: null });
    await cancelCalendarOccurrenceDomain({
      eventId: 'e1',
      originalStartAt: '2026-04-10T12:00:00Z',
    });
    expect(rpcMock).toHaveBeenCalledWith('cancel_calendar_occurrence', {
      p_event_id: 'e1',
      p_original_start_at: '2026-04-10T12:00:00Z',
      p_user_id: null,
    });
  });

  it('deleteOccurrenceOverridesForEventDomain chama RPC', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await deleteOccurrenceOverridesForEventDomain({ eventId: 'e2' });
    expect(rpcMock).toHaveBeenCalledWith('delete_calendar_occurrence_overrides_for_event', {
      p_event_id: 'e2',
      p_user_id: null,
    });
  });

  it('mapCalendarDomainRpcError traduz códigos de recorrência V1', () => {
    expect(mapCalendarDomainRpcError('recurring_reminders_not_supported_v1')).toContain('recorrentes');
    expect(mapCalendarDomainRpcError('occurrence_overrides_block_structural_change')).toContain(
      'exceções',
    );
  });

  it('setCalendarEventRemindersDomain chama RPC com lembretes e p_user_id opcional', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const eventId = '550e8400-e29b-41d4-a716-446655440000';

    await setCalendarEventRemindersDomain({
      eventId,
      reminders: [
        {
          remind_offset_minutes: 15,
          reminder_kind: 'prep',
          channel_policy: 'whatsapp_only',
          enabled: true,
        },
      ],
    });

    expect(rpcMock).toHaveBeenCalledWith('set_calendar_event_reminders', {
      p_event_id: eventId,
      p_reminders: [
        {
          remind_offset_minutes: 15,
          reminder_kind: 'prep',
          channel_policy: 'whatsapp_only',
          enabled: true,
        },
      ],
      p_user_id: null,
    });

    rpcMock.mockResolvedValue({ data: null, error: null });
    const acting = '770e8400-e29b-41d4-a716-446655440099';
    await setCalendarEventRemindersDomain({
      eventId,
      reminders: [{ remind_offset_minutes: 0 }],
      actingUserId: acting,
    });

    expect(rpcMock).toHaveBeenLastCalledWith('set_calendar_event_reminders', {
      p_event_id: eventId,
      p_reminders: [{ remind_offset_minutes: 0 }],
      p_user_id: acting,
    });
  });

  it('setCalendarEventRemindersDomain não envia reminder_type ao RPC (semântica relativa no servidor)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    await setCalendarEventRemindersDomain({
      eventId: 'e1',
      reminders: [
        {
          remind_offset_minutes: 10,
          reminder_type: 'relative',
        },
        {
          remind_offset_minutes: 30,
          reminder_type: 'absolute',
        },
      ],
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'set_calendar_event_reminders',
      expect.objectContaining({
        p_reminders: [{ remind_offset_minutes: 10 }, { remind_offset_minutes: 30 }],
      }),
    );
  });

  it('createCalendarEventDomain preserva chaves existentes de metadata ao persistir prioridade', async () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440000';
    const singleMock = vi.fn().mockResolvedValue({ data: { metadata: { source: 'ticktick' } }, error: null });
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({
      select: selectMock,
      update: updateMock,
    });

    rpcMock.mockResolvedValue({ data: eventId, error: null });

    await createCalendarEventDomain({
      title: 'Call',
      description: null,
      date: '2026-04-15',
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      locationText: null,
      priority: 'high',
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('calendar_events');
    expect(selectMock).toHaveBeenCalledWith('metadata');
    expect(selectEqMock).toHaveBeenCalledWith('id', eventId);
    expect(updateMock).toHaveBeenCalledWith({ metadata: { source: 'ticktick', priority: 'high' } });
    expect(eqMock).toHaveBeenCalledWith('id', eventId);
  });

  it('createCalendarEventDomain persiste ticktick_tags junto com metadata existente', async () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440055';
    const singleMock = vi.fn().mockResolvedValue({ data: { metadata: { source: 'ticktick' } }, error: null });
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({
      select: selectMock,
      update: updateMock,
    });

    rpcMock.mockResolvedValue({ data: eventId, error: null });

    await createCalendarEventDomain({
      title: 'Mentoria',
      description: null,
      date: '2026-04-15',
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      locationText: null,
      priority: 'high',
      tickTickTags: ['mentoria', 'cliente-vip'],
    });

    expect(updateMock).toHaveBeenCalledWith({
      metadata: {
        source: 'ticktick',
        priority: 'high',
        ticktick_tags: ['mentoria', 'cliente-vip'],
      },
    });
  });

  it('createCalendarEventDomain retorna sucesso mesmo se persistência de prioridade falhar após create', async () => {
    const eventId = '550e8400-e29b-41d4-a716-446655440123';
    const singleMock = vi.fn().mockResolvedValue({ data: { metadata: { existing: true } }, error: null });
    const selectEqMock = vi.fn().mockReturnValue({ single: singleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'write failed' } });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fromMock.mockReturnValue({
      select: selectMock,
      update: updateMock,
    });
    rpcMock.mockResolvedValue({ data: eventId, error: null });

    await expect(
      createCalendarEventDomain({
        title: 'Call',
        description: null,
        date: '2026-04-15',
        startTime: '09:00',
        endTime: '10:00',
        allDay: false,
        locationText: null,
        priority: 'high',
      }),
    ).resolves.toEqual({ eventId });

    expect(updateMock).toHaveBeenCalledWith({ metadata: { existing: true, priority: 'high' } });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('createCalendarEventDomain não atualiza metadata quando prioridade ausente', async () => {
    rpcMock.mockResolvedValue({ data: 'some-id', error: null });

    await createCalendarEventDomain({
      title: 'Call',
      description: null,
      date: '2026-04-15',
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      locationText: null,
    });

    expect(fromMock).not.toHaveBeenCalled();
  });
});
