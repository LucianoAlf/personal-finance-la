import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface BillReminder {
  id?: string;
  days_before: number;
  time: string; // "HH:MM" formato 24h
  channels: ReminderChannel[];
  enabled: boolean;
}

export type ReminderChannel = 'push' | 'email' | 'whatsapp';

/**
 * Formata preview do lembrete
 * Ex: "3 dias antes (05/12) às 09:00 via push, email"
 */
export function formatReminderPreview(
  reminder: BillReminder,
  dueDate: string
): string {
  const date = subDays(new Date(dueDate + 'T00:00:00'), reminder.days_before);
  
  const dayText = reminder.days_before === 0 
    ? 'No dia do vencimento'
    : `${reminder.days_before} ${reminder.days_before === 1 ? 'dia' : 'dias'} antes`;
  
  const dateFormatted = format(date, 'dd/MM', { locale: ptBR });
  const channelLabels = reminder.channels.map(ch => {
    switch(ch) {
      case 'push': return 'notificação';
      case 'email': return 'email';
      case 'whatsapp': return 'WhatsApp';
      default: return ch;
    }
  }).join(', ');
  
  return `${dayText} (${dateFormatted}) às ${reminder.time} via ${channelLabels}`;
}

/**
 * Valida configuração de lembretes
 */
export function validateReminders(reminders: BillReminder[]): string | null {
  const enabledReminders = reminders.filter(r => r.enabled);
  
  if (enabledReminders.length === 0) {
    return 'Ative pelo menos um lembrete';
  }
  
  for (const reminder of enabledReminders) {
    if (reminder.channels.length === 0) {
      return 'Selecione pelo menos um canal de envio';
    }
    
    if (!reminder.time || !/^\d{2}:\d{2}$/.test(reminder.time)) {
      return 'Horário inválido';
    }
  }
  
  return null;
}

/**
 * Lembretes padrão (fallback)
 */
export const DEFAULT_REMINDERS: BillReminder[] = [
  {
    days_before: 3,
    time: '09:00',
    channels: ['push', 'email'],
    enabled: true,
  },
];

/**
 * Converte lembretes para formato JSONB do banco
 */
export function remindersToJsonb(reminders: BillReminder[]) {
  return reminders
    .filter(r => r.enabled)
    .map(r => ({
      days_before: r.days_before,
      time: r.time,
      channels: r.channels,
    }));
}
