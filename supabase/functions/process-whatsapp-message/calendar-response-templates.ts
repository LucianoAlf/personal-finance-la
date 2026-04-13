// calendar-response-templates.ts — Portuguese response templates for calendar operations (Mike-aligned UX)

export interface AgendaItemEdge {
  agenda_item_type: string;
  origin_type: string;
  origin_id: string;
  display_start_at: string;
  display_end_at: string | null;
  title: string;
  subtitle: string | null;
  status: string;
  badge: string | null;
  is_read_only: boolean;
  metadata: Record<string, unknown> | null;
}

/** Shared optional fields for calendar WhatsApp copy (plumbing for richer lines in later phases). */
export interface CalendarResponsePresentationOptions {
  actorDisplayName?: string;
  location?: string;
  participants?: string;
  durationText?: string;
  reminders?: string;
  recurrence?: string;
}

export type AgendaTemplateOptions = {
  timeZone?: string;
  titleFilterLabel?: string;
} & CalendarResponsePresentationOptions;

/** Cleans voice-shaped titles so WhatsApp reads like an assistant summary, not an echo of the user. */
export function prettifyEventTitleForDisplay(title: string): string {
  const t = title.trim();
  if (!t) return t;

  if (/^compromisso com os meus coordenadores$/i.test(t)) {
    return 'Reunião com coordenadores';
  }
  if (/^compromisso com os meus /i.test(t)) {
    return t.replace(/^compromisso com os meus /i, 'Reunião com ');
  }
  if (/^compromisso com (as )?minhas? /i.test(t)) {
    return t.replace(/^compromisso com (as )?minhas? /i, 'Reunião com ');
  }

  return t
    .replace(/\b(os meus|as minhas)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
}

/** Collapses breaks and odd whitespace for participant-like strings (full line or split tokens). */
function collapseParticipantWhitespace(raw: string): string {
  return raw
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/[\u00a0\t\f\v]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Splits participant-like lists (commas and Portuguese " e ") without touching event titles. */
function splitParticipantLikeTokens(raw: string): string[] {
  return raw
    .split(/\s*,\s*|\s+e\s+/i)
    .map((s) => collapseParticipantWhitespace(s))
    .filter(Boolean);
}

/** Joins normalized participant names to match create-confirmation test contracts. */
function joinParticipantLikeDisplay(names: string[]): string {
  const n = names.length;
  if (n === 0) return '';
  if (n === 1) return names[0]!;
  if (n === 2) return `${names[0]}, ${names[1]}`;
  if (n === 3) return `${names[0]}, ${names[1]}, ${names[2]}`;
  return `${names.slice(0, -1).join(', ')} e ${names[n - 1]!}`;
}

/** Whole-token self-reference forms in participant lists only; requires known actor. */
function mapFirstPersonParticipantToken(token: string, actor: string): string {
  if (/^(eu|me|meu|minha|comigo)$/i.test(token)) return actor;
  if (/^(você|voce)$/i.test(token)) return actor;
  if (/^(seu|sua)$/i.test(token)) return actor;
  return token;
}

/**
 * Normalizes participant-like strings for WhatsApp: replaces whole-token self-references (eu, você,
 * voce, possessives like meu/minha/seu/sua, etc.) with the actor when provided, deduplicates the
 * active user, preserves order.
 */
function normalizeParticipantsForPresentation(
  participants: string,
  actorDisplayName?: string,
): string {
  const trimmed = collapseParticipantWhitespace(participants);
  if (!trimmed) return '';

  const actor = actorDisplayName?.trim();
  let tokens = splitParticipantLikeTokens(trimmed);

  tokens = tokens.map((t) => {
    if (actor) return mapFirstPersonParticipantToken(t, actor);
    return t;
  });

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const t of tokens) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(t);
  }

  return joinParticipantLikeDisplay(deduped);
}

/** Mike-style confirmation before persisting (sim/não). */
export function templateCalendarCreateConfirmation(
  displayTitle: string,
  whenLine: string,
  options?: CalendarResponsePresentationOptions,
): string {
  let msg = `🗓️ *Criar compromisso?*\n\n`;
  msg += `📝 *${displayTitle}*\n`;
  msg += `🕐 ${whenLine}\n`;

  const location = options?.location?.trim();
  if (location) msg += `📍 ${location}\n`;

  const participantsRaw = options?.participants?.trim();
  if (participantsRaw) {
    const participantsLine = normalizeParticipantsForPresentation(participantsRaw, options.actorDisplayName);
    if (participantsLine) msg += `👥 ${participantsLine}\n`;
  }

  const duration = options?.durationText?.trim();
  if (duration) msg += `⏱️ ${duration}\n`;

  if (options?.reminders?.trim()) msg += `🔔 ${options.reminders.trim()}\n`;
  if (options?.recurrence?.trim()) msg += `🔄 ${options.recurrence.trim()}\n`;

  msg += `\nConfirma? (sim/não)`;
  return msg;
}

export function templateCalendarCreateDismissed(): string {
  return `Ok, não salvei nada na agenda.`;
}

function buildFoundEventConfirmationBlock(event: {
  title: string;
  whenLine: string;
  location?: string;
  participants?: string;
  actorDisplayName?: string;
}): string {
  let msg = `Achei o evento:\n`;
  const displayTitle = prettifyEventTitleForDisplay(event.title);
  msg += `📌 *${displayTitle}*\n`;
  msg += `🕐 ${event.whenLine}\n`;

  const location = event.location?.trim();
  if (location) msg += `📍 ${location}\n`;

  const participantsRaw = event.participants?.trim();
  if (participantsRaw) {
    const participantsLine = normalizeParticipantsForPresentation(
      participantsRaw,
      event.actorDisplayName,
    );
    if (participantsLine) msg += `👥 ${participantsLine}\n`;
  }

  return msg;
}

/** Mike-style confirmation before persisting a reschedule (sim/não). */
export function templateEventRescheduleConfirmation(
  event: {
    title: string;
    whenLine: string;
    location?: string;
    participants?: string;
    actorDisplayName?: string;
  },
  changeLines: string[],
): string {
  let msg = buildFoundEventConfirmationBlock(event);
  msg += `\nAlterações:\n`;
  msg += changeLines.join('\n');
  msg += `\n\nConfirma? (sim/não)`;
  return msg;
}

/** Mike-style confirmation before cancelling an event (sim/não). */
export function templateEventCancelConfirmation(event: {
  title: string;
  whenLine: string;
  location?: string;
  participants?: string;
  actorDisplayName?: string;
}): string {
  let msg = buildFoundEventConfirmationBlock(event);
  msg += `\nCancelo? (sim/não)`;
  return msg;
}

export function templateEventCreated(
  title: string,
  dateFormatted: string,
  reminderText?: string,
  presentation?: CalendarResponsePresentationOptions,
): string {
  void presentation;
  const cleanTitle = prettifyEventTitleForDisplay(title);
  let msg = `Pronto, agendei!\n\n`;
  msg += `📝 *${cleanTitle}*\n`;
  msg += `🔸 ${dateFormatted}\n`;
  if (reminderText) {
    msg += `🔔 ${reminderText}\n`;
  }
  return msg;
}

export function templateEventCancelled(title: string, presentation?: CalendarResponsePresentationOptions): string {
  void presentation;
  return `Pronto, cancelei o compromisso *${prettifyEventTitleForDisplay(title)}*.`;
}

export function templateEventRescheduled(
  title: string,
  newDateFormatted: string,
  presentation?: CalendarResponsePresentationOptions,
): string {
  void presentation;
  return `Pronto, remarquei!\n\n📝 *${prettifyEventTitleForDisplay(title)}*\n🔸 ${newDateFormatted}`;
}

export function templateAgendaList(
  items: AgendaItemEdge[],
  periodLabel: string,
  options: AgendaTemplateOptions = {},
): string {
  const tz = options.timeZone ?? 'UTC';
  const filterKey = normalizeLabel(options.titleFilterLabel);
  const sectionTitle = buildAgendaSectionTitle(periodLabel, options.titleFilterLabel);

  if (items.length === 0) {
    return `🗓️ *${sectionTitle}*\n\n${buildAgendaEmptyState(periodLabel, options.titleFilterLabel)}`;
  }

  const countWord = items.length === 1 ? 'compromisso' : 'compromissos';
  const filterPhrase = filterIntroPhrase(filterKey, options.titleFilterLabel);

  let msg = `🗓️ *${sectionTitle}*\n\n`;
  msg += `${filterPhrase}Achei ${items.length} ${countWord}:\n\n`;

  for (const item of items) {
    const displayTitle = prettifyEventTitleForDisplay(item.title);
    const readOnly = item.is_read_only ? ' _(automatico)_' : '';
    const typeEmoji = getItemEmoji(item);
    msg += `${typeEmoji} *${displayTitle}*${readOnly}\n`;
    msg += `🔸 ${formatMikeStyleWhenLine(item.display_start_at, tz)}\n`;
    const rawSubtitle = item.subtitle?.trim();
    if (rawSubtitle) {
      const actor = options.actorDisplayName?.trim();
      const subLine = actor
        ? normalizeParticipantsForPresentation(rawSubtitle, actor)
        : rawSubtitle;
      if (subLine) msg += `📎 ${subLine}\n`;
    }
    msg += `\n`;
  }

  return msg.trimEnd() + '\n';
}

export function templateEventNotFound(): string {
  return `Nao encontrei esse compromisso. Tente "agenda" para ver seus compromissos.`;
}

export function templateCalendarError(): string {
  return `Ocorreu um erro ao processar sua solicitacao de agenda. Tente novamente.`;
}

function filterIntroPhrase(filterKey: string | undefined, raw?: string): string {
  if (filterKey === 'mentoria') return '';
  if (filterKey === 'coordenadores') return '';
  if (raw?.trim()) return '';
  return '';
}

function buildAgendaSectionTitle(periodLabel: string, titleFilterLabel?: string): string {
  const label = normalizeLabel(titleFilterLabel);
  if (label === 'mentoria') return `Mentorias — ${periodLabel}`;
  if (label === 'coordenadores') return `Coordenadores — ${periodLabel}`;
  return `Agenda — ${periodLabel}`;
}

function buildAgendaEmptyState(periodLabel: string, titleFilterLabel?: string): string {
  const normalizedPeriod = periodLabel.toLowerCase();
  const label = normalizeLabel(titleFilterLabel);

  if (label === 'mentoria') return `Não achei mentorias ${normalizedPeriod}.`;
  if (label === 'coordenadores') return `Não achei nada com coordenadores ${normalizedPeriod}.`;
  if (label) return `Não achei nada com "${titleFilterLabel}" ${normalizedPeriod}.`;
  return `Não achei compromissos ${normalizedPeriod}.`;
}

function normalizeLabel(value?: string): string | undefined {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatMikeStyleWhenLine(isoString: string, timeZone: string): string {
  try {
    const d = new Date(isoString);
    const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long' }).format(d);
    const dayMonth = new Intl.DateTimeFormat('pt-BR', { timeZone, day: 'numeric', month: 'short' }).format(d);
    const time = new Intl.DateTimeFormat('pt-BR', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d);
    const wShort = capitalize(weekday.replace(/-feira$/i, ''));
    const dm = dayMonth.replace(/\.$/, '').replace(/\s+de\s+/g, ' ');
    return `${wShort}, ${dm} às ${time}`;
  } catch {
    return '--';
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function getItemEmoji(item: AgendaItemEdge): string {
  if (item.origin_type === 'payable_bill') return '💰';
  if (item.origin_type === 'bill_reminder') return '🔔';
  if (item.origin_type === 'financial_cycle') return '🔄';
  if (item.status === 'cancelled') return '❌';
  if (item.status === 'completed') return '✅';
  return '📝';
}
