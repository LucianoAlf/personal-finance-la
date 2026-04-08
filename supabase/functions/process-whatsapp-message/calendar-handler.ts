// calendar-handler.ts — Calendar command orchestrator for Ana Clara

import { getSupabase, enviarViaEdgeFunction } from './utils.ts';
import { parseCalendarIntent } from './calendar-intent-parser.ts';
import {
  templateEventCreated,
  templateAgendaList,
  templateEventCancelled,
  templateCalendarError,
  type AgendaItemEdge,
} from './calendar-response-templates.ts';

export async function processarComandoAgenda(
  texto: string,
  userId: string,
  phone: string
): Promise<string> {
  const parsed = parseCalendarIntent(texto);

  try {
    switch (parsed.intent) {
      case 'create':
        return await criarEvento(userId, phone, parsed.title || 'Compromisso', parsed.reminderOffsetMinutes);

      case 'list':
        return await listarAgenda(userId, phone);

      case 'cancel':
        return await cancelarEvento(userId, phone);

      case 'reschedule': {
        const msg = '🔄 Remarcacao de compromissos estara disponivel em breve. Por enquanto, cancele e crie um novo.';
        await enviarViaEdgeFunction(phone, msg, userId);
        return msg;
      }

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
  reminderOffsetMinutes?: number
): Promise<string> {
  const supabase = getSupabase();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const startAt = tomorrow.toISOString();

  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title,
      start_at: startAt,
      created_by: 'ana_clara',
      source: 'internal',
      status: 'scheduled',
      sync_eligible: true,
    })
    .select('id, title, start_at')
    .single();

  if (error || !event) {
    console.error('[calendar-handler] Create error:', error);
    throw new Error('Failed to create event');
  }

  let reminderText: string | undefined;

  if (reminderOffsetMinutes) {
    const { data: insertedReminder, error: reminderError } = await supabase
      .from('calendar_event_reminders')
      .insert({
        event_id: event.id,
        reminder_kind: 'default',
        remind_offset_minutes: reminderOffsetMinutes,
        enabled: true,
      })
      .select('id')
      .single();

    if (!reminderError && insertedReminder) {
      const fireAt = new Date(new Date(startAt).getTime() - reminderOffsetMinutes * 60_000);
      const occurrenceKey = `${event.id}:${startAt}`;

      await supabase
        .from('calendar_reminder_schedule')
        .insert({
          event_id: event.id,
          reminder_id: insertedReminder.id,
          occurrence_key: occurrenceKey,
          fire_at: fireAt.toISOString(),
          channel: 'whatsapp',
          idempotency_key: `${insertedReminder.id}:${occurrenceKey}:whatsapp`,
          delivery_status: 'pending',
        });

      if (reminderOffsetMinutes >= 60) {
        const hours = Math.floor(reminderOffsetMinutes / 60);
        reminderText = `Lembrete ${hours}h antes`;
      } else {
        reminderText = `Lembrete ${reminderOffsetMinutes} min antes`;
      }
    }
  }

  // Enqueue sync job (non-blocking)
  const { error: syncError } = await supabase
    .from('calendar_sync_jobs')
    .insert({
      user_id: userId,
      event_id: event.id,
      provider: 'ticktick',
      job_type: 'upsert_event',
      idempotency_key: `sync:${event.id}:upsert_event:${Date.now()}`,
      status: 'pending',
    });

  if (syncError) {
    console.error('[calendar-handler] Sync job enqueue failed (non-blocking):', syncError);
  }

  const dateFormatted = new Date(event.start_at).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  const msg = templateEventCreated(event.title, dateFormatted, reminderText);
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}

async function listarAgenda(userId: string, phone: string): Promise<string> {
  const supabase = getSupabase();

  const now = new Date();
  const endOfWeek = new Date();
  endOfWeek.setDate(now.getDate() + 7);

  const { data: items, error } = await supabase
    .rpc('get_agenda_window', {
      p_user_id: userId,
      p_from: now.toISOString(),
      p_to: endOfWeek.toISOString(),
    });

  if (error) {
    console.error('[calendar-handler] List error:', error);
    throw new Error('Failed to list agenda');
  }

  const msg = templateAgendaList(
    (items || []) as AgendaItemEdge[],
    'Proximos 7 dias'
  );
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

  const { error } = await supabase
    .from('calendar_events')
    .update({ status: 'cancelled' })
    .eq('id', event.id)
    .eq('user_id', userId);

  if (error) {
    console.error('[calendar-handler] Cancel error:', error);
    throw new Error('Failed to cancel event');
  }

  const msg = templateEventCancelled(event.title);
  await enviarViaEdgeFunction(phone, msg, userId);
  return msg;
}
