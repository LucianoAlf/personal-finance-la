// calendar-response-templates.ts — Portuguese response templates for calendar operations

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

export function templateEventCreated(title: string, dateFormatted: string, reminderText?: string): string {
  let msg = `*Compromisso criado!*\n\n`;
  msg += `${title}\n`;
  msg += `${dateFormatted}\n`;
  if (reminderText) {
    msg += `${reminderText}\n`;
  }
  return msg;
}

export function templateEventCancelled(title: string): string {
  return `*Compromisso cancelado:* ${title}`;
}

export function templateEventRescheduled(title: string, newDateFormatted: string): string {
  return `*Compromisso remarcado!*\n\n${title}\nNova data: ${newDateFormatted}`;
}

export function templateAgendaList(items: AgendaItemEdge[], periodLabel: string): string {
  if (items.length === 0) {
    return `*Agenda: ${periodLabel}*\n\nNenhum compromisso encontrado.`;
  }

  let msg = `*Agenda: ${periodLabel}*\n\n`;

  for (const item of items) {
    const emoji = getItemEmoji(item);
    const time = formatTime(item.display_start_at);
    const readOnly = item.is_read_only ? ' _(automatico)_' : '';
    msg += `${emoji} ${time} - ${item.title}${readOnly}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━\n`;
  msg += `Total: ${items.length} item${items.length > 1 ? 's' : ''}`;

  return msg;
}

export function templateEventNotFound(): string {
  return `Nao encontrei esse compromisso. Tente "agenda" para ver seus compromissos.`;
}

export function templateCalendarError(): string {
  return `Ocorreu um erro ao processar sua solicitacao de agenda. Tente novamente.`;
}

function getItemEmoji(item: AgendaItemEdge): string {
  if (item.origin_type === 'payable_bill') return '💰';
  if (item.origin_type === 'bill_reminder') return '🔔';
  if (item.origin_type === 'financial_cycle') return '🔄';
  if (item.status === 'cancelled') return '❌';
  if (item.status === 'completed') return '✅';
  return '📌';
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '--:--';
  }
}
