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

interface AgendaTemplateOptions {
  timeZone?: string;
  titleFilterLabel?: string;
}

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
    .replace(/\b(os meus|as minhas|os meus)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();
}

/** Mike-style confirmation before persisting (sim/não). */
export function templateCalendarCreateConfirmation(
  displayTitle: string,
  whenLine: string,
  extras?: { reminders?: string; recurrence?: string },
): string {
  let msg = `🗓️ *Criar compromisso?*\n\n`;
  msg += `📝 *${displayTitle}*\n`;
  msg += `🕐 ${whenLine}\n`;
  if (extras?.reminders) msg += `🔔 ${extras.reminders}\n`;
  if (extras?.recurrence) msg += `🔄 ${extras.recurrence}\n`;
  msg += `\nConfirma? (sim/não)`;
  return msg;
}

export function templateCalendarCreateDismissed(): string {
  return `Ok, não salvei nada na agenda.`;
}

export function templateEventCreated(title: string, dateFormatted: string, reminderText?: string): string {
  const cleanTitle = prettifyEventTitleForDisplay(title);
  let msg = `Pronto, agendei!\n\n`;
  msg += `📝 *${cleanTitle}*\n`;
  msg += `🔸 ${dateFormatted}\n`;
  if (reminderText) {
    msg += `🔔 ${reminderText}\n`;
  }
  return msg;
}

export function templateEventCancelled(title: string): string {
  return `Pronto, cancelei o compromisso *${prettifyEventTitleForDisplay(title)}*.`;
}

export function templateEventRescheduled(title: string, newDateFormatted: string): string {
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
    if (item.subtitle?.trim()) {
      msg += `📎 ${item.subtitle.trim()}\n`;
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
