// calendar-intent-parser.ts — Intent detection and entity extraction for calendar commands

export type CalendarIntentType = 'create' | 'list' | 'reschedule' | 'cancel' | 'set_reminder' | 'unknown';

export interface CalendarParsedIntent {
  intent: CalendarIntentType;
  title?: string;
  rawText: string;
  reminderOffsetMinutes?: number;
  dateHint?: string;
  timeHint?: string;
}

const CALENDAR_KEYWORDS = [
  'agenda', 'compromisso', 'compromissos', 'reunião', 'reuniao',
  'lembrete', 'lembra', 'lembrar', 'remarcar', 'remarco',
  'cancelar compromisso', 'cancelar reunião', 'cancelar reuniao',
  'evento', 'agendar', 'agendamento',
];

const CREATE_PATTERNS = [
  /\b(tenho|marcar?|agendar?|cri(?:ar?|e)|novo|nova)\b/i,
  /\bcompromisso\b/i,
];

const LIST_PATTERNS = [
  /\b(agenda|o que tenho|meus compromissos|minha agenda|compromissos)\b/i,
  /\b(essa semana|esta semana|hoje|amanhã|próximos dias)\b.*\b(agenda|compromisso)/i,
];

const CANCEL_PATTERNS = [
  /\bcancelar?\b/i,
];

const RESCHEDULE_PATTERNS = [
  /\b(remarcar?|adiar?|mover?|mudar)\b/i,
];

const REMINDER_OFFSET_MAP: Array<{ pattern: RegExp; minutes: number }> = [
  { pattern: /meia hora antes/i, minutes: 30 },
  { pattern: /uma hora antes/i, minutes: 60 },
  { pattern: /1\s*h(?:ora)?\s*antes/i, minutes: 60 },
  { pattern: /15\s*min(?:utos?)?\s*antes/i, minutes: 15 },
  { pattern: /30\s*min(?:utos?)?\s*antes/i, minutes: 30 },
  { pattern: /10\s*min(?:utos?)?\s*antes/i, minutes: 10 },
  { pattern: /2\s*horas?\s*antes/i, minutes: 120 },
  { pattern: /1\s*dia\s*antes/i, minutes: 1440 },
];

export function isCalendarIntent(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const lower = text.toLowerCase().trim();
  return CALENDAR_KEYWORDS.some((kw) => lower.includes(kw));
}

export function parseCalendarIntent(text: string): CalendarParsedIntent {
  const lower = text.toLowerCase().trim();

  const reminderOffsetMinutes = extractReminderOffset(lower);

  if (CANCEL_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'cancel', rawText: text, reminderOffsetMinutes };
  }

  if (RESCHEDULE_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'reschedule', rawText: text, reminderOffsetMinutes };
  }

  // List patterns must be checked BEFORE create, because "o que tenho" contains
  // "tenho" which also matches CREATE_PATTERNS.
  if (LIST_PATTERNS.some((p) => p.test(lower))) {
    return { intent: 'list', rawText: text };
  }

  if (CREATE_PATTERNS.some((p) => p.test(lower)) || reminderOffsetMinutes !== undefined) {
    const title = extractTitle(lower);
    return { intent: 'create', title, rawText: text, reminderOffsetMinutes };
  }

  if (lower.includes('agenda') || lower.includes('compromisso')) {
    return { intent: 'list', rawText: text };
  }

  return { intent: 'unknown', rawText: text };
}

function extractReminderOffset(text: string): number | undefined {
  for (const { pattern, minutes } of REMINDER_OFFSET_MAP) {
    if (pattern.test(text)) return minutes;
  }
  return undefined;
}

function extractTitle(text: string): string {
  let title = text;

  const removePatterns = [
    /^(amanhã|hoje|segunda|terça|quarta|quinta|sexta|sábado|domingo)\s*/i,
    /\b(tenho|marcar|agendar|criar|novo|nova)\s*/gi,
    /\b(às?\s*\d{1,2}h?\d{0,2})\b/gi,
    /\b(me\s+lembra.*$)/i,
    /\b(meia hora antes|uma hora antes|\d+\s*min(?:utos?)?\s*antes|\d+\s*horas?\s*antes)/gi,
    /^(compromisso|reunião|reuniao|evento)\s*/i,
  ];

  for (const pattern of removePatterns) {
    title = title.replace(pattern, '').trim();
  }

  title = title.replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

  return title || 'Compromisso';
}
