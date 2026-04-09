// calendar-handler.ts — Calendar command orchestrator for Ana Clara

import { getSupabase, enviarViaEdgeFunction } from './utils.ts';
import { parseCalendarIntent } from './calendar-intent-parser.ts';
import {
  templateEventCreated,
  templateAgendaList,
  templateEventCancelled,
  templateEventRescheduled,
  templateCalendarError,
  type AgendaItemEdge,
} from './calendar-response-templates.ts';
import {
  DEFAULT_CALENDAR_TIMEZONE,
  buildCreateCalendarEventRpcArgs,
  buildOverrideRangeRescheduleToNextCalendarDay,
  buildRescheduleCalendarOccurrenceRpcArgs,
  buildSetCalendarEventRecurrenceRpcArgs,
  buildSetCalendarEventRemindersRpcArgs,
  buildSetCalendarEventStatusRpcArgs,
  describeReminderOffset,
  getTomorrowDateInTimezone,
} from './calendar-domain-rpc.ts';

interface CalendarEventLookup {
  id: string;
  title: string;
  start_at: string;
  timezone: string | null;
}

/** Subset of `get_agenda_window` row used for WhatsApp reschedule. */
interface AgendaWindowRescheduleRow {
  agenda_item_type: string;
  origin_type: string;
  display_start_at: string;
  display_end_at: string | null;
  title: string;
  supports_reschedule: boolean;
  metadata: Record<string, unknown> | null;
}

export async function processarComandoAgenda(
  texto: string,
  userId: string,
  phone: string,
): Promise<string> {
  const parsed = parseCalendarIntent(texto);

  try {
    switch (parsed.intent) {
      case 'create':
        return await criarEvento(
          userId,
          phone,
          parsed.title || 'Compromisso',
          parsed.reminderOffsetMinutes,
          parsed.recurrenceHint,
        );

      case 'list':
        return await listarAgenda(userId, phone);

      case 'cancel':
        return await cancelarEvento(userId, phone);

      case 'reschedule':
        return await remarcarEvento(userId, phone);

      default:
        return await listarAgenda(userId, phone);
    }
  } catch (error) {
    console.error('[calendar-handler] Error:', error);
    const msg = templateCalendarError();
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }
}

async function criarEvento(
  userId: string,
  phone: string,
  title: string,
  reminderOffsetMinutes?: number,
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number },
): Promise<string> {
  const supabase = getSupabase();
  const timezone = await getUserCalendarTimezone(userId);
  const eventDate = getTomorrowDateInTimezone(timezone);
  const followupNotes: string[] = [];

  const { data: eventId, error: createError } = await supabase.rpc(
    'create_calendar_event',
    buildCreateCalendarEventRpcArgs({
      userId,
      title,
      date: eventDate,
      timezone,
    }),
  );

  if (createError || !eventId) {
    console.error('[calendar-handler] Create error via RPC:', createError);
    throw new Error('Failed to create event');
  }

  const event = await fetchCalendarEventById(userId, String(eventId));

  if (recurrenceHint) {
    const { error: recurrenceErr } = await supabase.rpc(
      'set_calendar_event_recurrence',
      buildSetCalendarEventRecurrenceRpcArgs({
        userId,
        eventId: event.id,
        removeRecurrence: false,
        frequency: recurrenceHint.frequency,
        intervalValue: recurrenceHint.interval ?? 1,
        timezone,
      }),
    );
    if (recurrenceErr) {
      console.error('[calendar-handler] set_calendar_event_recurrence failed (non-blocking):', recurrenceErr);
      followupNotes.push(
        'Observacao: criei o compromisso, mas nao consegui aplicar a recorrencia agora.',
      );
    }
  }

  let reminderText: string | undefined;

  if (reminderOffsetMinutes !== undefined) {
    const { error: reminderRpcError } = await supabase.rpc(
      'set_calendar_event_reminders',
      buildSetCalendarEventRemindersRpcArgs({
        userId,
        eventId: event.id,
        reminders: [
          {
            remind_offset_minutes: reminderOffsetMinutes,
            enabled: true,
            reminder_kind: 'default',
          },
        ],
      }),
    );

    if (reminderRpcError) {
      console.error('[calendar-handler] set_calendar_event_reminders failed (non-blocking):', reminderRpcError);
      followupNotes.push(
        'Observacao: criei o compromisso, mas nao consegui configurar o lembrete agora.',
      );
    } else {
      reminderText = describeReminderOffset(reminderOffsetMinutes);
    }
  }

  const dateFormatted = new Date(event.start_at).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: event.timezone || timezone,
  });

  let msg = templateEventCreated(event.title, dateFormatted, reminderText);
  if (followupNotes.length > 0) {
    msg += `\n${followupNotes.join('\n')}`;
  }
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

async function listarAgenda(userId: string, phone: string): Promise<string> {
  const supabase = getSupabase();

  const now = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(now.getDate() + 7);

  const { data: items, error } = await supabase.rpc('get_agenda_window', {
    p_user_id: userId,
    p_from: now.toISOString(),
    p_to: endOfWeek.toISOString(),
  });

  if (error) {
    console.error('[calendar-handler] List error:', error);
    throw new Error('Failed to list agenda');
  }

  const msg = templateAgendaList((items || []) as AgendaItemEdge[], 'Proximos 7 dias');
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

async function cancelarEvento(userId: string, phone: string): Promise<string> {
  const supabase = getSupabase();

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .order('start_at', { ascending: true })
    .limit(1);

  if (!events || events.length === 0) {
    const msg = 'Nao encontrei compromissos pendentes para cancelar.';
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const event = events[0];

  const { error } = await supabase.rpc(
    'set_calendar_event_status',
    buildSetCalendarEventStatusRpcArgs({
      userId,
      eventId: event.id,
      status: 'cancelled',
    }),
  );

  if (error) {
    console.error('[calendar-handler] Cancel error via RPC:', error);
    throw new Error('Failed to cancel event');
  }

  const msg = templateEventCancelled(event.title);
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

const MSG_RESCHEDULE_NON_RECURRING =
  'Por enquanto, remarcar pelo WhatsApp so funciona para compromissos recorrentes. Para um evento unico, cancele e crie um novo ou use o app.';

const MSG_RESCHEDULE_UNSAFE =
  'Nao consegui remarcar com seguranca agora. Veja sua agenda no app ou cancele e crie de novo.';

async function remarcarEvento(userId: string, phone: string): Promise<string> {
  const supabase = getSupabase();
  const now = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(now.getDate() + 7);

  const { data: items, error: windowError } = await supabase.rpc('get_agenda_window', {
    p_user_id: userId,
    p_from: now.toISOString(),
    p_to: endOfWeek.toISOString(),
  });

  if (windowError) {
    console.error('[calendar-handler] get_agenda_window for reschedule failed:', windowError);
    const msg = MSG_RESCHEDULE_UNSAFE;
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const nowMs = now.getTime();
  let pick: AgendaWindowRescheduleRow | undefined;

  for (const raw of items || []) {
    const row = raw as AgendaWindowRescheduleRow;
    if (row.origin_type !== 'calendar_event') continue;
    if (row.agenda_item_type !== 'canonical_event') continue;
    if (!row.supports_reschedule) continue;

    const startMs = Date.parse(row.display_start_at);
    const endMs = row.display_end_at
      ? Date.parse(row.display_end_at)
      : startMs + 3600 * 1000;
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    if (endMs <= nowMs - 60_000) continue;

    pick = row;
    break;
  }

  if (!pick) {
    const msg = 'Nao encontrei compromissos elegiveis para remarcar. Envie "agenda" para ver seus proximos itens.';
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const meta = pick.metadata;
  const isRecurring = meta?.is_recurring === true;
  const originalStartAt =
    typeof meta?.original_start_at === 'string' ? meta.original_start_at : undefined;

  if (!isRecurring || !originalStartAt) {
    const msg = MSG_RESCHEDULE_NON_RECURRING;
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const eventIdRaw = meta?.event_id;
  const eventId = typeof eventIdRaw === 'string' ? eventIdRaw : undefined;

  if (!eventId) {
    console.error('[calendar-handler] reschedule: missing event_id in agenda metadata');
    const msg = MSG_RESCHEDULE_UNSAFE;
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const tz = await getUserCalendarTimezone(userId);

  let overrideStartAt: string;
  let overrideEndAt: string;
  try {
    const range = buildOverrideRangeRescheduleToNextCalendarDay({
      displayStartIso: pick.display_start_at,
      displayEndIso: pick.display_end_at,
      timeZone: tz,
      now,
    });
    overrideStartAt = range.overrideStartAt;
    overrideEndAt = range.overrideEndAt;
  } catch (e) {
    console.error('[calendar-handler] reschedule: could not build override range:', e);
    const msg = MSG_RESCHEDULE_UNSAFE;
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const { error: rpcError } = await supabase.rpc(
    'reschedule_calendar_occurrence',
    buildRescheduleCalendarOccurrenceRpcArgs({
      userId,
      eventId,
      originalStartAt,
      overrideStartAt,
      overrideEndAt,
    }),
  );

  if (rpcError) {
    console.error('[calendar-handler] reschedule_calendar_occurrence failed:', rpcError);
    const msg = MSG_RESCHEDULE_UNSAFE;
    await enviarViaEdgeFunction(phone, msg, userId);
    return msg;
  }

  const dateFormatted = new Date(overrideStartAt).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

  const msg = templateEventRescheduled(pick.title, dateFormatted);
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

async function getUserCalendarTimezone(userId: string): Promise<string> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('user_settings')
    .select('timezone')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[calendar-handler] User timezone lookup failed, using default:', error);
    return DEFAULT_CALENDAR_TIMEZONE;
  }

  return data?.timezone || DEFAULT_CALENDAR_TIMEZONE;
}

async function fetchCalendarEventById(userId: string, eventId: string): Promise<CalendarEventLookup> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id, title, start_at, timezone')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('[calendar-handler] Event fetch after create failed:', error);
    throw new Error('Failed to fetch created event');
  }

  return data as CalendarEventLookup;
}
