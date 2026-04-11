// calendar-handler.ts — Calendar command orchestrator for Ana Clara

import { getSupabase, enviarViaEdgeFunction } from './utils.ts';
import { parseCalendarIntent } from './calendar-intent-parser.ts';
import {
  templateCalendarCreateConfirmation,
  templateCalendarCreateDismissed,
  templateEventCreated,
  templateAgendaList,
  templateEventCancelled,
  templateEventRescheduled,
  templateCalendarError,
  prettifyEventTitleForDisplay,
  type AgendaItemEdge,
} from './calendar-response-templates.ts';
import { isCalendarConfirmationNo, isCalendarConfirmationYes } from './calendar-confirm-reply.ts';
import {
  DEFAULT_CALENDAR_TIMEZONE,
  buildCreateCalendarEventRpcArgs,
  buildOverrideRangeRescheduleToNextCalendarDay,
  buildRescheduleCalendarOccurrenceRpcArgs,
  buildSetCalendarEventRecurrenceRpcArgs,
  buildSetCalendarEventRemindersRpcArgs,
  buildSetCalendarEventStatusRpcArgs,
  describeReminderOffsets,
  getDateInTimezone,
  getNextWeekdayDateInTimezone,
  getTomorrowDateInTimezone,
  instantUtcIsoForWallClockInTimeZone,
} from './calendar-domain-rpc.ts';

const CALENDAR_PENDING_CONTEXT = 'awaiting_calendar_create_confirm' as const;
const CALENDAR_PENDING_TTL_MINUTES = 15;

export interface PendingCalendarCreatePayload {
  title: string;
  eventDateYmd: string;
  startTime?: string;
  endTime?: string;
  reminderOffsetsMinutes?: number[];
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number };
  chatJid?: string;
}

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

export async function hasPendingCalendarCreateConfirm(userId: string, phone: string): Promise<boolean> {
  const supabase = getSupabase();
  const payload = await loadPendingCalendarCreate(supabase, userId, phone);
  return payload !== null;
}

export async function processarComandoAgenda(
  texto: string,
  userId: string,
  phone: string,
  options?: { chatJid?: string },
): Promise<string> {
  const supabase = getSupabase();
  const phoneKey = phone?.trim() || 'unknown';

  try {
    const pending = await loadPendingCalendarCreate(supabase, userId, phoneKey);

    if (pending) {
      if (isCalendarConfirmationYes(texto)) {
        await clearPendingCalendarCreate(supabase, userId, phoneKey);
        return await criarEvento(
          userId,
          phoneKey,
          pending.title,
          pending.reminderOffsetsMinutes,
          pending.recurrenceHint,
          undefined,
          pending.startTime,
          pending.endTime,
          { chatJid: pending.chatJid, eventDateYmd: pending.eventDateYmd },
        );
      }
      if (isCalendarConfirmationNo(texto)) {
        await clearPendingCalendarCreate(supabase, userId, phoneKey);
        const msg = templateCalendarCreateDismissed();
        await enviarViaEdgeFunction(
          phoneKey,
          msg,
          userId,
          pending.chatJid ? { chatJid: pending.chatJid } : undefined,
        );
        return msg;
      }
      await clearPendingCalendarCreate(supabase, userId, phoneKey);
    }

    const parsed = parseCalendarIntent(texto);

    switch (parsed.intent) {
      case 'create':
        return await proporCriacaoCompromisso(
          supabase,
          userId,
          phoneKey,
          parsed.title || 'Compromisso',
          parsed.reminderOffsetsMinutes,
          parsed.recurrenceHint,
          parsed.weekdayHint,
          parsed.startTime,
          parsed.endTime,
          options,
        );

      case 'list':
        return await listarAgenda(userId, phoneKey, parsed.queryWindow, parsed.titleFilter, options);

      case 'cancel':
        return await cancelarEvento(userId, phoneKey, options);

      case 'reschedule':
        return await remarcarEvento(userId, phoneKey, options);

      default:
        return await listarAgenda(userId, phoneKey, undefined, undefined, options);
    }
  } catch (error) {
    console.error('[calendar-handler] Error:', error);
    const msg = templateCalendarError();
    await enviarViaEdgeFunction(phoneKey, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
    return msg;
  }
}

function resolveCreateEventDateYmd(
  timezone: string,
  weekdayHint?: number,
  explicitYmd?: string,
): string {
  if (explicitYmd && /^\d{4}-\d{2}-\d{2}$/.test(explicitYmd)) return explicitYmd;
  if (weekdayHint !== undefined) return getNextWeekdayDateInTimezone(timezone, weekdayHint);
  return getTomorrowDateInTimezone(timezone);
}

function formatWhenLineForConfirm(eventDateYmd: string, startTime: string | undefined, timezone: string): string {
  const hms = startTime ?? '09:00:00';
  try {
    const iso = instantUtcIsoForWallClockInTimeZone(eventDateYmd, hms, timezone);
    return new Date(iso).toLocaleString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).replace(/\.$/, '').trim();
  } catch {
    return `${eventDateYmd} ${hms}`;
  }
}

function describeRecurrenceHintForConfirm(
  hint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number },
): string | undefined {
  if (!hint) return undefined;
  const n = hint.interval ?? 1;
  if (hint.frequency === 'daily') return n > 1 ? `A cada ${n} dias` : 'Todo dia';
  if (hint.frequency === 'weekly') return n > 1 ? `A cada ${n} semanas` : 'Toda semana';
  if (hint.frequency === 'monthly') return n > 1 ? `A cada ${n} meses` : 'Todo mês';
  return undefined;
}

// deno-lint-ignore no-explicit-any
async function loadPendingCalendarCreate(supabase: any, userId: string, phone: string): Promise<PendingCalendarCreatePayload | null> {
  const { data, error } = await supabase
    .from('conversation_context')
    .select('context_data, expires_at')
    .eq('user_id', userId)
    .eq('phone', phone)
    .eq('context_type', CALENDAR_PENDING_CONTEXT)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data?.context_data) return null;
  const raw = data.context_data as Record<string, unknown>;
  const p = raw.calendar_pending_create;
  if (!p || typeof p !== 'object') return null;
  return p as PendingCalendarCreatePayload;
}

// deno-lint-ignore no-explicit-any
async function savePendingCalendarCreate(
  supabase: any,
  userId: string,
  phone: string,
  payload: PendingCalendarCreatePayload,
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CALENDAR_PENDING_TTL_MINUTES);

  const { error } = await supabase.from('conversation_context').upsert(
    {
      user_id: userId,
      phone,
      context_type: CALENDAR_PENDING_CONTEXT,
      context_data: { calendar_pending_create: payload },
      last_interaction: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'user_id,phone,context_type' },
  );

  if (error) {
    console.error('[calendar-handler] savePendingCalendarCreate failed:', error);
    throw new Error('Failed to save calendar confirmation context');
  }
}

// deno-lint-ignore no-explicit-any
async function clearPendingCalendarCreate(supabase: any, userId: string, phone: string): Promise<void> {
  await supabase
    .from('conversation_context')
    .delete()
    .eq('user_id', userId)
    .eq('phone', phone)
    .eq('context_type', CALENDAR_PENDING_CONTEXT);
}

async function proporCriacaoCompromisso(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  phone: string,
  title: string,
  reminderOffsetsMinutes?: number[],
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number },
  weekdayHint?: number,
  startTime?: string,
  endTime?: string,
  options?: { chatJid?: string },
): Promise<string> {
  const timezone = await getUserCalendarTimezone(userId);
  const eventDateYmd = resolveCreateEventDateYmd(timezone, weekdayHint);

  const payload: PendingCalendarCreatePayload = {
    title,
    eventDateYmd,
    startTime,
    endTime,
    reminderOffsetsMinutes,
    recurrenceHint,
    chatJid: options?.chatJid,
  };

  await savePendingCalendarCreate(supabase, userId, phone, payload);

  const whenLine = formatWhenLineForConfirm(eventDateYmd, startTime, timezone);
  const displayTitle = prettifyEventTitleForDisplay(title);
  let reminders: string | undefined;
  if (reminderOffsetsMinutes?.length) {
    const raw = describeReminderOffsets(reminderOffsetsMinutes);
    reminders = raw?.replace(/^Lembretes:\s*/i, '').replace(/^Lembrete:\s*/i, '').trim();
  }
  const recurrence = describeRecurrenceHintForConfirm(recurrenceHint);

  const msg = templateCalendarCreateConfirmation(displayTitle, whenLine, {
    reminders: reminders ?? undefined,
    recurrence: recurrence ?? undefined,
  });

  await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
  return msg;
}

async function criarEvento(
  userId: string,
  phone: string,
  title: string,
  reminderOffsetsMinutes?: number[],
  recurrenceHint?: { frequency: 'daily' | 'weekly' | 'monthly'; interval?: number },
  weekdayHint?: number,
  startTime?: string,
  endTime?: string,
  options?: { chatJid?: string; eventDateYmd?: string },
): Promise<string> {
  const supabase = getSupabase();
  const timezone = await getUserCalendarTimezone(userId);
  const eventDate = resolveCreateEventDateYmd(timezone, weekdayHint, options?.eventDateYmd);
  const followupNotes: string[] = [];

  const { data: eventId, error: createError } = await supabase.rpc(
    'create_calendar_event',
    buildCreateCalendarEventRpcArgs({
      userId,
      title,
      date: eventDate,
      timezone,
      startTime,
      endTime,
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

  if (reminderOffsetsMinutes && reminderOffsetsMinutes.length > 0) {
    const { error: reminderRpcError } = await supabase.rpc(
      'set_calendar_event_reminders',
      buildSetCalendarEventRemindersRpcArgs({
        userId,
        eventId: event.id,
        reminders: reminderOffsetsMinutes.map((minutes, index) => ({
          remind_offset_minutes: minutes,
          enabled: true,
          reminder_kind: index === 0 ? 'deadline' : 'default',
        })),
      }),
    );

    if (reminderRpcError) {
      console.error('[calendar-handler] set_calendar_event_reminders failed (non-blocking):', reminderRpcError);
      followupNotes.push(
        'Observacao: criei o compromisso, mas nao consegui configurar o lembrete agora.',
      );
    } else {
      reminderText = describeReminderOffsets(reminderOffsetsMinutes);
    }
  }

  const dateFormatted = new Date(event.start_at).toLocaleString('pt-BR', {
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
  await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
  return msg;
}

async function listarAgenda(
  userId: string,
  phone: string,
  queryWindow?: 'today' | 'tomorrow' | 'week',
  titleFilter?: string,
  options?: { chatJid?: string },
): Promise<string> {
  const supabase = getSupabase();
  const timezone = await getUserCalendarTimezone(userId);
  const { fromIso, toIso, periodLabel } = buildAgendaWindow(timezone, queryWindow);

  const { data: items, error } = await supabase.rpc('get_agenda_window', {
    p_user_id: userId,
    p_from: fromIso,
    p_to: toIso,
  });

  if (error) {
    console.error('[calendar-handler] List error:', error);
    throw new Error('Failed to list agenda');
  }

  const filteredItems = applyAgendaTitleFilter((items || []) as AgendaItemEdge[], titleFilter);
  const msg = templateAgendaList(filteredItems, periodLabel, {
    timeZone: timezone,
    titleFilterLabel: titleFilter,
  });
  await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
  return msg;
}

function buildAgendaWindow(
  timezone: string,
  queryWindow: 'today' | 'tomorrow' | 'week' | undefined = 'week',
  now: Date = new Date(),
): { fromIso: string; toIso: string; periodLabel: string } {
  const todayYmd = getDateInTimezone(timezone, now);

  if (queryWindow === 'today') {
    return {
      fromIso: instantUtcIsoForWallClockInTimeZone(todayYmd, '00:00:00', timezone),
      toIso: instantUtcIsoForWallClockInTimeZone(todayYmd, '23:59:59', timezone),
      periodLabel: 'Hoje',
    };
  }

  if (queryWindow === 'tomorrow') {
    const tomorrowYmd = getTomorrowDateInTimezone(timezone, now);
    return {
      fromIso: instantUtcIsoForWallClockInTimeZone(tomorrowYmd, '00:00:00', timezone),
      toIso: instantUtcIsoForWallClockInTimeZone(tomorrowYmd, '23:59:59', timezone),
      periodLabel: 'Amanha',
    };
  }

  const endDate = new Date(`${todayYmd}T12:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const endYmd = endDate.toISOString().slice(0, 10);
  return {
    fromIso: instantUtcIsoForWallClockInTimeZone(todayYmd, '00:00:00', timezone),
    toIso: instantUtcIsoForWallClockInTimeZone(endYmd, '23:59:59', timezone),
    periodLabel: 'Esta semana',
  };
}

function applyAgendaTitleFilter(items: AgendaItemEdge[], titleFilter?: string): AgendaItemEdge[] {
  if (!titleFilter?.trim()) return items;

  const normalizedFilter = normalizeText(titleFilter);
  return items.filter((item) => {
    const title = normalizeText(item.title);
    const subtitle = normalizeText(item.subtitle ?? '');
    return title.includes(normalizedFilter) || subtitle.includes(normalizedFilter);
  });
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function cancelarEvento(
  userId: string,
  phone: string,
  options?: { chatJid?: string },
): Promise<string> {
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
    await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
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
  await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
  return msg;
}

const MSG_RESCHEDULE_NON_RECURRING =
  'Por enquanto, remarcar pelo WhatsApp so funciona para compromissos recorrentes. Para um evento unico, cancele e crie um novo ou use o app.';

const MSG_RESCHEDULE_UNSAFE =
  'Nao consegui remarcar com seguranca agora. Veja sua agenda no app ou cancele e crie de novo.';

async function remarcarEvento(
  userId: string,
  phone: string,
  options?: { chatJid?: string },
): Promise<string> {
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
    await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
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
    await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
    return msg;
  }

  const meta = pick.metadata;
  const isRecurring = meta?.is_recurring === true;
  const originalStartAt =
    typeof meta?.original_start_at === 'string' ? meta.original_start_at : undefined;

  if (!isRecurring || !originalStartAt) {
    const msg = MSG_RESCHEDULE_NON_RECURRING;
    await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
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
  await enviarViaEdgeFunction(phone, msg, userId, options?.chatJid ? { chatJid: options.chatJid } : undefined);
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
