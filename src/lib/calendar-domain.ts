/**
 * Superfície semântica do domínio de calendário no cliente.
 * Toda escrita canônica deve passar por aqui (RPC), não por `.from('calendar_events')`.
 */

import { supabase } from '@/lib/supabase';
import type {
  CalendarReminderKind,
  EventKind,
  EventPriority,
  ReminderType,
} from '@/types/calendar.types';
import { getAppliedUserPreferences } from '@/utils/appliedUserPreferences';

export interface CreateCalendarEventDomainInput {
  title: string;
  description: string | null;
  /** YYYY-MM-DD (DatePickerInput / formatDateOnly) */
  date: string;
  /** HH:mm — ignorado se allDay */
  startTime: string;
  /** HH:mm — ignorado se allDay */
  endTime: string;
  allDay: boolean;
  locationText: string | null;
  eventKind?: EventKind;
  /** Persistido em `metadata.priority` após o create (evento novo com metadata `{}`). */
  priority?: EventPriority | null;
  /** Tags livres espelhadas para TickTick; persistidas em `metadata.ticktick_tags`. */
  tickTickTags?: string[] | null;
}

export interface UpdateCalendarEventDomainInput {
  eventId: string;
  title: string;
  description: string | null;
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  locationText: string | null;
  eventKind?: EventKind;
  priority?: EventPriority | null;
  tickTickTags?: string[] | null;
  actingUserId?: string;
}

/** Entrada para `setCalendarEventRemindersDomain`; `reminder_type` não é enviado ao RPC (só offsets relativos V1). */
export interface SetCalendarEventRemindersDomainReminder {
  remind_offset_minutes: number;
  reminder_kind?: CalendarReminderKind;
  channel_policy?: string;
  enabled?: boolean;
  reminder_type?: ReminderType;
}

function normalizeTimeForRpc(hhMm: string): string {
  const trimmed = hhMm.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return `${trimmed}:00`;
}

/** Mensagens amigáveis para códigos levantados pelas RPCs de calendário (Postgres/PostgREST). */
export function mapCalendarDomainRpcError(message: string): string {
  if (message.includes('not_authenticated')) return 'Sessão expirada. Entre novamente.';
  if (message.includes('start_time_required')) return 'Informe o horário de início.';
  if (message.includes('invalid_status_for_client_transition')) return 'Transição de status não permitida.';
  if (message.includes('event_not_found_or_forbidden')) return 'Compromisso não encontrado ou sem permissão.';
  if (message.includes('forbidden_user_override')) return 'Operação não permitida para outro usuário.';
  if (message.includes('yearly_recurrence_deferred_v1'))
    return 'Recorrência anual não pôde ser aplicada.';
  if (message.includes('unsupported_recurrence_frequency_v1'))
    return 'Frequência de recorrência não suportada.';
  if (message.includes('frequency_required')) return 'Informe a frequência da recorrência.';
  if (message.includes('invalid_interval_value')) return 'Intervalo da recorrência inválido.';
  if (message.includes('occurrence_overrides_block_structural_change'))
    return 'Há exceções nesta série; limpe as alterações por ocorrência ou confirme a remoção antes de mudar a regra.';
  if (message.includes('reminders_block_recurrence_until_cleared'))
    return 'Remova os lembretes deste compromisso antes de torná-lo recorrente, ou confirme a remoção dos lembretes.';
  if (message.includes('recurring_reminders_not_supported_v1'))
    return 'Lembretes para eventos recorrentes não são suportados nesta versão.';
  if (message.includes('recurrence_required_for_occurrence_override'))
    return 'Só é possível alterar uma ocorrência de séries recorrentes.';
  if (message.includes('invalid_reminders_payload')) return 'Formato de lembretes inválido.';
  if (message.includes('invalid_reminders_item')) return 'Item de lembrete inválido.';
  if (message.includes('remind_offset_minutes_required')) return 'Informe o deslocamento do lembrete (minutos).';
  if (message.includes('invalid_remind_offset')) return 'Deslocamento do lembrete inválido.';
  if (message.includes('invalid_reminder_kind')) return 'Tipo de lembrete inválido.';
  if (message.includes('delete_forbidden_due_to_linked_dependencies'))
    return 'Este compromisso não pode ser excluído por causa de vínculos existentes.';
  return message;
}

function reminderRowForRpc(
  r: SetCalendarEventRemindersDomainReminder,
): Pick<
  SetCalendarEventRemindersDomainReminder,
  'remind_offset_minutes' | 'reminder_kind' | 'channel_policy' | 'enabled'
> {
  const row: Pick<
    SetCalendarEventRemindersDomainReminder,
    'remind_offset_minutes' | 'reminder_kind' | 'channel_policy' | 'enabled'
  > = { remind_offset_minutes: r.remind_offset_minutes };
  if (r.reminder_kind !== undefined) row.reminder_kind = r.reminder_kind;
  if (r.channel_policy !== undefined) row.channel_policy = r.channel_policy;
  if (r.enabled !== undefined) row.enabled = r.enabled;
  return row;
}

function normalizeTickTickTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).map((value) => value.trim()).filter((value) => value.length > 0);
}

async function persistCalendarEventMetadataBestEffort(
  eventId: string,
  input: {
    priority?: EventPriority | null;
    tickTickTags?: string[] | null;
  },
): Promise<void> {
  try {
    const { data: existingRow, error: readError } = await supabase
      .from('calendar_events')
      .select('metadata')
      .eq('id', eventId)
      .single();

    if (readError) {
      console.warn('[calendar-domain] unable to read metadata before priority persistence:', readError);
      return;
    }

    const existingMetadata =
      existingRow &&
      typeof existingRow === 'object' &&
      'metadata' in existingRow &&
      existingRow.metadata &&
      typeof existingRow.metadata === 'object' &&
      !Array.isArray(existingRow.metadata)
        ? (existingRow.metadata as Record<string, unknown>)
        : {};

    const nextMetadata: Record<string, unknown> = { ...existingMetadata };
    if (input.priority != null) {
      nextMetadata.priority = input.priority;
    }

    const normalizedTickTickTags = normalizeTickTickTags(input.tickTickTags);
    if (normalizedTickTickTags.length > 0) {
      nextMetadata.ticktick_tags = normalizedTickTickTags;
    }

    const { error: writeError } = await supabase
      .from('calendar_events')
      .update({ metadata: nextMetadata })
      .eq('id', eventId);

    if (writeError) {
      console.warn('[calendar-domain] unable to persist event metadata after create:', writeError);
    }
  } catch (error) {
    console.warn('[calendar-domain] unexpected metadata persistence failure after create:', error);
  }
}

export async function createCalendarEventDomain(
  input: CreateCalendarEventDomainInput,
): Promise<{ eventId: string }> {
  const tz = getAppliedUserPreferences().timezone;

  const { data, error } = await supabase.rpc('create_calendar_event', {
    p_title: input.title.trim(),
    p_description: input.description?.trim() || null,
    p_date: input.date,
    p_start_time: input.allDay ? null : normalizeTimeForRpc(input.startTime),
    p_end_time: input.allDay ? null : normalizeTimeForRpc(input.endTime),
    p_all_day: input.allDay,
    p_timezone: tz,
    p_location_text: input.locationText?.trim() || null,
    p_event_kind: input.eventKind ?? 'personal',
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }

  if (!data || typeof data !== 'string') {
    throw new Error('Resposta inválida ao criar compromisso.');
  }

  if (input.priority != null || normalizeTickTickTags(input.tickTickTags).length > 0) {
    await persistCalendarEventMetadataBestEffort(data, {
      priority: input.priority,
      tickTickTags: input.tickTickTags,
    });
  }

  return { eventId: data };
}

export async function updateCalendarEventDomain(
  input: UpdateCalendarEventDomainInput,
): Promise<void> {
  const tz = getAppliedUserPreferences().timezone;

  const { error } = await supabase.rpc('update_calendar_event', {
    p_event_id: input.eventId,
    p_title: input.title.trim(),
    p_description: input.description?.trim() || null,
    p_date: input.date,
    p_start_time: input.allDay ? null : normalizeTimeForRpc(input.startTime),
    p_end_time: input.allDay ? null : normalizeTimeForRpc(input.endTime),
    p_all_day: input.allDay,
    p_timezone: tz,
    p_location_text: input.locationText?.trim() || null,
    p_event_kind: input.eventKind ?? 'personal',
    p_priority: input.priority ?? null,
    p_ticktick_tags: normalizeTickTickTags(input.tickTickTags),
    p_user_id: input.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
}

export async function deleteCalendarEventDomain(params: {
  eventId: string;
  actingUserId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('delete_calendar_event', {
    p_event_id: params.eventId,
    p_user_id: params.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
}

export async function setCalendarEventRemindersDomain(params: {
  eventId: string;
  reminders: SetCalendarEventRemindersDomainReminder[];
  actingUserId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('set_calendar_event_reminders', {
    p_event_id: params.eventId,
    p_reminders: params.reminders.map(reminderRowForRpc),
    p_user_id: params.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
}

export async function setCalendarEventStatusDomain(
  eventId: string,
  status: 'completed' | 'cancelled',
): Promise<void> {
  const { error } = await supabase.rpc('set_calendar_event_status', {
    p_event_id: eventId,
    p_new_status: status,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
}

export interface SetCalendarEventRecurrenceDomainInput {
  eventId: string;
  /** Remove a regra de recorrência (e opcionalmente limpa overrides com confirmação). */
  removeRecurrence?: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  intervalValue?: number;
  byWeekday?: string[] | null;
  byMonthday?: number[] | null;
  /** ISO 8601; default no servidor = start_at do evento. */
  startsAt?: string | null;
  untilAt?: string | null;
  countLimit?: number | null;
  timezone?: string | null;
  confirmDropOverrides?: boolean;
  confirmDropReminders?: boolean;
  /** Para chamadas com service role (ex.: integrações). */
  actingUserId?: string;
}

export async function setCalendarEventRecurrenceDomain(
  input: SetCalendarEventRecurrenceDomainInput,
): Promise<void> {
  const remove = input.removeRecurrence === true;
  if (!remove && !input.frequency) {
    throw new Error('Informe a frequência ao definir recorrência.');
  }

  const { error } = await supabase.rpc('set_calendar_event_recurrence', {
    p_event_id: input.eventId,
    p_remove_recurrence: remove,
    p_frequency: remove ? null : input.frequency,
    p_interval_value: input.intervalValue ?? 1,
    p_by_weekday: input.byWeekday ?? null,
    p_by_monthday: input.byMonthday ?? null,
    p_starts_at: input.startsAt ?? null,
    p_until_at: input.untilAt ?? null,
    p_count_limit: input.countLimit ?? null,
    p_timezone: input.timezone ?? null,
    p_confirm_drop_overrides: input.confirmDropOverrides ?? false,
    p_confirm_drop_reminders: input.confirmDropReminders ?? false,
    p_user_id: input.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
}

export async function rescheduleCalendarOccurrenceDomain(params: {
  eventId: string;
  originalStartAt: string;
  overrideStartAt: string;
  overrideEndAt: string;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
  actingUserId?: string;
}): Promise<{ overrideId: string }> {
  const { data, error } = await supabase.rpc('reschedule_calendar_occurrence', {
    p_event_id: params.eventId,
    p_original_start_at: params.originalStartAt,
    p_override_start_at: params.overrideStartAt,
    p_override_end_at: params.overrideEndAt,
    p_title_override: params.titleOverride ?? null,
    p_description_override: params.descriptionOverride ?? null,
    p_user_id: params.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
  if (!data || typeof data !== 'string') {
    throw new Error('Resposta inválida ao reagendar ocorrência.');
  }
  return { overrideId: data };
}

export async function cancelCalendarOccurrenceDomain(params: {
  eventId: string;
  originalStartAt: string;
  actingUserId?: string;
}): Promise<{ overrideId: string }> {
  const { data, error } = await supabase.rpc('cancel_calendar_occurrence', {
    p_event_id: params.eventId,
    p_original_start_at: params.originalStartAt,
    p_user_id: params.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
  if (!data || typeof data !== 'string') {
    throw new Error('Resposta inválida ao cancelar ocorrência.');
  }
  return { overrideId: data };
}

export async function deleteOccurrenceOverridesForEventDomain(params: {
  eventId: string;
  actingUserId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('delete_calendar_occurrence_overrides_for_event', {
    p_event_id: params.eventId,
    p_user_id: params.actingUserId ?? null,
  });

  if (error) {
    throw new Error(mapCalendarDomainRpcError(error.message));
  }
}
